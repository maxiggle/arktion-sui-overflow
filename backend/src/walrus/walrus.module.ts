import { Module } from '@nestjs/common';
import { SuiModule } from '../sui/sui.module';
import { WalrusService } from './walrus.service';

@Module({
  imports: [SuiModule],
  providers: [WalrusService],
  exports: [WalrusService],
})
export class WalrusModule {}
