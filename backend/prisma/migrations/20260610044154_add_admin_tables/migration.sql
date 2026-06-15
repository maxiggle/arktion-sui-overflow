/*
  Warnings:

  - You are about to drop the column `admin_address` on the `admin_action_logs` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `admin_action_logs` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'MODERATOR', 'REVIEWER');

-- DropIndex
DROP INDEX "admin_action_logs_admin_address_idx";

-- AlterTable
ALTER TABLE "admin_action_logs" DROP COLUMN "admin_address",
DROP COLUMN "notes",
ADD COLUMN     "admin_id" TEXT,
ADD COLUMN     "ip_address" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "target_type" TEXT;

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'REVIEWER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "totp_secret" TEXT,
    "totp_enabled" BOOLEAN NOT NULL DEFAULT false,
    "totp_backup_codes" TEXT[],
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "last_login_ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_sessions" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "refresh_token_hash" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE INDEX "admin_users_email_idx" ON "admin_users"("email");

-- CreateIndex
CREATE INDEX "admin_sessions_admin_id_idx" ON "admin_sessions"("admin_id");

-- CreateIndex
CREATE INDEX "admin_sessions_refresh_token_hash_idx" ON "admin_sessions"("refresh_token_hash");

-- CreateIndex
CREATE INDEX "admin_action_logs_admin_id_idx" ON "admin_action_logs"("admin_id");

-- CreateIndex
CREATE INDEX "admin_action_logs_created_at_idx" ON "admin_action_logs"("created_at");

-- AddForeignKey
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_action_logs" ADD CONSTRAINT "admin_action_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
