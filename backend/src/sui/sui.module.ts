import { Global, Module } from '@nestjs/common';

import { SuiService } from './sui.service';
import { GasService } from './gas.service';

/**
 * Global because every feature module needs Sui access. Exposed services:
 *
 *   - SuiService: raw client, keypairs, deployment object IDs
 *   - GasService: gas-sponsored transaction execution + treasury monitoring
 *
 * WalrusService will join this module in a later batch (Week 6 / passport
 * snapshot work).
 */
@Global()
@Module({
  providers: [SuiService, GasService],
  exports: [SuiService, GasService],
})
export class SuiModule {}
