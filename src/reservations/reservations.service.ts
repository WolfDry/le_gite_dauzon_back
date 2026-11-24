import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { Prisma, ReservationSource, ReservationStatut } from '@prisma/client';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { CreateRequestReservationDto } from './dto/create-request-reservation.dto';
import { SupplementLineDto } from './dto/supplement-line.dto';
import { ListReservationsQueryDto } from './dto/list-reservations-query.dto';
import { ReglagesService } from 'src/tarification/reglages.service';
import { totalReservation } from 'src/tarification/calcul';
import { BlocagesService } from 'src/blocages/blocages.service';

export type PricedSupplementLine = { supplementId: number; nb: number; tarif: number };

export const STATUTS_BLOQUANTS: ReservationStatut[] = [ReservationStatut.OPTION, ReservationStatut.CONFIRMEE];

/**
 * Délai de conservation des demandes sans suite, en jours :
 * - une demande refusée (ou un spam refusé) est supprimée ce délai après son refus ;
 * - une demande jamais traitée est supprimée ce délai après la date de départ demandée.
 * L'admin affiche ce délai : le changer aussi dans admin/src/features/reservations/status.ts.
 */
export const PURGE_DELAI_JOURS = 90;

const DAY_MS = 86_400_000;

/** "2026-07-04T00:00:00.000Z" -> "04/07/2026". */
const jour = (date: Date) => date.toISOString().slice(0, 10).split('-').reverse().join('/');

/** Liste de l'admin : tableau, calendrier, totaux. Sans message, ni téléphone du client, ni dates de suivi. */
export const SELECT_LISTE = {
  id: true,
  tarif: true,
  debut: true,
  fin: true,
  adultes: true,
  enfants: true,
  taxeSejour: true,
  statut: true,
  source: true,
  demandeurNom: true,
  demandeurEmail: true,
  demandeurTelephone: true,
  clientId: true,
  client: { select: { id: true, nom: true, prenom: true, email: true } },
  supplements: {
    select: {
      supplementId: true,
      nb: true,
      tarif: true,
      supplement: { select: { id: true, label: true, type: true } },
    },
  },
} satisfies Prisma.ReservationSelect;

/** Aperçu : de quoi placer un séjour sur un calendrier, le nommer ou le compter. */
export const SELECT_APERCU = {
  id: true,
  debut: true,
  fin: true,
  statut: true,
  demandeurNom: true,
  clientId: true,
  client: { select: { id: true, nom: true, prenom: true } },
} satisfies Prisma.ReservationSelect;

@Injectable()
export class ReservationsService {
  constructor(
    private prisma: PrismaService,
    private reglagesService: ReglagesService,
    private blocagesService: BlocagesService,
  ) { }

  /** La taxe de séjour est celle des réglages au moment de l'enregistrement. */
  async create(data: Omit<Prisma.ReservationCreateInput, 'supplements' | 'taxeSejour'>, supplements: PricedSupplementLine[] = []) {
    if (data.statut && STATUTS_BLOQUANTS.includes(data.statut)) {
      await this.verifierChevauchement(new Date(data.debut), new Date(data.fin));
    }
    const { taxeSejour } = await this.reglagesService.get();
    return this.prisma.reservation.create({
      data: {
        ...data,
        taxeSejour,
        supplements: supplements.length ? { create: this.toSupplementsCreate(supplements) } : undefined,
      },
    });
  }

  /**
   * Demande du site, toujours au statut DEMANDE. Si le visiteur indique des animaux, le supplément
   * facturé par animal (s'il existe) est ajouté avec ce nombre, au prix actuel du catalogue.
   */
  async createRequest(dto: CreateRequestReservationDto) {
    await this.verifierDisponibilite(dto.debut, dto.fin);
    const animaux = dto.animaux ?? 0;
    const supplementAnimal = animaux > 0
      ? await this.prisma.supplement.findFirst({ where: { parAnimal: true }, select: { id: true, tarif: true } })
      : null;
    const { taxeSejour } = await this.reglagesService.get();

    return this.prisma.reservation.create({
      data: {
        debut: dto.debut,
        fin: dto.fin,
        adultes: dto.adultes,
        enfants: dto.enfants ?? 0,
        animaux,
        taxeSejour,
        statut: ReservationStatut.DEMANDE,
        source: ReservationSource.SITE,
        demandeurNom: dto.nom,
        demandeurEmail: dto.email,
        demandeurTelephone: dto.phone,
        message: dto.message || null,
        ...(supplementAnimal && {
          supplements: {
            create: this.toSupplementsCreate([{ supplementId: supplementAnimal.id, nb: animaux, tarif: supplementAnimal.tarif }]),
          },
        }),
      },
    });
  }

  /**
   * Refuse (409) un séjour qui partage une nuit avec une option, un séjour confirmé ou des dates bloquées :
   * ce sont les périodes affichées comme réservées sur le site. Les séjours peuvent se suivre.
   */
  private async verifierDisponibilite(debut: Date, fin: Date) {
    const [reservation, blocage] = await Promise.all([
      this.findChevauchement(debut, fin),
      this.blocagesService.findChevauchement(debut, fin),
    ]);
    if (reservation || blocage) {
      throw new ConflictException('Ces dates ne sont plus disponibles');
    }
  }

  /**
   * Première option ou réservation confirmée qui partage au moins une nuit avec [debut, fin), ou `null`.
   * Les séjours peuvent se suivre : départ le jour d'une arrivée, et inversement.
   */
  private findChevauchement(debut: Date, fin: Date, exceptId?: number) {
    return this.prisma.reservation.findFirst({
      where: {
        statut: { in: STATUTS_BLOQUANTS },
        debut: { lt: fin },
        fin: { gt: debut },
        ...(exceptId !== undefined && { id: { not: exceptId } }),
      },
      select: { debut: true, fin: true, demandeurNom: true, client: { select: { nom: true, prenom: true } } },
      orderBy: { debut: 'asc' },
    });
  }

  /**
   * deux options ou réservations confirmées ne se chevauchent pas (409). Les dates bloquées
   * ne sont pas contrôlées ici : l'admin peut louer pendant ses propres dates bloquées, il est seulement averti.
   */
  private async verifierChevauchement(debut: Date, fin: Date, exceptId?: number) {
    const conflit = await this.findChevauchement(debut, fin, exceptId);
    if (conflit) {
      const nom = conflit.client ? `${conflit.client.prenom} ${conflit.client.nom}`.trim() : conflit.demandeurNom;
      throw new ConflictException(
        `Ces dates chevauchent ${nom ? `la réservation de ${nom}` : 'une autre réservation'} (du ${jour(conflit.debut)} au ${jour(conflit.fin)}). Annulez ou déplacez-la d'abord, ou gardez celle-ci en demande.`,
      );
    }
  }

  /**
   * Complète chaque ligne avec son prix : celui envoyé par l'admin, sinon le prix actuel du supplément.
   * À appeler avant d'écrire la réservation, pour refuser un supplément inconnu sans rien enregistrer.
   */
  async priceSupplements(lines: SupplementLineDto[]): Promise<PricedSupplementLine[]> {
    const missing = [...new Set(lines.filter((l) => l.tarif === undefined).map((l) => l.supplementId))];
    const catalogue = missing.length
      ? await this.prisma.supplement.findMany({ where: { id: { in: missing } }, select: { id: true, tarif: true } })
      : [];
    const prices = new Map(catalogue.map((s) => [s.id, s.tarif]));

    const unknown = missing.filter((id) => !prices.has(id));
    if (unknown.length) {
      throw new BadRequestException([`Supplément introuvable : ${unknown.join(', ')}`]);
    }

    return lines.map(({ supplementId, nb, tarif }) => ({
      supplementId,
      nb,
      tarif: tarif ?? (prices.get(supplementId) as number),
    }));
  }

  /**
   * Lignes de suppléments au format d'une écriture imbriquée Prisma : la réservation et ses suppléments
   * sont enregistrés par une seule requête, donc tout ou rien.
   */
  private toSupplementsCreate(lines: PricedSupplementLine[]): Prisma.SupplementOnReservationCreateWithoutReservationInput[] {
    return lines.map(({ supplementId, nb, tarif }) => ({
      supplement: { connect: { id: supplementId } },
      nb,
      tarif,
    }));
  }

  /**
   * Périodes indisponibles pour le site : options, séjours confirmés et dates bloquées (B-F8),
   * triées par début. Dates seules : le site ne distingue pas un blocage d'un séjour.
   */
  async findDisponibilites(depuis: Date) {
    const [reservations, blocages] = await Promise.all([
      this.prisma.reservation.findMany({
        where: { statut: { in: STATUTS_BLOQUANTS }, fin: { gte: depuis } },
        select: { debut: true, fin: true },
        orderBy: { debut: 'asc' },
      }),
      this.blocagesService.findDates(depuis),
    ]);
    return [...reservations, ...blocages].sort((a, b) => a.debut.getTime() - b.debut.getTime());
  }

  /**
   * Réservations qui touchent la période [depuis, jusqua], bornes incluses (le jour de départ compte),
   * triées par date d'arrivée. Sans filtre : tout l'historique.
   * La vue `liste` ajoute le `total` de chaque réservation, calculé avec la règle de prix du gîte.
   */
  async findAll({ depuis, jusqua, statut, vue = 'liste' }: ListReservationsQueryDto = {}) {
    const where: Prisma.ReservationWhereInput = {};
    if (depuis) where.fin = { gte: depuis };
    if (jusqua) where.debut = { lte: jusqua };
    if (statut?.length) where.statut = { in: statut };
    const orderBy: Prisma.ReservationOrderByWithRelationInput[] = [{ debut: 'asc' }, { id: 'asc' }];

    if (vue === 'apercu') {
      return this.prisma.reservation.findMany({ where, select: SELECT_APERCU, orderBy });
    }
    const reservations = await this.prisma.reservation.findMany({ where, select: SELECT_LISTE, orderBy });
    return reservations.map((reservation) => ({ ...reservation, total: totalReservation(reservation) }));
  }


  findOne(id: number) {
    return this.prisma.reservation.findUniqueOrThrow({
      include: {
        client: true,
        supplements: {
          include: {
            supplement: true
          }
        }
      },
      where: { id },
    });
  }

  /**
   * `supplements` absent : les suppléments ne changent pas. Présent (même vide) : ils remplacent les anciens,
   * dans la même requête que la modification de la réservation.
   */
  async update(id: number, dto: Omit<UpdateReservationDto, 'supplements'>, supplements?: PricedSupplementLine[]) {
    const current = await this.prisma.reservation.findUniqueOrThrow({
      where: { id },
      select: { statut: true, clientId: true, tarif: true, debut: true, fin: true },
    });

    // Le DTO ne compare debut et fin que s'ils sont envoyés ensemble : on complète avec les dates enregistrées.
    if (dto.debut || dto.fin) {
      const debut = dto.debut ?? current.debut;
      const fin = dto.fin ?? current.fin;
      if (debut instanceof Date && fin instanceof Date && fin.getTime() <= debut.getTime()) {
        throw new BadRequestException(['fin doit être postérieure à debut']);
      }
    }

    const connectId = typeof dto.clientId === 'number' ? dto.clientId : undefined;
    const createClient = connectId === undefined ? dto.newClient : undefined;
    const detach = connectId === undefined && !createClient && (dto.clientId === null || dto.disconnectClient === true);

    const statut = dto.statut ?? current.statut;
    // Contrôlé quand les dates changent ou quand le séjour devient bloquant : modifier autre chose
    // (suppléments, client…) reste possible sur un séjour déjà enregistré avant ce contrôle.
    const change = (nouvelle: Date | undefined, ancienne: Date) => !!nouvelle && nouvelle.getTime() !== ancienne?.getTime();
    const datesChangent = change(dto.debut, current.debut) || change(dto.fin, current.fin);
    if (STATUTS_BLOQUANTS.includes(statut) && (datesChangent || !STATUTS_BLOQUANTS.includes(current.statut))) {
      await this.verifierChevauchement(dto.debut ?? current.debut, dto.fin ?? current.fin, id);
    }
    if (STATUTS_BLOQUANTS.includes(statut)) {
      const hasClient = connectId !== undefined || !!createClient || (current.clientId !== null && !detach);
      const hasTarif = dto.tarif !== undefined ? dto.tarif !== null : current.tarif !== null;
      if (!hasClient || !hasTarif) {
        throw new BadRequestException([
          'Une option ou une réservation confirmée doit avoir un client et un tarif',
        ]);
      }
    }

    const client: Prisma.ClientUpdateOneWithoutReservationsNestedInput = {};
    if (connectId !== undefined) client.connect = { id: connectId };
    else if (createClient) client.create = { ...createClient };
    else if (detach) client.disconnect = true;
    if (dto.client && current.clientId !== null && connectId === undefined && !createClient && !detach) {
      client.update = {
        email: dto.client.email,
        nom: dto.client.nom,
        prenom: dto.client.prenom,
        telephone: dto.client.telephone,
      };
    }

    const data: Prisma.ReservationUpdateInput = {
      debut: dto.debut,
      fin: dto.fin,
      tarif: dto.tarif,
      adultes: dto.adultes,
      enfants: dto.enfants,
      animaux: dto.animaux,
      client: Object.keys(client).length > 0 ? client : undefined,
      supplements: supplements ? { deleteMany: {}, create: this.toSupplementsCreate(supplements) } : undefined,
    };
    if (dto.statut && dto.statut !== current.statut) {
      data.statut = dto.statut;
      data.statutModifieLe = new Date();
    }

    return this.prisma.reservation.update({ where: { id }, data });
  }

  remove(id: number) {
    return this.prisma.reservation.delete({ where: { id } });
  }

  purgeDemandes(now: Date = new Date()) {
    const limite = new Date(now.getTime() - PURGE_DELAI_JOURS * DAY_MS);
    return this.prisma.reservation.deleteMany({
      where: {
        OR: [
          { statut: ReservationStatut.REFUSEE, statutModifieLe: { lt: limite } },
          { statut: ReservationStatut.DEMANDE, fin: { lt: limite } },
        ],
      },
    });
  }
}
