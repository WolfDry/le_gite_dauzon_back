-- B-F8 : dates bloquées hors réservation (usage personnel, travaux).
-- Nuits du "debut" (inclus) au "fin" (jour de départ, exclu), comme un séjour.
CREATE TABLE "Blocage" (
    "id" SERIAL NOT NULL,
    "debut" DATE NOT NULL,
    "fin" DATE NOT NULL,
    "motif" TEXT,

    CONSTRAINT "Blocage_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Blocage_fin_check" CHECK ("fin" > "debut")
);

CREATE INDEX "Blocage_debut_fin_idx" ON "Blocage"("debut", "fin");
