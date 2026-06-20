import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MemWal } from '@mysten-incubation/memwal';
import type { ChatMessage } from './dto/assist.dto';

export interface AssistResult {
  answer: string;
  memoriesUsed: number;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly memwal: MemWal;
  private readonly openRouterKey: string;
  private readonly model: string;

  constructor(private readonly config: ConfigService) {
    const memwalKey = this.config.get<string>('MEMWAL_PRIVATE_KEY', '');
    const memwalAccount = this.config.get<string>('MEMWAL_ACCOUNT_ID', '');
    const memwalServer = this.config.get<string>(
      'MEMWAL_SERVER_URL',
      'https://relayer-staging.memory.walrus.xyz',
    );

    this.openRouterKey = this.config.get<string>('OPENROUTER_API_KEY', '');
    this.model = this.config.get<string>(
      'OPENROUTER_MODEL',
      'meta-llama/llama-3.1-8b-instruct:free',
    );

    if (!memwalKey || !memwalAccount) {
      throw new Error(
        'MEMWAL_PRIVATE_KEY and MEMWAL_ACCOUNT_ID are required — MemWal is the backbone of the AI writing assistant',
      );
    }

    this.memwal = MemWal.create({
      key: memwalKey,
      accountId: memwalAccount,
      serverUrl: memwalServer,
    });
    this.logger.log('MemWal client initialised');

    if (this.openRouterKey) {
      this.logger.log(`OpenRouter client ready (model: ${this.model})`);
    } else {
      this.logger.warn(
        'OPENROUTER_API_KEY not set — AI writing assistant disabled',
      );
    }
  }

  get isReady(): boolean {
    return !!this.openRouterKey && !!this.memwal;
  }

  /** Namespace per series so each series has its own isolated memory bucket. */
  private namespace(seriesId: string): string {
    return `arktion-${seriesId}`;
  }

  /**
   * Called after a novel chapter is published.
   * Fire-and-forget — never awaited by the caller.
   */
  async rememberChapterAsync(
    seriesId: string,
    chapterNumber: number,
    title: string | null,
    content: string,
  ): Promise<void> {
    if (!this.memwal) return;

    const label = title
      ? `Chapter ${chapterNumber}: ${title}`
      : `Chapter ${chapterNumber}`;

    const text = `${label}\n\n${content}`;

    try {
      const job = await this.memwal.remember(text, this.namespace(seriesId));
      this.logger.log(
        `MemWal remember queued for ${label} (series ${seriesId}) — job ${job.job_id}`,
      );
    } catch (err) {
      this.logger.error(
        `MemWal remember failed for ${label} (series ${seriesId}): ${String(err)}`,
      );
    }
  }

  /**
   * Writing assistant — uses series metadata from the DB as base context.
   * If MemWal is configured, published chapter excerpts are recalled and appended.
   * Works on any series regardless of whether chapters have been published.
   */
  async assist(params: {
    seriesId: string;
    title: string;
    description: string | null;
    prompt: string;
    history?: ChatMessage[];
    model?: string;
  }): Promise<AssistResult> {
    const {
      seriesId,
      title,
      description,
      prompt,
      history = [],
      model,
    } = params;
    const resolvedModel = model?.trim() || this.model;

    if (!this.isReady) {
      throw new ServiceUnavailableException(
        'AI writing assistant is not configured on this server',
      );
    }

    let memories: Array<{ content?: string; text?: string }> = [];
    try {
      const recalled = await this.memwal.recall({
        query: prompt,
        namespace: this.namespace(seriesId),
        limit: 6,
      });
      memories = recalled.results ?? [];
    } catch (err) {
      this.logger.warn(`MemWal recall failed: ${String(err)}`);
    }

    const systemParts = [
      `You are a writing assistant for the novel series "${title}".`,
      `Your job is to help the creator develop their story, maintain consistency, and give helpful writing guidance.`,
    ];

    if (description) {
      systemParts.push('', `Series description: ${description}`);
    }

    if (memories.length > 0) {
      const excerpts = memories
        .map((m, i) =>
          `[Chapter excerpt ${i + 1}]\n${m.content ?? m.text ?? ''}`.trim(),
        )
        .join('\n\n');
      systemParts.push(
        '',
        "The following excerpts from the creator's published chapters are available for context:",
        '',
        excerpts,
        '',
        'Use these excerpts to ensure your answers are consistent with the existing story.',
      );
    }

    systemParts.push(
      '',
      'Be concise, specific, and helpful. Respond as a knowledgeable creative collaborator.',
    );

    const systemPrompt = systemParts.join('\n');

    const abort = new AbortController();
    const abortTimer = setTimeout(() => abort.abort(), 110_000);

    let res: Response;
    try {
      res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        signal: abort.signal,
        headers: {
          Authorization: `Bearer ${this.openRouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://arktion.io',
          'X-Title': 'Arktion AI Writing Assistant',
        },
        body: JSON.stringify({
          model: resolvedModel,
          max_tokens: 1024,
          messages: [
            { role: 'system' as const, content: systemPrompt },
            ...history.map((m) => ({ role: m.role, content: m.content })),
            { role: 'user' as const, content: prompt },
          ],
        }),
      });
    } finally {
      clearTimeout(abortTimer);
    }

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`OpenRouter error ${res.status}: ${body}`);
    }

    const json = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
    };

    const answer = json.choices[0]?.message?.content ?? '';

    return { answer, memoriesUsed: memories.length };
  }
}
