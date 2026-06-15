/*
  Warnings:

  - You are about to drop the column `jwt_token_hash` on the `sessions` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[token]` on the table `sessions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `token` to the `sessions` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "sessions_jwt_token_hash_key";

-- AlterTable
ALTER TABLE "sessions" DROP COLUMN "jwt_token_hash",
ADD COLUMN     "token" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");
