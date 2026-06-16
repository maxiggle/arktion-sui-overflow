import { Module } from '@nestjs/common';

import { CreatorController } from './creator.controller';
import { CreatorService } from './creator.service';
import { CreatorGuard } from './guards/creator.guard';

// WalrusService is provided globally by SuiModule — no import needed here.
@Module({
  controllers: [CreatorController],
  providers: [CreatorService, CreatorGuard],
})
export class CreatorModule {}
