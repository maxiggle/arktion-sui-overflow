-- AlterTable
ALTER TABLE "users" ADD COLUMN     "bootstrap_started_at" TIMESTAMP(3),
ADD COLUMN     "bootstrap_state" TEXT,
ADD COLUMN     "bootstrap_tx_digest" TEXT;
