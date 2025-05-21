-- CreateEnum
CREATE TYPE "TarifFrequence" AS ENUM ('SEMAINE', 'JOUR', 'WEEKEND', 'PERSONNE');

-- CreateTable
CREATE TABLE "Tarif" (
    "id" SERIAL NOT NULL,
    "desc" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "start_date" DATE[],
    "end_date" DATE[],
    "vacance" BOOLEAN NOT NULL DEFAULT false,
    "prix" INTEGER NOT NULL,
    "frequence" "TarifFrequence"[],

    CONSTRAINT "Tarif_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tarif_id_key" ON "Tarif"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Tarif_label_key" ON "Tarif"("label");
