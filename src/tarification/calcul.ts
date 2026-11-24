import { SupplementType } from '@prisma/client';

/**
 * Règle de prix du gîte, seule source de vérité (B-F4). Fonctions pures : pas de base de données.
 *
 * - L'hébergement se paie par semaine entière, une semaine au minimum : les jours restants ne sont pas
 *   facturés (10 nuits coûtent une semaine). Chaque semaine commence le jour d'arrivée, ou 7, 14… jours après.
 *   Exception : du samedi au dimanche (1 nuit), c'est le forfait week-end.
 * - La taxe de séjour se paie par adulte et par nuit.
 * - Suppléments : SEJOUR une fois, QUOTIDIEN par nuit, HEBDOMADAIRE par semaine entière, avec une semaine
 *   de plus au-delà de 4 jours entamés.
 */

const DAY_MS = 86_400_000;

/** Arrondi au centime. */
export const arrondi = (montant: number) => Math.round(montant * 100) / 100;

export const ajouterJours = (date: Date, jours: number) => new Date(date.getTime() + jours * DAY_MS);

/** Nombre de nuits entre deux dates à minuit UTC (le changement d'heure ne compte pas). */
export const nombreDeNuits = (debut: Date, fin: Date) => Math.round((fin.getTime() - debut.getTime()) / DAY_MS);

export function dureeSejour(debut: Date, fin: Date) {
  const nuits = nombreDeNuits(debut, fin);
  const semaines = Math.floor(nuits / 7);
  const joursRestants = nuits % 7;
  return {
    nuits,
    /** Semaines d'hébergement facturées : les semaines entières, une au minimum. */
    semainesFacturees: Math.max(1, semaines),
    /** Semaines facturées pour un supplément hebdomadaire. */
    semainesSupplements: joursRestants > 4 ? semaines + 1 : semaines,
  };
}

const SAMEDI = 6;

/** Week-end : arrivée un samedi, départ le dimanche (1 nuit). L'hébergement est alors le forfait week-end. */
export const estUnWeekEnd = (debut: Date, fin: Date) =>
  debut.getUTCDay() === SAMEDI && nombreDeNuits(debut, fin) === 1;

/** Premier jour de chaque semaine facturée : celle-ci prend le tarif de sa première nuit. */
export function debutsDesSemaines(debut: Date, fin: Date): Date[] {
  const { semainesFacturees } = dureeSejour(debut, fin);
  return Array.from({ length: semainesFacturees }, (_, i) => ajouterJours(debut, 7 * i));
}

export type LigneSupplement = { type: SupplementType; nb: number; tarif: number };

export function montantSupplement({ type, nb, tarif }: LigneSupplement, debut: Date, fin: Date): number {
  const { nuits, semainesSupplements } = dureeSejour(debut, fin);
  switch (type) {
    case SupplementType.SEJOUR:
      return arrondi(tarif * nb);
    case SupplementType.HEBDOMADAIRE:
      return arrondi(tarif * nb * semainesSupplements);
    case SupplementType.QUOTIDIEN:
      return arrondi(tarif * nb * nuits);
  }
}

export type SejourAChiffrer = {
  debut: Date;
  fin: Date;
  adultes: number;
  /** Prix de chaque semaine facturée, dans l'ordre (voir `debutsDesSemaines`). */
  prixSemaines: number[];
  /** Taxe de séjour par adulte et par nuit. */
  taxeSejour: number;
  supplements: LigneSupplement[];
};

export function chiffrerSejour({ debut, fin, adultes, prixSemaines, taxeSejour, supplements }: SejourAChiffrer) {
  const { nuits } = dureeSejour(debut, fin);
  const hebergement = arrondi(prixSemaines.reduce((somme, prix) => somme + prix, 0));
  const taxe = arrondi(adultes * taxeSejour * nuits);
  const montantsSupplements = supplements.map((ligne) => montantSupplement(ligne, debut, fin));
  const totalSupplements = arrondi(montantsSupplements.reduce((somme, montant) => somme + montant, 0));
  const sousTotal = arrondi(hebergement + totalSupplements);
  return {
    hebergement,
    taxeSejour: taxe,
    montantsSupplements,
    totalSupplements,
    /** Hébergement et suppléments, sans la taxe de séjour (reversée à la commune). */
    sousTotal,
    total: arrondi(sousTotal + taxe),
  };
}

/**
 * Total d'une réservation enregistrée : son prix par semaine (0 s'il n'est pas encore fixé),
 * sa taxe de séjour et les prix de suppléments enregistrés avec elle.
 */
export function totalReservation(reservation: {
  debut: Date;
  fin: Date;
  adultes: number;
  tarif: number | null;
  taxeSejour: number;
  supplements: { nb: number; tarif: number; supplement: { type: SupplementType } }[];
}): number {
  const { semainesFacturees } = dureeSejour(reservation.debut, reservation.fin);
  return chiffrerSejour({
    debut: reservation.debut,
    fin: reservation.fin,
    adultes: reservation.adultes,
    prixSemaines: Array.from({ length: semainesFacturees }, () => reservation.tarif ?? 0),
    taxeSejour: reservation.taxeSejour,
    supplements: reservation.supplements.map(({ nb, tarif, supplement }) => ({ type: supplement.type, nb, tarif })),
  }).total;
}

/** Acompte sur le séjour hors taxe de séjour, au centime. */
export const montantAcompte = (sousTotal: number, pourcentage: number) => arrondi((sousTotal * pourcentage) / 100);

type Periode = { debut: Date; fin: Date };

/** Une période couvre les nuits de son `debut` (inclus) à son `fin` (jour de départ, exclu). */
export const couvreLaNuit = (periode: Periode, nuit: Date) =>
  periode.debut.getTime() <= nuit.getTime() && nuit.getTime() < periode.fin.getTime();

export const seChevauchent = (a: Periode, b: Periode) =>
  a.debut.getTime() < b.fin.getTime() && b.debut.getTime() < a.fin.getTime();

const FORMAT_JOUR_MOIS = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', timeZone: 'UTC' });
const FORMAT_COMPLET = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** « Du 2 mai au 4 juillet 2026 », ou « Du 19 décembre 2026 au 2 janvier 2027 » d'une année sur l'autre. */
export function libellePeriode({ debut, fin }: Periode): string {
  const memeAnnee = debut.getUTCFullYear() === fin.getUTCFullYear();
  const premier = (memeAnnee ? FORMAT_JOUR_MOIS : FORMAT_COMPLET).format(debut).replace(/^1 /, '1er ');
  const dernier = FORMAT_COMPLET.format(fin).replace(/^1 /, '1er ');
  return `Du ${premier} au ${dernier}`;
}
