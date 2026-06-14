-- AlterTable
ALTER TABLE "series" ADD COLUMN     "creator_id" TEXT;

-- CreateTable
CREATE TABLE "tip_transactions" (
    "id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "receiver_id" TEXT NOT NULL,
    "series_id" TEXT NOT NULL,
    "amount_usdc" BIGINT NOT NULL,
    "sui_tx_digest" TEXT,
    "status" INTEGER NOT NULL DEFAULT 0,
    "idempotency_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMP(3),

    CONSTRAINT "tip_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_usdc_balances" (
    "user_id" TEXT NOT NULL,
    "balance" BIGINT NOT NULL DEFAULT 0,
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_usdc_balances_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tip_transactions_sui_tx_digest_key" ON "tip_transactions"("sui_tx_digest");

-- CreateIndex
CREATE UNIQUE INDEX "tip_transactions_idempotency_key_key" ON "tip_transactions"("idempotency_key");

-- CreateIndex
CREATE INDEX "tip_transactions_sender_id_idx" ON "tip_transactions"("sender_id");

-- CreateIndex
CREATE INDEX "tip_transactions_receiver_id_idx" ON "tip_transactions"("receiver_id");

-- CreateIndex
CREATE INDEX "tip_transactions_series_id_idx" ON "tip_transactions"("series_id");

-- CreateIndex
CREATE INDEX "tip_transactions_status_idx" ON "tip_transactions"("status");

-- CreateIndex
CREATE INDEX "series_creator_id_idx" ON "series"("creator_id");

-- AddForeignKey
ALTER TABLE "series" ADD CONSTRAINT "series_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tip_transactions" ADD CONSTRAINT "tip_transactions_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tip_transactions" ADD CONSTRAINT "tip_transactions_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tip_transactions" ADD CONSTRAINT "tip_transactions_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "series"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_usdc_balances" ADD CONSTRAINT "user_usdc_balances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
