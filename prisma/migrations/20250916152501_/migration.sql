/*
  Warnings:

  - You are about to drop the column `end_date` on the `Tarif` table. All the data in the column will be lost.
  - You are about to drop the column `start_date` on the `Tarif` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Tarif" DROP COLUMN "end_date",
DROP COLUMN "start_date",
ADD COLUMN     "date" TEXT[];
