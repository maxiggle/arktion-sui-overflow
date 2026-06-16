import { Module } from '@nestjs/common';

import { WalrusModule } from '../walrus/walrus.module';
import { CreatorController } from './creator.controller';
import { CreatorService } from './creator.service';
import { CreatorGuard } from './guards/creator.guard';

@Module({
  imports: [WalrusModule],
  controllers: [CreatorController],
  providers: [CreatorService, CreatorGuard],
})
export class CreatorModule {}
