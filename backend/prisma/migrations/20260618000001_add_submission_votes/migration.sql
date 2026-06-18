-- Add voting_ends_at to submissions (7-day window from creation)
ALTER TABLE "submissions"
  ADD COLUMN "voting_ends_at" TIMESTAMP(3) NOT NULL DEFAULT now() + interval '7 days';

-- Backfill existing rows: 7 days from their created_at
UPDATE "submissions"
  SET "voting_ends_at" = "created_at" + interval '7 days'
  WHERE true;

-- INK-weighted DAO votes
CREATE TABLE "submission_votes" (
  "id"             TEXT         NOT NULL,
  "submission_id"  TEXT         NOT NULL,
  "voter_id"       TEXT         NOT NULL,
  "vote"           INTEGER      NOT NULL,       -- 1 = approve, 0 = reject
  "ink_weight"     BIGINT       NOT NULL,       -- INK balance snapshot at vote time
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "submission_votes_pkey" PRIMARY KEY ("id")
);

-- One vote per voter per submission
CREATE UNIQUE INDEX "submission_votes_submission_id_voter_id_key"
  ON "submission_votes"("submission_id", "voter_id");

CREATE INDEX "submission_votes_submission_id_idx"
  ON "submission_votes"("submission_id");

-- Foreign keys
ALTER TABLE "submission_votes"
  ADD CONSTRAINT "submission_votes_submission_id_fkey"
  FOREIGN KEY ("submission_id") REFERENCES "submissions"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "submission_votes"
  ADD CONSTRAINT "submission_votes_voter_id_fkey"
  FOREIGN KEY ("voter_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
