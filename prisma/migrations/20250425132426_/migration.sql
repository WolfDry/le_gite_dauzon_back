-- CreateTable
CREATE TABLE "Reservation" (
    "id" SERIAL NOT NULL,
    "tarif" INTEGER NOT NULL,
    "debut" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3) NOT NULL,
    "dateAjout" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nbPersonne" INTEGER NOT NULL,
    "clientId" INTEGER,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_id_key" ON "Reservation"("id");

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
