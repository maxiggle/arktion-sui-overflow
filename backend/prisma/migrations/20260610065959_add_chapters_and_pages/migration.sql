-- AlterTable
ALTER TABLE "series" ADD COLUMN     "chapters_synced_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "chapters" (
    "id" TEXT NOT NULL,
    "series_id" TEXT NOT NULL,
    "external_id" TEXT,
    "chapter_number" DOUBLE PRECISION NOT NULL,
    "title" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "page_count" INTEGER NOT NULL DEFAULT 0,
    "is_licensed" BOOLEAN NOT NULL DEFAULT false,
    "ink_cost" INTEGER NOT NULL DEFAULT 0,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pages" (
    "id" TEXT NOT NULL,
    "chapter_id" TEXT NOT NULL,
    "page_number" INTEGER NOT NULL,
    "image_url" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chapters_external_id_key" ON "chapters"("external_id");

-- CreateIndex
CREATE INDEX "chapters_series_id_language_idx" ON "chapters"("series_id", "language");

-- CreateIndex
CREATE INDEX "chapters_external_id_idx" ON "chapters"("external_id");

-- CreateIndex
CREATE UNIQUE INDEX "chapters_series_id_language_chapter_number_key" ON "chapters"("series_id", "language", "chapter_number");

-- CreateIndex
CREATE INDEX "pages_chapter_id_idx" ON "pages"("chapter_id");

-- CreateIndex
CREATE UNIQUE INDEX "pages_chapter_id_page_number_key" ON "pages"("chapter_id", "page_number");

-- AddForeignKey
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "series"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pages" ADD CONSTRAINT "pages_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
