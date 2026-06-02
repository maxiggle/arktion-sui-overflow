import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from './prisma/prisma.service';
import { SuiService } from './sui/sui.service';

interface HealthStatus {
  status: 'ok' | 'degraded' | 'down';
  uptime: number;
  timestamp: string;
  checks: {
    database: 'up' | 'down';
    sui: 'up' | 'down';
  };
  network: string;
  version: string;
}

@Controller()
export class AppController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sui: SuiService,
    private readonly config: ConfigService,
  ) {}

  @Get('health')
  async health(): Promise<HealthStatus> {
    const checks = {
      database: await this.checkDatabase(),
      sui: await this.checkSui(),
    };

    const allUp = Object.values(checks).every((s) => s === 'up');

    return {
      status: allUp ? 'ok' : 'degraded',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      checks,
      network: this.config.get<string>('SUI_NETWORK', 'testnet'),
      version: '0.0.1',
    };
  }

  private async checkDatabase(): Promise<'up' | 'down'> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'up';
    } catch {
      return 'down';
    }
  }

  private async checkSui(): Promise<'up' | 'down'> {
    try {
      await this.sui.client.getLatestCheckpointSequenceNumber();
      return 'up';
    } catch {
      return 'down';
    }
  }
}
