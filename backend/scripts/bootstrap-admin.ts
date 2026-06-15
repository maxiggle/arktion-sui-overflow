/**
 * Bootstrap SUPER_ADMIN Script
 *
 * Creates the first admin user so you can log into the admin UI. Idempotent:
 * if an admin with the given email exists, it just resets the password and
 * upgrades the role to SUPER_ADMIN (useful if you forget the password).
 *
 * Usage:
 *   pnpm tsx scripts/bootstrap-admin.ts <email> <password>
 *
 * Example:
 *   pnpm tsx scripts/bootstrap-admin.ts admin@arktion.app SuperSecret123!
 *
 * Password must be at least 12 characters (matches CreateAdminUserDto).
 */

import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const BCRYPT_ROUNDS = 12;

async function main(): Promise<void> {
  const [, , email, password] = process.argv;

  if (!email || !password) {
    console.error(
      'Usage: pnpm tsx scripts/bootstrap-admin.ts <email> <password>',
    );
    process.exit(1);
  }
  if (password.length < 12) {
    console.error('Password must be at least 12 characters.');
    process.exit(1);
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const result = await prisma.adminUser.upsert({
    where: { email },
    create: {
      email,
      passwordHash,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
    update: {
      passwordHash,
      role: 'SUPER_ADMIN',
      isActive: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });

  console.log(`✓ SUPER_ADMIN ready: ${result.email} (id: ${result.id})`);
  console.log(
    '  Log in at the admin card in the test UI with the password you just set.',
  );

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
