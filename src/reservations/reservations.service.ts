import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { Prisma } from '@prisma/client';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { toNbPersonneJson } from './dto/nb-personne.dto';

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


  findDisponibilites(depuis: Date) {
    return this.prisma.reservation.findMany({
      where: { verif: true, fin: { gte: depuis } },
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

  update(id: number, dto: Omit<UpdateReservationDto, 'supplements'>) {
    const data: Prisma.ReservationUpdateInput = {
      debut: dto.debut,
      fin: dto.fin,
      tarif: dto.tarif,
      verif: dto.verif,
      nbPersonne: dto.nbPersonne ? toNbPersonneJson(dto.nbPersonne) : undefined,
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