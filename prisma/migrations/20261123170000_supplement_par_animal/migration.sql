-- Supplément facturé par animal, ajouté automatiquement aux demandes du site qui indiquent des animaux.

-- AlterTable
ALTER TABLE "Supplement" ADD COLUMN "parAnimal" BOOLEAN NOT NULL DEFAULT false;

-- Reprise des données : si un seul supplément parle d'animaux, c'est lui.
UPDATE "Supplement"
SET "parAnimal" = true
WHERE "label" ILIKE '%anima%'
  AND (SELECT count(*) FROM "Supplement" WHERE "label" ILIKE '%anima%') = 1;
