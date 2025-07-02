/*
  Warnings:

  - You are about to drop the column `location` on the `Evenement` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Evenement" DROP COLUMN "location",
ADD COLUMN     "localisation" TEXT;
