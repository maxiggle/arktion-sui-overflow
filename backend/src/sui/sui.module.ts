import { Global, Module } from '@nestjs/common';

import { SuiService } from './sui.service';
import { GasService } from './gas.service';
import { BootstrapService } from './bootstrap.service';
import { WalrusService } from './walrus.service';

/**
 * Global because every feature module needs Sui access. Exposed services:
 *
 *   - SuiService       — raw client, keypairs, deployment object IDs
 *   - GasService       — gas-sponsored transaction execution + treasury monitoring
 *   - BootstrapService — one-shot mint of passport + library + journal on first login
 *   - WalrusService    — blob upload/download for reading history snapshots + badge metadata
 */
@Global()
@Module({
  providers: [SuiService, GasService, BootstrapService, WalrusService],
  exports: [SuiService, GasService, BootstrapService, WalrusService],
})
export class SuiModule {}
