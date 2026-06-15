/**
 * Series Seed Script (JSON-driven)
 *
 * Reads a JSON file of series definitions and upserts each row into the
 * Arktion `series` table. Idempotent: matches on `externalId`, so re-runs
 * just refresh mutable fields (coverUrl, description, status, title).
 *
 * Usage:
 *   pnpm tsx scripts/seed-series-from-json.ts                       # default file
 *   pnpm tsx scripts/seed-series-from-json.ts path/to/series.json   # custom file
 *
 * Requires DATABASE_URL in .env.
 *
 * Format type mapping (mirrors FormatType in series.service.ts):
 *   0 = novel, 1 = manga, 2 = manhwa, 3 = manhua, 4 = webtoon
 *
 * Allowed status values: ongoing | completed | hiatus | dropped
 */

import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const DEFAULT_PATH = resolve(__dirname, 'series-seed.json');
const ALLOWED_STATUSES = ['ongoing', 'completed', 'hiatus', 'dropped'] as const;
const FORMAT_LABELS: Record<number, string> = {
  0: 'novel',
  1: 'manga',
  2: 'manhwa',
  3: 'manhua',
  4: 'webtoon',
};

interface SeedSeries {
  externalId: string;
  title: string;
  formatType: number;
  sourceLanguage: string;
  status?: string;
  coverUrl?: string | null;
  description?: string | null;
}

function validate(s: SeedSeries, i: number): void {
  if (!s.externalId || typeof s.externalId !== 'string') {
    throw new Error(`[${i}] externalId required`);
  }
  if (!s.title || typeof s.title !== 'string') {
    throw new Error(`[${i}] (${s.externalId}) title required`);
  }
  if (!(s.formatType in FORMAT_LABELS)) {
    throw new Error(
      `[${i}] (${s.externalId}) formatType must be 0-4, got ${s.formatType}`,
    );
  }
  if (!s.sourceLanguage || s.sourceLanguage.length > 5) {
    throw new Error(
      `[${i}] (${s.externalId}) sourceLanguage must be a short code (e.g. "en", "ja")`,
    );
  }
  if (
    s.status &&
    !ALLOWED_STATUSES.includes(s.status as (typeof ALLOWED_STATUSES)[number])
  ) {
    throw new Error(
      `[${i}] (${s.externalId}) status must be one of ${ALLOWED_STATUSES.join(', ')}`,
    );
  }
}

async function main(): Promise<void> {
  const jsonPath = resolve(process.cwd(), process.argv[2] ?? DEFAULT_PATH);
  console.log(`🌱 Seeding series from ${jsonPath}\n`);

  const raw = readFileSync(jsonPath, 'utf8');
  const items = JSON.parse(raw) as SeedSeries[];

  if (!Array.isArray(items)) {
    throw new Error('Seed file must be a JSON array');
  }

  items.forEach(validate);

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  let created = 0;
  let updated = 0;
  let failed = 0;

  for (const [i, item] of items.entries()) {
    const status = item.status ?? 'ongoing';
    const description = item.description?.slice(0, 5000) ?? null;

    try {
      const result = await prisma.series.upsert({
        where: { externalId: item.externalId },
        create: {
          externalId: item.externalId,
          title: item.title,
          formatType: item.formatType,
          sourceLanguage: item.sourceLanguage,
          coverUrl: item.coverUrl ?? null,
          description,
          status,
        },
        update: {
          title: item.title,
          coverUrl: item.coverUrl ?? null,
          description,
          status,
        },
      });

      const wasCreated =
        result.createdAt.getTime() === result.updatedAt.getTime();
      if (wasCreated) {
        created++;
        console.log(
          `  ✓ created  ${item.title} [${FORMAT_LABELS[item.formatType]}]`,
        );
      } else {
        updated++;
        console.log(`  → updated  ${item.title}`);
      }
    } catch (err) {
      failed++;
      console.error(
        `  ✗ [${i}] (${item.externalId}) ${(err as Error).message}`,
      );
    }
  }

  console.log('\n' + '─'.repeat(50));
  console.log(
    `Done. Total ${items.length} | Created ${created} | Updated ${updated} | Failed ${failed}`,
  );

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
