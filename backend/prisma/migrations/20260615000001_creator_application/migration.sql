-- CreateEnum
CREATE TYPE "CreatorStatus" AS ENUM ('NONE', 'PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "creator_status" "CreatorStatus" NOT NULL DEFAULT 'NONE';

-- CreateTable
CREATE TABLE "creator_applications" (
    "user_id"       TEXT        NOT NULL,
    "pitch"         TEXT        NOT NULL,
    "cadence"       TEXT        NOT NULL,
    "tooling"       TEXT        NOT NULL,
    "portfolio_url" TEXT,
    "submitted_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at"   TIMESTAMP(3),

    CONSTRAINT "creator_applications_pkey" PRIMARY KEY ("user_id")
);

-- AddForeignKey
ALTER TABLE "creator_applications" ADD CONSTRAINT "creator_applications_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
