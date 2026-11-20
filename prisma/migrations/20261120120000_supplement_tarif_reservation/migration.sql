-- Le prix d'un supplément est enregistré dans chaque réservation : changer le prix du catalogue
-- ne modifie plus le total des réservations existantes, et il peut être ajusté réservation par réservation.

-- AlterTable
ALTER TABLE "SupplementOnReservation" ADD COLUMN "tarif" INTEGER;

-- Reprise des données : les réservations existantes gardent le prix actuel du catalogue.
UPDATE "SupplementOnReservation" AS sr
SET "tarif" = s."tarif"
FROM "Supplement" AS s
WHERE s."id" = sr."supplementId";

ALTER TABLE "SupplementOnReservation" ALTER COLUMN "tarif" SET NOT NULL;
