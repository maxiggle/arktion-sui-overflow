-- CreateTable
CREATE TABLE "send_transactions" (
    "id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "recipient_address" TEXT NOT NULL,
    "amount_usdc" BIGINT NOT NULL,
    "sui_tx_digest" TEXT,
    "status" INTEGER NOT NULL DEFAULT 0,
    "idempotency_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMP(3),

    CONSTRAINT "send_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "send_transactions_sui_tx_digest_key" ON "send_transactions"("sui_tx_digest");

-- CreateIndex
CREATE UNIQUE INDEX "send_transactions_idempotency_key_key" ON "send_transactions"("idempotency_key");

-- CreateIndex
CREATE INDEX "send_transactions_sender_id_idx" ON "send_transactions"("sender_id");

-- CreateIndex
CREATE INDEX "send_transactions_status_idx" ON "send_transactions"("status");

-- AddForeignKey
ALTER TABLE "send_transactions" ADD CONSTRAINT "send_transactions_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DropTable (drop the vestigial USDC balance mirror — balances are read live from chain)
DROP TABLE "user_usdc_balances";
