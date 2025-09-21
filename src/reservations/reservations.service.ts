import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ReservationsService {
  constructor(private prisma: PrismaService) { }

  async create(data: Prisma.ReservationCreateInput) {
    try {
      return await this.prisma.reservation.create({ data });
    } catch (error) {
      throw error;
    }
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
    return this.prisma.reservation.findUnique({
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

  update(id: number, dto: {
    debut?: string,
    fin?: string,
    tarif?: number,
    verif?: boolean,
    nbPersonne?: {
      label: string
      nb: number
    }[],
    clientId?: number,
    client?: {
      email?: string,
      nom?: string,
      prenom?: string,
      telephone?: string
    },
    supplements?: { supplementId: number; nb: number; }[],
    disconnectClient?: boolean
  }) {
    const data: Prisma.ReservationUpdateInput = {
      debut: dto.debut ? new Date(dto.debut) : undefined,
      fin: dto.fin ? new Date(dto.fin) : undefined,
      tarif: dto.tarif,
      verif: dto.verif,
      nbPersonne: dto.nbPersonne as unknown as Prisma.InputJsonValue,
      client: (dto.clientId || dto.client || dto.disconnectClient) ? {
        connect: dto.clientId ? { id: dto.clientId } : undefined,
        update: dto.client ? {
          email: dto.client.email,
          nom: dto.client.nom,
          prenom: dto.client.prenom,
          telephone: dto.client.telephone,
        } : undefined,
        disconnect: dto.disconnectClient ? true : undefined,
      } : undefined,
    };

    return this.prisma.reservation.update({ where: { id }, data });
  }

  remove(id: number) {
    return this.prisma.reservation.delete({ where: { id } });
  }
}