-- DropForeignKey
ALTER TABLE "SupplementOnReservation" DROP CONSTRAINT "SupplementOnReservation_reservationId_fkey";

-- AddForeignKey
ALTER TABLE "SupplementOnReservation" ADD CONSTRAINT "SupplementOnReservation_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
