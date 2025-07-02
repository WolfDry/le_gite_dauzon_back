-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('RANDO', 'VISIT', 'EVENT');

-- CreateTable
CREATE TABLE "Evenement" (
    "id" SERIAL NOT NULL,
    "titre" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "type" "EventType" NOT NULL,
    "location" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "lien" TEXT NOT NULL,

    CONSTRAINT "Evenement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Evenement_id_key" ON "Evenement"("id");
