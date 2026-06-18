import {
  Body,
  Controller,
  ForbiddenException,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { CreatorGuard } from '../creator/guards/creator.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AiService, AssistResult } from './ai.service';
import { AssistDto } from './dto/assist.dto';

@Controller('creator')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly prisma: PrismaService,
  ) {}

  @UseGuards(JwtAuthGuard, CreatorGuard)
  @Post('series/:seriesId/ai/assist')
  async assist(
    @CurrentUser() user: AuthenticatedUser,
    @Param('seriesId') seriesId: string,
    @Body() dto: AssistDto,
  ): Promise<AssistResult> {
    const series = await this.prisma.series.findFirst({
      where: { id: seriesId, deletedAt: null },
      select: {
        creatorId: true,
        title: true,
        description: true,
        formatType: true,
      },
    });

    if (!series) throw new NotFoundException(`Series ${seriesId} not found`);
    if (series.creatorId !== user.id) {
      throw new ForbiddenException('You do not own this series');
    }
    if (series.formatType !== 0) {
      throw new ForbiddenException(
        'AI writing assistant is only available for novel series',
      );
    }

    return this.aiService.assist({
      seriesId,
      title: series.title,
      description: series.description ?? null,
      prompt: dto.prompt,
      history: dto.history,
      model: dto.model,
    });
  }
}
