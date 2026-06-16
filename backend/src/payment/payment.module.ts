import { Module } from '@nestjs/common';

import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';

// PrismaModule and SuiModule are @Global() — no need to import them here.
@Module({
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
