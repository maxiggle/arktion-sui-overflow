import { Module } from '@nestjs/common';

import { BadgesService } from './badges.service';
import { BadgesController } from './badges.controller';

@Module({
  providers: [BadgesService],
  controllers: [BadgesController],
  exports: [BadgesService], // ReadingModule and SubmissionModule depend on this
})
export class BadgesModule {}
