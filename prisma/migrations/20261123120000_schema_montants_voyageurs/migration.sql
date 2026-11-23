-- B-O5 : nettoyage du schéma.
-- 1. Index uniques redondants avec la clé primaire (`@id @unique`).
-- 2. Index pour les recherches par dates et par client.
-- 3. Montants en euros, tous en DOUBLE PRECISION (décimales possibles partout).
-- 4. `nbPersonne` (JSON libre) remplacé par trois colonnes typées.

-- DropIndex
DROP INDEX "User_id_key";
DROP INDEX "Client_id_key";
DROP INDEX "Reservation_id_key";
DROP INDEX "Supplement_id_key";
DROP INDEX "Commentaire_id_key";
DROP INDEX "Tarif_id_key";
DROP INDEX "Evenement_id_key";

-- CreateIndex
CREATE INDEX "Reservation_debut_fin_idx" ON "Reservation"("debut", "fin");
CREATE INDEX "Reservation_clientId_idx" ON "Reservation"("clientId");
CREATE INDEX "SupplementOnReservation_supplementId_idx" ON "SupplementOnReservation"("supplementId");

-- AlterTable : les montants entiers deviennent décimaux (conversion sans perte).
ALTER TABLE "Reservation" ALTER COLUMN "tarif" SET DATA TYPE DOUBLE PRECISION;
ALTER TABLE "Supplement" ALTER COLUMN "tarif" SET DATA TYPE DOUBLE PRECISION;
ALTER TABLE "SupplementOnReservation" ALTER COLUMN "tarif" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable : voyageurs
ALTER TABLE "Reservation"
ADD COLUMN "adultes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "enfants" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "animaux" INTEGER NOT NULL DEFAULT 0;

-- Reprise des données : somme des `nb` par catégorie (libellé sans tenir compte de la casse,
-- au singulier ou au pluriel). Un `nb` non numérique compte 0 ; un JSON qui n'est pas un tableau donne 0 partout.
-- Les autres libellés éventuels sont abandonnés.
UPDATE "Reservation" AS r
SET "adultes" = v."adultes", "enfants" = v."enfants", "animaux" = v."animaux"
FROM (
  SELECT
    r2."id",
    COALESCE(SUM(p.nb) FILTER (WHERE p.label IN ('adultes', 'adulte')), 0)::int AS "adultes",
    COALESCE(SUM(p.nb) FILTER (WHERE p.label IN ('enfants', 'enfant')), 0)::int AS "enfants",
    COALESCE(SUM(p.nb) FILTER (WHERE p.label IN ('animaux', 'animal')), 0)::int AS "animaux"
  FROM "Reservation" AS r2
  CROSS JOIN LATERAL (
    SELECT
      lower(trim(e->>'label')) AS label,
      CASE WHEN trim(e->>'nb') ~ '^\d+(\.\d+)?$' THEN floor(trim(e->>'nb')::numeric) ELSE 0 END AS nb
    FROM jsonb_array_elements(
      CASE WHEN jsonb_typeof(r2."nbPersonne") = 'array' THEN r2."nbPersonne" ELSE '[]'::jsonb END
    ) AS e
  ) AS p
  GROUP BY r2."id"
) AS v
WHERE v."id" = r."id";

ALTER TABLE "Reservation" DROP COLUMN "nbPersonne";
