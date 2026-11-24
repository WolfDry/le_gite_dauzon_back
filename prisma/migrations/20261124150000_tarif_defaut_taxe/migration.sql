-- Tarif par défaut (basse saison) et taxe de séjour rangée dans les seuls réglages.

-- Tarif à la semaine des nuits qu'aucune période ne couvre. Un seul tarif l'est à la fois (contrôlé par l'API).
ALTER TABLE "Tarif" ADD COLUMN "parDefaut" BOOLEAN NOT NULL DEFAULT false;

-- Reprise des données : si un seul prix à la semaine parle de basse saison, c'est lui.
UPDATE "Tarif"
SET "parDefaut" = true
WHERE "label" ILIKE '%basse%'
  AND 'SEMAINE'::"TarifFrequence" = ANY("frequence")
  AND (
    SELECT count(*) FROM "Tarif"
    WHERE "label" ILIKE '%basse%' AND 'SEMAINE'::"TarifFrequence" = ANY("frequence")
  ) = 1;

-- La taxe de séjour était saisie comme un prix, pour l'afficher sur le site. Elle est désormais un réglage,
-- que le site affiche lui-même. S'il y a un seul prix « taxe… », son montant passe dans les réglages,
-- puis il est supprimé. Les réservations existantes gardent la taxe enregistrée avec elles.
UPDATE "Reglages"
SET "taxeSejour" = t."prix"
FROM "Tarif" t
WHERE "Reglages"."id" = 1
  AND t."label" ILIKE '%taxe%'
  AND (SELECT count(*) FROM "Tarif" WHERE "label" ILIKE '%taxe%') = 1;

DELETE FROM "Tarif"
WHERE "label" ILIKE '%taxe%'
  AND (SELECT count(*) FROM "Tarif" WHERE "label" ILIKE '%taxe%') = 1;
