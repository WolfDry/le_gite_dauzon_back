-- CreateTable
CREATE TABLE "Commentaire" (
    "id" SERIAL NOT NULL,
    "verif" BOOLEAN NOT NULL,
    "date" DATE NOT NULL,
    "commentaire" TEXT NOT NULL,
    "nom" TEXT,
    "prenom" TEXT NOT NULL,
    "note" INTEGER NOT NULL,

    CONSTRAINT "Commentaire_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Commentaire_id_key" ON "Commentaire"("id");
