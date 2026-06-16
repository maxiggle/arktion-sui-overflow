-- AlterTable
ALTER TABLE "series" ADD COLUMN "creator_id" TEXT;

-- AddForeignKey
ALTER TABLE "series" ADD CONSTRAINT "series_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "series_creator_id_idx" ON "series"("creator_id");
