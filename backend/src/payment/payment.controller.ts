import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { PaymentService } from './payment.service';
import { BuildTipDto } from './dto/build-tip.dto';
import { ConfirmTipDto } from './dto/confirm-tip.dto';
import { BuildSendDto } from './dto/build-send.dto';
import { SubmitSendDto } from './dto/submit-send.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user.type';

@Controller('payment')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(private readonly payment: PaymentService) {}

  /**
   * Build a sponsored USDC tip transaction.
   *
   * Returns base64 transaction bytes the client must sign with their zkLogin
   * keypair (signWithZkLogin in lib/zklogin.ts), then post to /payment/tip/confirm.
   */
  @Post('tip/build')
  @HttpCode(HttpStatus.OK)
  async buildTip(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: BuildTipDto,
  ) {
    return this.payment.buildTipTransaction({
      senderId: user.id,
      seriesId: dto.seriesId,
      amountUsdc: BigInt(dto.amountUsdc),
      idempotencyKey: dto.idempotencyKey,
    });
  }

  /**
   * Submit the user-signed tip transaction for execution.
   *
   * The gas-sponsor co-signs and executes the transaction on-chain.
   * Returns the Sui transaction digest on success.
   */
  @Post('tip/confirm')
  @HttpCode(HttpStatus.OK)
  async confirmTip(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ConfirmTipDto,
  ) {
    return this.payment.confirmTip({
      senderId: user.id,
      tipTransactionId: dto.tipTransactionId,
      txBytes: dto.txBytes,
      userSignature: dto.userSignature,
    });
  }

  /**
   * Tip history for the authenticated user.
   *
   * @param direction "sent" (tips the user made) or "received" (tips to the user's series)
   */
  @Get('tips')
  async getTips(
    @CurrentUser() user: AuthenticatedUser,
    @Query('direction') direction: 'sent' | 'received' = 'sent',
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const dir = direction === 'received' ? 'received' : 'sent';
    return this.payment.getTipHistory(
      user.id,
      dir,
      Number(page),
      Number(limit),
    );
  }

  /** Live USDC balance for the authenticated user (reads from chain). */
  @Get('usdc-balance')
  async getUsdcBalance(@CurrentUser() user: AuthenticatedUser) {
    return this.payment.getUsdcBalance(user.id);
  }

  /** Build a gasless USDC transfer to any Sui address. */
  @Post('send/build')
  @HttpCode(HttpStatus.OK)
  async buildSend(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: BuildSendDto,
  ) {
    return this.payment.buildSendTransaction({
      senderId: user.id,
      recipientAddress: dto.recipientAddress,
      amountUsdc: BigInt(dto.amountUsdc),
      idempotencyKey: dto.idempotencyKey,
    });
  }

  /** Submit a user-signed gasless USDC transfer. */
  @Post('send/submit')
  @HttpCode(HttpStatus.OK)
  async submitSend(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SubmitSendDto,
  ) {
    return this.payment.submitSend({
      senderId: user.id,
      sendTransactionId: dto.sendTransactionId,
      txBytes: dto.txBytes,
      userSignature: dto.userSignature,
    });
  }

  /** Send history for the authenticated user. */
  @Get('sends')
  async getSends(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.payment.getSendHistory(user.id, Number(page), Number(limit));
  }
}
