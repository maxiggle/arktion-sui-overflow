import { Module } from '@nestjs/common';

import { SeriesService } from './series.service';
import { SeriesController } from './series.controller';
import { ChapterService } from './chapter.service';
import { ChapterController } from './chapter.controller';
import { MangaDexAdapter } from './adapters/mangadex.adapter';

@Module({
  providers: [SeriesService, ChapterService, MangaDexAdapter],
  controllers: [SeriesController, ChapterController],
  exports: [SeriesService, ChapterService],
})
export class SeriesModule {}
