import { Module } from '@nestjs/common';

import { ReadingService } from './reading.service';
import { ReadingController } from './reading.controller';
import { InkModule } from '../ink/ink.module';
import { BadgesModule } from '../badges/badges.module';

@Module({
  imports: [InkModule, BadgesModule],
  providers: [ReadingService],
  controllers: [ReadingController],
})
export class ReadingModule {}
