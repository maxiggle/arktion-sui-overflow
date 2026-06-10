import {
  Controller,
  Get,
  Post,
  Param,
  Res,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';

import { PassportService } from './passport.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { generatePassportSvg } from './passport-image';

@Controller('passport')
export class PassportController {
  constructor(private readonly passport: PassportService) {}

  /**
   * Dynamic NFT image for a passport identified by wallet address.
   *
   * PUBLIC — no auth. Used as the `image_url` in the Sui Display metadata:
   *   display.add("image_url", "https://api.arktion.app/passport/{owner}/image.svg")
   *
   * Returns a self-contained SVG so it renders on Sui explorers and
   * NFT marketplaces without any external dependencies.
   */
  @Get(':address/image.svg')
  async getPassportImage(
    @Param('address') address: string,
    @Res() res: Response,
  ) {
    const passport = await this.passport.findByWalletAddress(address);

    // Allow any origin to embed this image (NFT explorers, marketplaces, etc.)
    // helmet sets CORP: same-origin by default which would block cross-origin <img> tags.
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    if (!passport) {
      const placeholder = buildPlaceholderSvg(address);
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=60');
      return res.status(HttpStatus.OK).send(placeholder);
    }

    const svg = generatePassportSvg({
      walletAddress: address,
      suiObjectId: passport.suiObjectId,
      level: passport.level,
      totalInkEarned: passport.totalInkEarned,
      chaptersRead: passport.chaptersRead,
      seriesCompleted: passport.seriesCompleted,
      seriesTracked: passport.seriesTracked,
    });

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.status(HttpStatus.OK).send(svg);
  }

  /**
   * Returns the authenticated user's passport state.
   * Pulls from Postgres (fast). For an on-chain-fresh read, call /chain.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyPassport(@CurrentUser() user: AuthenticatedUser) {
    return this.passport.findByUserId(user.id, user.walletAddress);
  }

  /**
   * Export the user's full reading history to Walrus and store the BlobId.
   *
   * The snapshot JSON contains passport stats + all reading records + journal
   * entries. The BlobId is stored in Postgres and returned alongside the
   * public Walrus URL so the frontend can display it immediately.
   *
   * This is the "Walrus Moment" from the demo script: the user's reading
   * history is now on decentralised storage, verifiable by anyone with the
   * BlobId, and survives even if Arktion's servers go down.
   */
  @Post('snapshot')
  @UseGuards(JwtAuthGuard)
  async takeSnapshot(@CurrentUser() user: AuthenticatedUser) {
    return await this.passport.takeSnapshot(user.id);
  }
}

function buildPlaceholderSvg(address: string): string {
  const short =
    address.length > 16
      ? `${address.slice(0, 8)}…${address.slice(-6)}`
      : address;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <rect width="500" height="500" fill="#0f0f1a"/>
  <rect x="30" y="30" width="440" height="440" rx="24"
    fill="none" stroke="#6366f1" stroke-width="1.5" stroke-opacity="0.3"/>
  <text x="250" y="230" font-family="monospace" font-size="13" font-weight="700"
    letter-spacing="4" fill="#818cf8" fill-opacity="0.6" text-anchor="middle">ARKTION PASSPORT</text>
  <text x="250" y="265" font-family="monospace" font-size="11"
    fill="white" fill-opacity="0.3" text-anchor="middle">not yet activated</text>
  <text x="250" y="300" font-family="monospace" font-size="9"
    fill="#6366f1" fill-opacity="0.5" text-anchor="middle">${short}</text>
</svg>`;
}
