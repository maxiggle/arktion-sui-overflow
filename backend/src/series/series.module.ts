import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { SeriesService } from './series.service';
import { SeriesController } from './series.controller';
import { ChapterService } from './chapter.service';
import { ChapterController } from './chapter.controller';
import { MangaDexAdapter } from './adapters/mangadex.adapter';

@Module({
  imports: [ConfigModule],
  providers: [SeriesService, ChapterService, MangaDexAdapter],
  controllers: [SeriesController, ChapterController],
  exports: [SeriesService, ChapterService],
})
export class SeriesModule {}
