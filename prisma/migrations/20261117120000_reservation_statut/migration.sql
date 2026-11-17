-- Remplace le booléen `verif` par un statut, et enregistre les coordonnées des demandes du site.

-- CreateEnum
CREATE TYPE "ReservationStatut" AS ENUM ('DEMANDE', 'OPTION', 'CONFIRMEE', 'REFUSEE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "ReservationSource" AS ENUM ('SITE', 'ADMIN');

-- AlterTable
ALTER TABLE "Reservation"
ADD COLUMN     "demandeurEmail" TEXT,
ADD COLUMN     "demandeurNom" TEXT,
ADD COLUMN     "demandeurTelephone" TEXT,
ADD COLUMN     "message" TEXT,
ADD COLUMN     "source" "ReservationSource" NOT NULL DEFAULT 'ADMIN',
ADD COLUMN     "statut" "ReservationStatut" NOT NULL DEFAULT 'DEMANDE',
ADD COLUMN     "statutModifieLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Reprise des données : l'admin traitait `verif` absent (NULL) comme confirmé, on garde ce sens.
UPDATE "Reservation" SET "statut" = 'CONFIRMEE' WHERE "verif" IS DISTINCT FROM false;

-- Les demandes non confirmées sans client venaient du site public.
UPDATE "Reservation" SET "source" = 'SITE' WHERE "verif" = false AND "clientId" IS NULL;

-- Le délai de purge des demandes part de leur date de réception.
UPDATE "Reservation" SET "statutModifieLe" = "dateAjout";

ALTER TABLE "Reservation" DROP COLUMN "verif";

-- Index utiles au calendrier public et à la purge
CREATE INDEX "Reservation_statut_fin_idx" ON "Reservation"("statut", "fin");
