/*
  Warnings:

  - You are about to drop the column `nom` on the `Commentaire` table. All the data in the column will be lost.
  - You are about to drop the column `prenom` on the `Commentaire` table. All the data in the column will be lost.
  - Added the required column `name` to the `Commentaire` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Commentaire" DROP COLUMN "nom",
DROP COLUMN "prenom",
ADD COLUMN     "name" TEXT NOT NULL;
