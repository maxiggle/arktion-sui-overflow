import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { SeriesService } from './series.service';
import { SeriesController } from './series.controller';
import { ChapterService } from './chapter.service';
import { ChapterController } from './chapter.controller';
import { MangaDexAdapter } from './adapters/mangadex.adapter';
import { CONTENT_SOURCE_ADAPTER } from './adapters/content-source.adapter';

@Module({
  imports: [ConfigModule],
  providers: [
    SeriesService,
    ChapterService,
    // Bind the active content source behind the abstraction. Swapping or adding
    // a source means changing this binding, not ChapterService.
    { provide: CONTENT_SOURCE_ADAPTER, useClass: MangaDexAdapter },
  ],
  controllers: [SeriesController, ChapterController],
  exports: [SeriesService, ChapterService],
})
export class SeriesModule {}
