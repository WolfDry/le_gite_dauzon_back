/*
  Warnings:

  - You are about to drop the column `date` on the `Commentaire` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Commentaire" DROP COLUMN "date",
ADD COLUMN     "created" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP;
