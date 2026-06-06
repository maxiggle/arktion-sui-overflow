import {
  Injectable,
  Logger,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import jwksClient, { JwksClient } from 'jwks-rsa';
import { randomBytes } from 'node:crypto';

import { jwtToAddress } from '@mysten/sui/zklogin';

/**
 * Verified claims extracted from a Google ID token. Only fields we use are
 * declared here — the JWT contains more (locale, email_verified, hd, etc).
 */
export interface VerifiedGoogleClaims {
  iss: string;
  aud: string;
  sub: string;
  email?: string;
  emailVerified?: boolean;
  name?: string;
  picture?: string;
}

/**
 * Handles the three pieces of zkLogin that NestJS owns:
 *
 *   1. Verify the Google JWT (signature against JWKS, audience, expiry)
 *   2. Generate a random per-user salt (128-bit decimal string)
 *   3. Derive the user's Sui address from JWT + salt
 *
 * The JWKS client caches Google's public keys in-memory and refreshes them
 * automatically as Google rotates them.
 */
@Injectable()
export class ZkLoginService implements OnModuleInit {
  private readonly logger = new Logger(ZkLoginService.name);
  private jwks!: JwksClient;
  private googleClientId!: string;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    this.googleClientId = this.config.getOrThrow<string>('GOOGLE_CLIENT_ID');
    this.jwks = jwksClient({
      jwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
      cache: true,
      cacheMaxAge: 24 * 60 * 60 * 1000, // 24h
      rateLimit: true,
      jwksRequestsPerMinute: 10,
    });
  }

  /**
   * Verifies a Google ID token end-to-end:
   *   - Signature against Google's public keys (JWKS)
   *   - Issuer claim equals "https://accounts.google.com"
   *   - Audience claim equals our Google Client ID
   *   - Token not expired
   *
   * Throws UnauthorizedException on any failure with a clean message.
   */
  async verifyGoogleJwt(token: string): Promise<VerifiedGoogleClaims> {
    const decoded = await new Promise<jwt.JwtPayload>((resolve, reject) => {
      jwt.verify(
        token,
        (header, callback) => {
          if (!header.kid) {
            callback(new Error('JWT header missing kid'));
            return;
          }
          this.jwks
            .getSigningKey(header.kid)
            .then((key) => callback(null, key.getPublicKey()))
            .catch((err) => callback(err));
        },
        {
          algorithms: ['RS256'],
          audience: this.googleClientId,
          issuer: ['https://accounts.google.com', 'accounts.google.com'],
        },
        (err, payload) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(payload as jwt.JwtPayload);
        },
      );
    }).catch((err: Error) => {
      this.logger.warn(`Google JWT verification failed: ${err.message}`);
      throw new UnauthorizedException('Invalid Google ID token');
    });

    if (!decoded.sub || !decoded.iss || !decoded.aud) {
      throw new UnauthorizedException('JWT missing required claims');
    }

    return {
      iss: String(decoded.iss),
      aud: Array.isArray(decoded.aud) ? decoded.aud[0] : String(decoded.aud),
      sub: String(decoded.sub),
      email: decoded.email ? String(decoded.email) : undefined,
      emailVerified: decoded.email_verified
        ? Boolean(decoded.email_verified)
        : undefined,
      name: decoded.name ? String(decoded.name) : undefined,
      picture: decoded.picture ? String(decoded.picture) : undefined,
    };
  }

  /**
   * Generate a fresh 128-bit salt for a new user. Returned as a decimal string
   * (the format @mysten/sui/zklogin expects for jwtToAddress).
   *
   * Per-user, never re-generated for the same user — would change their wallet
   * address and orphan their on-chain identity.
   */
  generateSalt(): string {
    const bytes = randomBytes(16);
    return BigInt('0x' + bytes.toString('hex')).toString();
  }

  /**
   * Deterministically derive the user's Sui address from JWT + salt.
   *
   * Same JWT + same salt → same address every time. This is what makes
   * recovery work: if the user signs back in with the same Google account and
   * we look up their stored salt, they get the same wallet they had before.
   */
  deriveAddress(jwtToken: string, salt: string): string {
    return jwtToAddress(jwtToken, salt, false);
  }
}
