import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { PrismaService } from './prisma/prisma.service';
import { SuiService } from './sui/sui.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        { provide: PrismaService, useValue: { $queryRaw: jest.fn().mockResolvedValue([]) } },
        { provide: SuiService, useValue: { client: { getLatestCheckpointSequenceNumber: jest.fn().mockResolvedValue('1') } } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('testnet') } },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('should return health status', async () => {
      const result = await appController.health();
      expect(result.status).toBe('ok');
      expect(result.checks.database).toBe('up');
      expect(result.checks.sui).toBe('up');
    });
  });
});
