-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "email" TEXT,
    "display_name" TEXT,
    "avatar_url" TEXT,
    "zklogin_salt" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "jwt_token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "passports" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "sui_object_id" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "total_ink_earned" BIGINT NOT NULL DEFAULT 0,
    "chapters_read" INTEGER NOT NULL DEFAULT 0,
    "series_completed" INTEGER NOT NULL DEFAULT 0,
    "series_tracked" INTEGER NOT NULL DEFAULT 0,
    "identity_blob_id" TEXT,
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "passports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "series" (
    "id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "format_type" INTEGER NOT NULL,
    "source_language" TEXT NOT NULL,
    "cover_url" TEXT,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ongoing',
    "metadata_blob_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reading_records" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "series_id" TEXT NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 0,
    "current_chapter" INTEGER NOT NULL DEFAULT 0,
    "last_read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reading_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "entry_id" TEXT NOT NULL,
    "external_title" TEXT NOT NULL,
    "format_type" INTEGER NOT NULL,
    "external_url" TEXT NOT NULL,
    "total_chapters" INTEGER NOT NULL DEFAULT 0,
    "current_chapter" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "submitted_as_suggestion" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submissions" (
    "id" TEXT NOT NULL,
    "submitter_id" TEXT NOT NULL,
    "sui_object_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "format_type" INTEGER NOT NULL,
    "external_url" TEXT NOT NULL,
    "suggested_source" TEXT NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 0,
    "reviewed_at" TIMESTAMP(3),
    "reward_claimed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ink_ledger_entries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action_type" INTEGER NOT NULL,
    "amount" BIGINT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "sui_tx_digest" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ink_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ink_balances" (
    "user_id" TEXT NOT NULL,
    "balance" BIGINT NOT NULL DEFAULT 0,
    "last_updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ink_balances_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "earning_records" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "sui_object_id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "trigger_type" INTEGER NOT NULL,
    "amount" BIGINT NOT NULL,
    "earned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "earning_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badges_earned" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "sui_object_id" TEXT NOT NULL,
    "category" INTEGER NOT NULL,
    "badge_type" INTEGER NOT NULL,
    "series_id" TEXT,
    "tier" INTEGER NOT NULL DEFAULT 0,
    "metadata_blob_id" TEXT NOT NULL,
    "awarded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "badges_earned_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "key" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "user_id" TEXT,
    "resource_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "admin_action_logs" (
    "id" TEXT NOT NULL,
    "admin_address" TEXT NOT NULL,
    "action_type" TEXT NOT NULL,
    "target_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_action_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_wallet_address_key" ON "users"("wallet_address");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_wallet_address_idx" ON "users"("wallet_address");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_jwt_token_hash_key" ON "sessions"("jwt_token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "passports_user_id_key" ON "passports"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "passports_sui_object_id_key" ON "passports"("sui_object_id");

-- CreateIndex
CREATE INDEX "passports_sui_object_id_idx" ON "passports"("sui_object_id");

-- CreateIndex
CREATE UNIQUE INDEX "series_external_id_key" ON "series"("external_id");

-- CreateIndex
CREATE INDEX "series_external_id_idx" ON "series"("external_id");

-- CreateIndex
CREATE INDEX "series_title_idx" ON "series"("title");

-- CreateIndex
CREATE INDEX "reading_records_user_id_status_idx" ON "reading_records"("user_id", "status");

-- CreateIndex
CREATE INDEX "reading_records_series_id_idx" ON "reading_records"("series_id");

-- CreateIndex
CREATE UNIQUE INDEX "reading_records_user_id_series_id_key" ON "reading_records"("user_id", "series_id");

-- CreateIndex
CREATE INDEX "journal_entries_user_id_idx" ON "journal_entries"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "journal_entries_user_id_entry_id_key" ON "journal_entries"("user_id", "entry_id");

-- CreateIndex
CREATE UNIQUE INDEX "submissions_sui_object_id_key" ON "submissions"("sui_object_id");

-- CreateIndex
CREATE INDEX "submissions_submitter_id_idx" ON "submissions"("submitter_id");

-- CreateIndex
CREATE INDEX "submissions_status_idx" ON "submissions"("status");

-- CreateIndex
CREATE INDEX "submissions_sui_object_id_idx" ON "submissions"("sui_object_id");

-- CreateIndex
CREATE UNIQUE INDEX "ink_ledger_entries_idempotency_key_key" ON "ink_ledger_entries"("idempotency_key");

-- CreateIndex
CREATE INDEX "ink_ledger_entries_user_id_idx" ON "ink_ledger_entries"("user_id");

-- CreateIndex
CREATE INDEX "ink_ledger_entries_idempotency_key_idx" ON "ink_ledger_entries"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "earning_records_sui_object_id_key" ON "earning_records"("sui_object_id");

-- CreateIndex
CREATE UNIQUE INDEX "earning_records_idempotency_key_key" ON "earning_records"("idempotency_key");

-- CreateIndex
CREATE INDEX "earning_records_user_id_idx" ON "earning_records"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "badges_earned_sui_object_id_key" ON "badges_earned"("sui_object_id");

-- CreateIndex
CREATE INDEX "badges_earned_user_id_idx" ON "badges_earned"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "badges_earned_user_id_category_badge_type_series_id_key" ON "badges_earned"("user_id", "category", "badge_type", "series_id");

-- CreateIndex
CREATE INDEX "idempotency_keys_scope_idx" ON "idempotency_keys"("scope");

-- CreateIndex
CREATE INDEX "admin_action_logs_admin_address_idx" ON "admin_action_logs"("admin_address");

-- CreateIndex
CREATE INDEX "admin_action_logs_action_type_idx" ON "admin_action_logs"("action_type");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "passports" ADD CONSTRAINT "passports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_records" ADD CONSTRAINT "reading_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_records" ADD CONSTRAINT "reading_records_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "series"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_submitter_id_fkey" FOREIGN KEY ("submitter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ink_ledger_entries" ADD CONSTRAINT "ink_ledger_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ink_balances" ADD CONSTRAINT "ink_balances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "earning_records" ADD CONSTRAINT "earning_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badges_earned" ADD CONSTRAINT "badges_earned_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badges_earned" ADD CONSTRAINT "badges_earned_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "series"("id") ON DELETE SET NULL ON UPDATE CASCADE;
