import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { SuiService } from '../sui/sui.service';
import { BootstrapService } from '../sui/bootstrap.service';
import { ZkLoginService, VerifiedGoogleClaims } from './zklogin.service';
import { SessionService } from './session.service';
import { CompleteZkLoginDto } from './dto/complete-zklogin.dto';

export interface AuthResult {
  sessionToken: string;
  expiresAt: Date;
  isNewUser: boolean;
  user: {
    id: string;
    walletAddress: string;
    email: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

interface RequestMetadata {
  userAgent?: string;
  ipAddress?: string;
}

const BOOTSTRAP_PENDING = 'pending';
const BOOTSTRAP_COMPLETE = 'complete';

/**
 * Orchestrates sign-in with a two-phase commit for the on-chain bootstrap.
 *
 * The bootstrap mints three on-chain objects (passport, library, journal)
 * AND writes corresponding rows to Postgres. These two operations have
 * different durability semantics — chain calls are irreversible, DB writes
 * are transactional — so naive "chain first, DB second" code can leave
 * orphan objects on-chain if the DB write fails after the chain succeeds.
 *
 * Two-phase commit avoids that:
 *
 *   Phase A (intent):   create the user row with bootstrapState='pending'.
 *                       Salt + derived address are persisted before any
 *                       chain call. Retries see the pending row and resume
 *                       without re-deriving (which would produce a different
 *                       wallet address and strand any objects already minted).
 *
 *   Phase B (chain):    run the bootstrap PTB. If this throws, the user row
 *                       stays in 'pending'. Next login resumes.
 *
 *   Phase C (finalize): write the passport row, fill in libraryObjectId /
 *                       journalObjectId, set bootstrapState='complete'.
 *                       If this throws, next login finds the pending row,
 *                       checks the chain for existing objects (avoiding
 *                       duplicate mints), and completes phase C.
 *
 * Net result: every failure mode is recoverable on the user's next login
 * without orphan objects, without duplicate passports, without lost gas.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sui: SuiService,
    private readonly zkLogin: ZkLoginService,
    private readonly bootstrap: BootstrapService,
    private readonly sessions: SessionService,
  ) {}

  async completeZkLogin(
    dto: CompleteZkLoginDto,
    meta: RequestMetadata = {},
  ): Promise<AuthResult> {
    const claims = await this.zkLogin.verifyGoogleJwt(dto.jwt);

    let user = await this.prisma.user.findUnique({
      where: {
        oauthIss_oauthSub: { oauthIss: claims.iss, oauthSub: claims.sub },
      },
    });

    let isNewUser = false;

    if (!user) {
      user = await this.createUserWithBootstrap(dto.jwt, claims);
      isNewUser = true;
    } else if (user.bootstrapState !== BOOTSTRAP_COMPLETE) {
      user = await this.resumePendingBootstrap(user);
      isNewUser = true;
    }

    const session = await this.sessions.issue(user.id, meta);

    return {
      sessionToken: session.token,
      expiresAt: session.expiresAt,
      isNewUser,
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  /**
   * Phase A: insert user row with bootstrapState='pending'.
   * Phase B: run the on-chain bootstrap PTB.
   * Phase C: persist on-chain object IDs and mark complete.
   */
  private async createUserWithBootstrap(
    jwtToken: string,
    claims: VerifiedGoogleClaims,
  ) {
    // Enoki owns the salt — we fetch the address from Enoki so it matches
    // exactly what the ZK proof was generated for.
    const { salt, address: walletAddress } =
      await this.zkLogin.getEnokiAddress(jwtToken);

    this.logger.log(
      `New user sign-in: sub=${claims.sub}, enoki address=${walletAddress}`,
    );

    // Phase A — record intent before touching the chain. Unique constraint
    // on (oauthIss, oauthSub) prevents concurrent first-logins from racing.
    const user = await this.prisma.user.create({
      data: {
        oauthIss: claims.iss,
        oauthSub: claims.sub,
        walletAddress,
        zkLoginSalt: salt,
        email: claims.email,
        displayName: claims.name,
        avatarUrl: claims.picture,
        bootstrapState: BOOTSTRAP_PENDING,
        bootstrapStartedAt: new Date(),
      },
    });

    // Phase B — chain. On failure, the pending row stays and gets resumed
    // on next login.
    const bootstrap = await this.bootstrap.execute(walletAddress);

    // Phase C — finalize. Wrap in a DB transaction so passport row + user
    // update are atomic.
    const finalized = await this.finalizeBootstrap(user.id, {
      passportObjectId: bootstrap.passportObjectId,
      libraryObjectId: bootstrap.libraryObjectId,
      journalObjectId: bootstrap.journalObjectId,
      digest: bootstrap.digest,
    });

    return finalized;
  }

  /**
   * Resume a previously-pending bootstrap. Two paths:
   *
   *   1. The on-chain bootstrap ACTUALLY SUCCEEDED on the prior attempt and
   *      only phase C failed. Query the chain for owned objects of the right
   *      types — if found, reuse them and finalize the DB write.
   *
   *   2. The on-chain bootstrap genuinely failed. Re-run it.
   *
   * Path 1 is critical: without it, a transient DB blip after a successful
   * chain call would cause us to mint a second set of objects and abandon
   * the first. With it, every retry converges to the same wallet state.
   */
  private async resumePendingBootstrap(user: {
    id: string;
    walletAddress: string;
  }) {
    this.logger.warn(`Resuming pending bootstrap for user ${user.id}`);

    const existing = await this.findExistingBootstrapObjects(
      user.walletAddress,
    );

    let passportObjectId: string;
    let libraryObjectId: string;
    let journalObjectId: string;
    let digest: string | null;

    if (
      existing.passportObjectId &&
      existing.libraryObjectId &&
      existing.journalObjectId
    ) {
      // Chain side already succeeded — finalize DB with what's there.
      this.logger.log(
        `Found existing on-chain bootstrap for ${user.walletAddress}, finalizing DB`,
      );
      passportObjectId = existing.passportObjectId;
      libraryObjectId = existing.libraryObjectId;
      journalObjectId = existing.journalObjectId;
      digest = null;
    } else {
      // Chain side really did fail. Re-run.
      this.logger.log(`No existing chain objects, re-running bootstrap PTB`);
      const fresh = await this.bootstrap.execute(user.walletAddress);
      passportObjectId = fresh.passportObjectId;
      libraryObjectId = fresh.libraryObjectId;
      journalObjectId = fresh.journalObjectId;
      digest = fresh.digest;
    }

    return this.finalizeBootstrap(user.id, {
      passportObjectId,
      libraryObjectId,
      journalObjectId,
      digest,
    });
  }

  /**
   * Phase C as a reusable transactional unit. Upsert on Passport so that
   * resume calls don't fail if a partial DB write left a passport row behind.
   */
  private async finalizeBootstrap(
    userId: string,
    objects: {
      passportObjectId: string;
      libraryObjectId: string;
      journalObjectId: string;
      digest: string | null;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.passport.upsert({
        where: { userId },
        create: {
          userId,
          suiObjectId: objects.passportObjectId,
        },
        update: {
          suiObjectId: objects.passportObjectId,
        },
      });

      return tx.user.update({
        where: { id: userId },
        data: {
          libraryObjectId: objects.libraryObjectId,
          journalObjectId: objects.journalObjectId,
          bootstrapState: BOOTSTRAP_COMPLETE,
          bootstrapTxDigest: objects.digest,
        },
      });
    });
  }

  /**
   * Look up on-chain objects owned by `walletAddress` that match the three
   * bootstrap types. Used by resumePendingBootstrap to detect whether a
   * prior chain call actually succeeded.
   */
  private async findExistingBootstrapObjects(walletAddress: string) {
    const response = await this.sui.client.core.listOwnedObjects({
      owner: walletAddress,
    });
    for (const obj of response.objects) {
      console.log(obj.objectId, obj.type);
    }

    const findBySuffix = (suffix: string): string | undefined =>
      response.objects.find((o) => o.type?.endsWith(suffix))?.objectId;

    return {
      passportObjectId: findBySuffix('::passport::ArktionPassport'),
      libraryObjectId: findBySuffix('::reading_history::UserLibrary'),
      journalObjectId: findBySuffix('::journal::UserJournal'),
    };
  }
}
