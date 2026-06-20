import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

import { JwtAuthGuard } from './jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../types/authenticated-user.type';

const SECRET = 'test-secret';

function makeContext(headers: Record<string, string>): {
  context: ExecutionContext;
  request: { headers: Record<string, string>; user?: AuthenticatedUser };
} {
  const request: { headers: Record<string, string>; user?: AuthenticatedUser } =
    { headers };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

function sign(payload: object): string {
  return jwt.sign(payload, SECRET, { expiresIn: '1h' });
}

function activeSession() {
  return {
    id: 'session-1',
    revokedAt: null,
    expiresAt: new Date(Date.now() + 60_000),
    user: {
      id: 'user-1',
      walletAddress: '0xabc',
      deletedAt: null,
    },
  };
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let findUnique: jest.Mock;

  beforeEach(() => {
    findUnique = jest.fn();
    const config = {
      getOrThrow: jest.fn().mockReturnValue(SECRET),
    } as unknown as ConfigService;
    const prisma = {
      session: {
        findUnique,
        update: jest.fn().mockResolvedValue(undefined),
      },
    } as unknown as PrismaService;
    guard = new JwtAuthGuard(config, prisma);
  });

  it('rejects a missing Authorization header', async () => {
    const { context } = makeContext({});
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a malformed scheme', async () => {
    const { context } = makeContext({ authorization: 'Basic abc' });
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a token signed with the wrong secret', async () => {
    const token = jwt.sign({ sub: 'user-1', sid: 'session-1' }, 'wrong-secret');
    const { context } = makeContext({ authorization: `Bearer ${token}` });
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects when the session does not exist (revocation)', async () => {
    findUnique.mockResolvedValue(null);
    const token = sign({ sub: 'user-1', sid: 'session-1' });
    const { context } = makeContext({ authorization: `Bearer ${token}` });
    await expect(guard.canActivate(context)).rejects.toThrow(
      'Session not found',
    );
  });

  it('rejects a revoked session even with a valid JWT', async () => {
    findUnique.mockResolvedValue({
      ...activeSession(),
      revokedAt: new Date(),
    });
    const token = sign({ sub: 'user-1', sid: 'session-1' });
    const { context } = makeContext({ authorization: `Bearer ${token}` });
    await expect(guard.canActivate(context)).rejects.toThrow('Session revoked');
  });

  it('rejects an expired session', async () => {
    findUnique.mockResolvedValue({
      ...activeSession(),
      expiresAt: new Date(Date.now() - 1000),
    });
    const token = sign({ sub: 'user-1', sid: 'session-1' });
    const { context } = makeContext({ authorization: `Bearer ${token}` });
    await expect(guard.canActivate(context)).rejects.toThrow('Session expired');
  });

  it('rejects a deactivated account', async () => {
    findUnique.mockResolvedValue({
      ...activeSession(),
      user: { id: 'user-1', walletAddress: '0xabc', deletedAt: new Date() },
    });
    const token = sign({ sub: 'user-1', sid: 'session-1' });
    const { context } = makeContext({ authorization: `Bearer ${token}` });
    await expect(guard.canActivate(context)).rejects.toThrow(
      'Account deactivated',
    );
  });

  it('attaches the authenticated user on success', async () => {
    findUnique.mockResolvedValue(activeSession());
    const token = sign({ sub: 'user-1', sid: 'session-1' });
    const { context, request } = makeContext({
      authorization: `Bearer ${token}`,
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({
      id: 'user-1',
      walletAddress: '0xabc',
      sessionId: 'session-1',
    });
  });
});
