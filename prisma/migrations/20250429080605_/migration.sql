-- CreateEnum
CREATE TYPE "SupplementType" AS ENUM ('SEJOUR', 'HEBDOMADAIRE', 'QUOTIDIEN');

-- CreateTable
CREATE TABLE "Supplement" (
    "id" SERIAL NOT NULL,
    "libel" TEXT NOT NULL,
    "tarif" INTEGER NOT NULL,
    "type" "SupplementType" NOT NULL,

    CONSTRAINT "Supplement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplementOnReservation" (
    "reservationId" INTEGER NOT NULL,
    "supplementId" INTEGER NOT NULL,
    "nb" INTEGER NOT NULL,

    CONSTRAINT "SupplementOnReservation_pkey" PRIMARY KEY ("reservationId","supplementId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Supplement_id_key" ON "Supplement"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Supplement_libel_key" ON "Supplement"("libel");

-- AddForeignKey
ALTER TABLE "SupplementOnReservation" ADD CONSTRAINT "SupplementOnReservation_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplementOnReservation" ADD CONSTRAINT "SupplementOnReservation_supplementId_fkey" FOREIGN KEY ("supplementId") REFERENCES "Supplement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
