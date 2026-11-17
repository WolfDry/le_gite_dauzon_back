import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { Prisma, ReservationSource, ReservationStatut } from '@prisma/client';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { CreateRequestReservationDto } from './dto/create-request-reservation.dto';
import { toNbPersonneJson } from './dto/nb-personne.dto';

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

  create(data: Prisma.ReservationCreateInput) {
    return this.prisma.reservation.create({ data });
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

  async addSupplementToReservation(reservationId: number, { supplementId, nb }: { supplementId: number; nb: number }) {
    return this.prisma.supplementOnReservation.create({
      data: {
        reservationId,
        supplementId,
        nb
      }
    })
  }

  async clearSupplements(reservationId: number) {
    return this.prisma.supplementOnReservation.deleteMany({
      where: { reservationId }
    })
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

  async update(id: number, dto: Omit<UpdateReservationDto, 'supplements'>) {
    const current = await this.prisma.reservation.findUniqueOrThrow({
      where: { id },
      select: { statut: true, clientId: true, tarif: true },
    });

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
