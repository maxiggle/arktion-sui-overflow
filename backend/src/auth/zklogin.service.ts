import {
  BadGatewayException,
  Injectable,
  Logger,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import jwksClient, { JwksClient } from 'jwks-rsa';

import { jwtToAddress } from '@mysten/sui/zklogin';
import { PrismaService } from '../prisma/prisma.service';

export interface VerifiedGoogleClaims {
  iss: string;
  aud: string;
  sub: string;
  email?: string;
  emailVerified?: boolean;
  name?: string;
  picture?: string;
}

export interface EnokiZkProof {
  proofPoints: {
    a: string[];
    b: string[][];
    c: string[];
  };
  issBase64Details: {
    value: string;
    indexMod4: number;
  };
  headerBase64: string;
  addressSeed: string;
}

const ENOKI_BASE = 'https://api.enoki.mystenlabs.com/v1';

@Injectable()
export class ZkLoginService implements OnModuleInit {
  private readonly logger = new Logger(ZkLoginService.name);
  private jwks!: JwksClient;
  private googleClientId!: string;
  private enokiKey!: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit(): void {
    this.googleClientId = this.config.getOrThrow<string>('GOOGLE_CLIENT_ID');
    this.enokiKey = this.config.getOrThrow<string>('ENOKI_SECRET_KEY');
    this.jwks = jwksClient({
      jwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
      cache: true,
      cacheMaxAge: 24 * 60 * 60 * 1000,
      rateLimit: true,
      jwksRequestsPerMinute: 10,
    });
  }

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
   * Get the Enoki-managed salt and derived wallet address for a JWT.
   * Enoki owns the salt — we must use this address when creating the user row
   * so it matches the address the ZK proof was generated for.
   */
  async getEnokiAddress(
    jwtToken: string,
  ): Promise<{ salt: string; address: string }> {
    const res = await fetch(`${ENOKI_BASE}/zklogin`, {
      headers: {
        Authorization: `Bearer ${this.enokiKey}`,
        'zklogin-jwt': jwtToken,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`Enoki /zklogin failed ${res.status}: ${text}`);
      throw new BadGatewayException(
        'Failed to retrieve zkLogin address from Enoki',
      );
    }

    const body = (await res.json()) as {
      data: { salt: string; address: string };
    };
    return body.data;
  }

  /**
   * Request a ZK proof from Enoki. The proof is valid for the given
   * maxEpoch and is tied to the user's JWT and ephemeral public key.
   *
   * Enoki uses its own salt internally — no salt param needed.
   */
  async requestZkProof(params: {
    jwtToken: string;
    ephemeralPublicKey: string;
    maxEpoch: number;
    randomness: string;
    network?: string;
  }): Promise<EnokiZkProof> {
    const res = await fetch(`${ENOKI_BASE}/zklogin/zkp`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.enokiKey}`,
        'zklogin-jwt': params.jwtToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ephemeralPublicKey: params.ephemeralPublicKey,
        maxEpoch: params.maxEpoch,
        randomness: params.randomness,
        network: params.network ?? 'testnet',
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`Enoki /zklogin/zkp failed ${res.status}: ${text}`);
      throw new BadGatewayException(`Enoki ZKP error ${res.status}: ${text}`);
    }

    const body = (await res.json()) as { data: EnokiZkProof };
    return body.data;
  }

  /**
   * Deterministically derive the user's Sui address from JWT + salt.
   * Kept for address verification / migration purposes.
   */
  deriveAddress(jwtToken: string, salt: string): string {
    return jwtToAddress(jwtToken, salt, false);
  }
}
