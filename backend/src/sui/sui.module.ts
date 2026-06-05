import { Global, Module } from '@nestjs/common';

import { SuiService } from './sui.service';
import { GasService } from './gas.service';
import { BootstrapService } from './bootstrap.service';

/**
 * Global because every feature module needs Sui access. Exposed services:
 *
 *   - SuiService       — raw client, keypairs, deployment object IDs
 *   - GasService       — gas-sponsored transaction execution + treasury monitoring
 *   - BootstrapService — one-shot mint of passport + library + journal on first login
 *
 * WalrusService joins this module in Batch 4 (passport snapshot work).
 */
@Global()
@Module({
  providers: [SuiService, GasService, BootstrapService],
  exports: [SuiService, GasService, BootstrapService],
})
export class SuiModule {}
