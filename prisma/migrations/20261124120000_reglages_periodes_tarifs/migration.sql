-- B-F4 : réglages du gîte, périodes datées des tarifs, taxe de séjour enregistrée dans chaque réservation.

-- Taxe de séjour par adulte et par nuit, figée à l'enregistrement de la réservation.
-- Les réservations existantes reprennent le taux appliqué jusqu'ici (1,65 €).
ALTER TABLE "Reservation" ADD COLUMN "taxeSejour" DOUBLE PRECISION NOT NULL DEFAULT 1.65;
ALTER TABLE "Reservation" ALTER COLUMN "taxeSejour" DROP DEFAULT;

-- Périodes d'application des tarifs : nuits du "debut" (inclus) au "fin" (jour de départ, exclu).
-- L'ancien texte libre ("Tarif"."date") reste affiché tant qu'un tarif n'a aucune période datée :
-- il ne peut pas être converti automatiquement (année absente, format libre).
CREATE TABLE "TarifPeriode" (
    "id" SERIAL NOT NULL,
    "tarifId" INTEGER NOT NULL,
    "debut" DATE NOT NULL,
    "fin" DATE NOT NULL,

    CONSTRAINT "TarifPeriode_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TarifPeriode_fin_check" CHECK ("fin" > "debut")
);

CREATE INDEX "TarifPeriode_tarifId_idx" ON "TarifPeriode"("tarifId");
CREATE INDEX "TarifPeriode_debut_fin_idx" ON "TarifPeriode"("debut", "fin");

ALTER TABLE "TarifPeriode" ADD CONSTRAINT "TarifPeriode_tarifId_fkey" FOREIGN KEY ("tarifId") REFERENCES "Tarif"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Réglages : une seule ligne, créée avec les valeurs codées en dur jusqu'ici
-- (taxe 1,65 €, 5 voyageurs, saison d'avril à septembre, acompte de 30 %).
CREATE TABLE "Reglages" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "taxeSejour" DOUBLE PRECISION NOT NULL DEFAULT 1.65,
    "capacite" INTEGER NOT NULL DEFAULT 5,
    "saisonDebut" INTEGER NOT NULL DEFAULT 4,
    "saisonFin" INTEGER NOT NULL DEFAULT 9,
    "acomptePourcentage" INTEGER NOT NULL DEFAULT 30,

    CONSTRAINT "Reglages_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Reglages_unique_check" CHECK ("id" = 1)
);

INSERT INTO "Reglages" ("id") VALUES (1);
