import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { Prisma, ReservationSource, ReservationStatut } from '@prisma/client';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { CreateRequestReservationDto } from './dto/create-request-reservation.dto';
import { SupplementLineDto, toNbPersonneJson } from './dto/nb-personne.dto';

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

@Injectable()
export class ReservationsService {
  constructor(private prisma: PrismaService) { }

  create(data: Omit<Prisma.ReservationCreateInput, 'supplements'>, supplements: PricedSupplementLine[] = []) {
    return this.prisma.reservation.create({
      data: {
        ...data,
        supplements: supplements.length ? { create: this.toSupplementsCreate(supplements) } : undefined,
      },
    });
  }

  createRequest(dto: CreateRequestReservationDto) {
    return this.prisma.reservation.create({
      data: {
        debut: dto.debut,
        fin: dto.fin,
        nbPersonne: toNbPersonneJson(dto.nbPersonne),
        statut: ReservationStatut.DEMANDE,
        source: ReservationSource.SITE,
        demandeurNom: dto.nom,
        demandeurEmail: dto.email,
        demandeurTelephone: dto.phone,
        message: dto.message || null,
      },
    });
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

  findDisponibilites(depuis: Date) {
    return this.prisma.reservation.findMany({
      where: { statut: { in: STATUTS_BLOQUANTS }, fin: { gte: depuis } },
      select: { debut: true, fin: true },
      orderBy: { debut: 'asc' },
    });
  }

  findAll() {
    return this.prisma.reservation.findMany({
      include: {
        client: true,
        supplements: {
          include: {
            supplement: true
          }
        }
      }
    });
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
      nbPersonne: dto.nbPersonne ? toNbPersonneJson(dto.nbPersonne) : undefined,
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
