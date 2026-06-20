-- AlterTable
ALTER TABLE "series" ALTER COLUMN "status" SET DEFAULT 'draft';

-- AlterTable
ALTER TABLE "submissions" ALTER COLUMN "voting_ends_at" SET DEFAULT now() + interval '7 days';
