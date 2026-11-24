import { BadRequestException, Injectable } from '@nestjs/common';
import { SupplementType, TarifFrequence } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { SupplementLineDto } from 'src/reservations/dto/supplement-line.dto';
import {
  arrondi,
  chiffrerSejour,
  couvreLaNuit,
  debutsDesSemaines,
  dureeSejour,
  estUnWeekEnd,
  montantAcompte,
} from './calcul';
import { DevisDto } from './dto/devis.dto';
import { ReglagesService } from './reglages.service';

/** Au-delà, le devis est refusé : aucun séjour ne dure plus d'un an. */
export const MAX_NUITS_DEVIS = 366;

type TarifDeLaPeriode = { id: number; label: string; prix: number };

const SELECT_TARIF = { id: true, label: true, prix: true } as const;

type LigneDevis = { supplementId: number; label: string; type: SupplementType; nb: number; tarif: number };

@Injectable()
export class DevisService {
  constructor(
    private prisma: PrismaService,
    private reglagesService: ReglagesService,
  ) { }

  async devis(dto: DevisDto) {
    const { debut, fin } = dto;
    const { nuits, semainesFacturees } = dureeSejour(debut, fin);
    if (nuits > MAX_NUITS_DEVIS) {
      throw new BadRequestException([`Le séjour ne peut pas dépasser ${MAX_NUITS_DEVIS} nuits`]);
    }

    const [reglages, forfaitWeekEnd, lignes] = await Promise.all([
      this.reglagesService.get(),
      estUnWeekEnd(debut, fin) ? this.tarifWeekEnd() : Promise.resolve(null),
      this.lignesSupplements(dto),
    ]);
    const semaines = forfaitWeekEnd
      ? [{ debut, tarif: forfaitWeekEnd }]
      : await this.tarifsDesSemaines(debut, fin);

    // Tarif proposé : celui des périodes, si chaque semaine en a un (moyenne si le séjour change de saison).
    const complet = semaines.every((s) => s.tarif !== null);
    const tarifPropose = complet
      ? arrondi(semaines.reduce((somme, s) => somme + (s.tarif?.prix ?? 0), 0) / semaines.length)
      : null;
    const prixSemaines = dto.tarif !== undefined
      ? semaines.map(() => dto.tarif as number)
      : semaines.map((s) => s.tarif?.prix ?? 0);

    const adultes = dto.adultes ?? 0;
    const voyageurs = adultes + (dto.enfants ?? 0);
    const taux = dto.taxeSejour ?? reglages.taxeSejour;
    const prix = chiffrerSejour({ debut, fin, adultes, prixSemaines, taxeSejour: taux, supplements: lignes });

    return {
      nuits,
      semainesFacturees,
      /** Tarif de la période de chaque semaine facturée (`null` : aucune période ne couvre sa première nuit). */
      semaines,
      /** Vrai pour un séjour du samedi au dimanche : l'hébergement est le forfait week-end. */
      weekEnd: forfaitWeekEnd !== null,
      tarifPropose,
      /** Faux si l'hébergement suit les périodes et qu'une semaine n'a pas de tarif : il est alors incomplet. */
      complet: dto.tarif !== undefined || complet,
      hebergement: prix.hebergement,
      taxeSejour: { taux, montant: prix.taxeSejour },
      supplements: lignes.map((ligne, i) => ({ ...ligne, montant: prix.montantsSupplements[i] })),
      totalSupplements: prix.totalSupplements,
      sousTotal: prix.sousTotal,
      total: prix.total,
      acompte: {
        pourcentage: reglages.acomptePourcentage,
        montant: montantAcompte(prix.sousTotal, reglages.acomptePourcentage),
      },
      capacite: { max: reglages.capacite, voyageurs, depassee: voyageurs > reglages.capacite },
    };
  }

  /**
   * Chaque semaine facturée prend le tarif à la semaine de la période qui couvre sa première nuit,
   * sinon le tarif par défaut (la basse saison).
   */
  private async tarifsDesSemaines(debut: Date, fin: Date): Promise<{ debut: Date; tarif: TarifDeLaPeriode | null }[]> {
    const debuts = debutsDesSemaines(debut, fin);
    const aLaSemaine = { frequence: { has: TarifFrequence.SEMAINE } };
    const [periodes, parDefaut] = await Promise.all([
      this.prisma.tarifPeriode.findMany({
        where: { debut: { lte: debuts[debuts.length - 1] }, fin: { gt: debuts[0] }, tarif: aLaSemaine },
        select: { debut: true, fin: true, tarif: { select: SELECT_TARIF } },
        orderBy: { debut: 'asc' },
      }),
      this.prisma.tarif.findFirst({ where: { parDefaut: true, ...aLaSemaine }, select: SELECT_TARIF }),
    ]);
    return debuts.map((nuit) => ({
      debut: nuit,
      tarif: periodes.find((periode) => couvreLaNuit(periode, nuit))?.tarif ?? parDefaut,
    }));
  }

  /** Forfait week-end : le premier prix de fréquence « week-end ». */
  private tarifWeekEnd(): Promise<TarifDeLaPeriode | null> {
    return this.prisma.tarif.findFirst({
      where: { frequence: { has: TarifFrequence.WEEKEND } },
      select: SELECT_TARIF,
      orderBy: { id: 'asc' },
    });
  }

  /**
   * Suppléments choisis, au prix envoyé ou à celui du catalogue. Sans liste de suppléments,
   * le supplément facturé par animal est ajouté pour les animaux, comme pour une demande du site.
   */
  private async lignesSupplements(dto: DevisDto): Promise<LigneDevis[]> {
    const select = { id: true, label: true, type: true, tarif: true } as const;

    if (dto.supplements === undefined) {
      const animaux = dto.animaux ?? 0;
      if (animaux === 0) return [];
      const parAnimal = await this.prisma.supplement.findFirst({ where: { parAnimal: true }, select });
      return parAnimal
        ? [{ supplementId: parAnimal.id, label: parAnimal.label, type: parAnimal.type, nb: animaux, tarif: parAnimal.tarif }]
        : [];
    }

    const lines: SupplementLineDto[] = dto.supplements;
    const ids = [...new Set(lines.map((l) => l.supplementId))];
    const catalogue = ids.length ? await this.prisma.supplement.findMany({ where: { id: { in: ids } }, select }) : [];
    const parId = new Map(catalogue.map((s) => [s.id, s]));

    const inconnus = ids.filter((id) => !parId.has(id));
    if (inconnus.length) {
      throw new BadRequestException([`Supplément introuvable : ${inconnus.join(', ')}`]);
    }

    return lines.map(({ supplementId, nb, tarif }) => {
      const supplement = parId.get(supplementId)!;
      return { supplementId, label: supplement.label, type: supplement.type, nb, tarif: tarif ?? supplement.tarif };
    });
  }
}
