import { Module } from '@nestjs/common';

import { CreatorController } from './creator.controller';
import { CreatorService } from './creator.service';
import { CreatorGuard } from './guards/creator.guard';
import { AiModule } from '../ai/ai.module';

// WalrusService is provided globally by SuiModule — no import needed here.
@Module({
  imports: [AiModule],
  controllers: [CreatorController],
  providers: [CreatorService, CreatorGuard],
})
export class CreatorModule {}
