/**
 * Delete platform users and all of their OFF-CHAIN data, so the Google
 * accounts can be reused for testing.
 *
 * Usage:
 *   pnpm tsx scripts/delete-user.ts --list
 *   pnpm tsx scripts/delete-user.ts <email-or-wallet> [<email-or-wallet> ...] [--force]
 *
 * IMPORTANT — this does NOT reset on-chain state. A user's Sui address is
 * derived deterministically from their Google account, so signing in again
 * re-links the SAME on-chain passport/library/journal (with its old level and
 * INK). For a pristine "first login / passport minted" experience, use a Google
 * account that has never signed into Arktion instead of deleting one.
 *
 * Creator accounts (those that own series) are refused unless --force, because
 * deleting a creator's series cascades into other readers' records, tips, and
 * chapters. With --force, the series are detached (creatorId set null) rather
 * than deleted.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function listUsers() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      email: true,
      walletAddress: true,
      displayName: true,
      createdAt: true,
      _count: { select: { createdSeries: true } },
    },
  });

  if (users.length === 0) {
    console.log('No users in the database.');
    return;
  }

  console.log(`${users.length} user(s):\n`);
  for (const u of users) {
    const creator =
      u._count.createdSeries > 0
        ? ` [creator: ${u._count.createdSeries} series]`
        : '';
    console.log(
      `  ${u.email ?? '(no email)'}  ·  ${u.walletAddress}  ·  ` +
        `${u.displayName ?? '—'}  ·  ${u.createdAt.toISOString().slice(0, 10)}${creator}`,
    );
  }
}

async function deleteOne(identifier: string, force: boolean): Promise<boolean> {
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: identifier }, { walletAddress: identifier }] },
    select: { id: true, email: true, walletAddress: true },
  });

  if (!user) {
    console.warn(`  ⚠ No user found for "${identifier}" — skipped.`);
    return false;
  }

  const seriesCount = await prisma.series.count({
    where: { creatorId: user.id },
  });
  if (seriesCount > 0 && !force) {
    console.warn(
      `  ⚠ "${identifier}" owns ${seriesCount} series — skipped. ` +
        `Re-run with --force to detach the series and delete anyway.`,
    );
    return false;
  }

  await prisma.$transaction(async (tx) => {
    const uid = user.id;

    await tx.submissionVote.deleteMany({ where: { voterId: uid } });
    const ownSubmissions = await tx.submission.findMany({
      where: { submitterId: uid },
      select: { id: true },
    });
    if (ownSubmissions.length > 0) {
      const ids = ownSubmissions.map((s) => s.id);
      await tx.submissionVote.deleteMany({
        where: { submissionId: { in: ids } },
      });
      await tx.submission.deleteMany({ where: { submitterId: uid } });
    }

    await tx.tipTransaction.deleteMany({
      where: { OR: [{ senderId: uid }, { receiverId: uid }] },
    });
    await tx.sendTransaction.deleteMany({ where: { senderId: uid } });

    await tx.earningRecord.deleteMany({ where: { userId: uid } });
    await tx.inkLedgerEntry.deleteMany({ where: { userId: uid } });
    await tx.inkBalance.deleteMany({ where: { userId: uid } });
    await tx.badgeEarned.deleteMany({ where: { userId: uid } });
    await tx.journalEntry.deleteMany({ where: { userId: uid } });
    await tx.readingRecord.deleteMany({ where: { userId: uid } });

    if (seriesCount > 0) {
      // --force path: keep the content, drop the creator link.
      await tx.series.updateMany({
        where: { creatorId: uid },
        data: { creatorId: null },
      });
    }

    // passport, sessions, creatorApplication cascade with the user row.
    await tx.user.delete({ where: { id: uid } });
  });

  console.log(`  ✓ Deleted ${user.email ?? user.walletAddress}.`);
  return true;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--list')) {
    await listUsers();
    return;
  }

  const force = args.includes('--force');
  const identifiers = args.filter((a) => !a.startsWith('--'));

  if (identifiers.length === 0) {
    console.error(
      'Usage:\n' +
        '  pnpm tsx scripts/delete-user.ts --list\n' +
        '  pnpm tsx scripts/delete-user.ts <email-or-wallet> [<email-or-wallet> ...] [--force]',
    );
    process.exit(1);
  }

  console.log(`Deleting ${identifiers.length} account(s)…`);
  let deleted = 0;
  for (const id of identifiers) {
    if (await deleteOne(id, force)) deleted++;
  }

  console.log(`\nDone. ${deleted}/${identifiers.length} deleted.`);
  if (deleted > 0) {
    console.log(
      'Reminder: on-chain passports for these wallets still exist and will be ' +
        're-linked if these Google accounts sign in again.',
    );
  }
}

main()
  .catch((err) => {
    console.error('Failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
