-- AlterTable: make imageUrl nullable, add contentUrl for novel chapters
ALTER TABLE "pages" ALTER COLUMN "image_url" DROP NOT NULL;
ALTER TABLE "pages" ADD COLUMN "content_url" TEXT;
