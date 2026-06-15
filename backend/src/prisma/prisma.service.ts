import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
      // Prevent Railway proxy from silently dropping stale connections.
      // connectionTimeoutMillis: fail fast so NestJS can return a 503 instead of hanging.
      // idleTimeoutMillis: recycle idle connections before Railway's proxy closes them (~60s).
      max: 5,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000,
    });
    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Prisma connected to database');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Prisma disconnected');
  }
}
