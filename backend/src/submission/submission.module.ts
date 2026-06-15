import { Module } from '@nestjs/common';

import { SubmissionService } from './submission.service';
import { SubmissionController } from './submission.controller';
import { InkModule } from '../ink/ink.module';
import { BadgesModule } from '../badges/badges.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [InkModule, BadgesModule, AdminModule],
  providers: [SubmissionService],
  controllers: [SubmissionController],
})
export class SubmissionModule {}
