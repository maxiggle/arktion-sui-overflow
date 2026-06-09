import { Module } from '@nestjs/common';

import { InkService } from './ink.service';
import { InkController } from './ink.controller';

@Module({
  providers: [InkService],
  controllers: [InkController],
  exports: [InkService], // ReadingModule and SubmissionModule depend on this
})
export class InkModule {}
