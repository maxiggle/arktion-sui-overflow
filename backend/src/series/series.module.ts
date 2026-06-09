import { Module } from '@nestjs/common';

import { SeriesService } from './series.service';
import { SeriesController } from './series.controller';

@Module({
  providers: [SeriesService],
  controllers: [SeriesController],
  exports: [SeriesService], // ReadingModule needs to resolve series by ID
})
export class SeriesModule {}
