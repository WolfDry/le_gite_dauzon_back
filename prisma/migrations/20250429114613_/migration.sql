/*
  Warnings:

  - You are about to drop the column `libel` on the `Supplement` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[label]` on the table `Supplement` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Supplement_libel_key";

-- AlterTable
ALTER TABLE "Supplement" DROP COLUMN "libel",
ADD COLUMN     "label" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE UNIQUE INDEX "Supplement_label_key" ON "Supplement"("label");
