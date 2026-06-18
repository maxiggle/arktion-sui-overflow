-- AlterTable
ALTER TABLE "submissions" ALTER COLUMN "voting_ends_at" SET DEFAULT now() + interval '7 days';
