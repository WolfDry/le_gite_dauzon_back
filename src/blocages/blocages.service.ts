import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateBlocageDto } from './dto/create-blocage.dto';
import { UpdateBlocageDto } from './dto/update-blocage.dto';
import { ListBlocagesQueryDto } from './dto/list-blocages-query.dto';

const jour = (date: Date) => date.toISOString().slice(0, 10).split('-').reverse().join('/');

@Injectable()
export class BlocagesService {
  constructor(private prisma: PrismaService) { }

  /** Blocages qui touchent la période [depuis, jusqua], bornes incluses, triés par début. Sans filtre : tous. */
  findAll({ depuis, jusqua }: ListBlocagesQueryDto = {}) {
    const where: Prisma.BlocageWhereInput = {};
    if (depuis) where.fin = { gte: depuis };
    if (jusqua) where.debut = { lte: jusqua };
    return this.prisma.blocage.findMany({ where, orderBy: [{ debut: 'asc' }, { id: 'asc' }] });
  }

  /** Dates seules (sans le motif), pour la route publique des disponibilités. */
  findDates(depuis: Date) {
    return this.prisma.blocage.findMany({
      where: { fin: { gte: depuis } },
      select: { debut: true, fin: true },
      orderBy: { debut: 'asc' },
    });
  }

  findOne(id: number) {
    return this.prisma.blocage.findUniqueOrThrow({ where: { id } });
  }

  async create({ debut, fin, motif }: CreateBlocageDto) {
    await this.verifierChevauchement(debut, fin);
    return this.prisma.blocage.create({ data: { debut, fin, motif: motif || null } });
  }

  async update(id: number, dto: UpdateBlocageDto) {
    const current = await this.prisma.blocage.findUniqueOrThrow({ where: { id }, select: { debut: true, fin: true } });
    const debut = dto.debut ?? current.debut;
    const fin = dto.fin ?? current.fin;
    // Le DTO ne compare debut et fin que s'ils sont envoyés ensemble : on complète avec les dates enregistrées.
    if (fin.getTime() <= debut.getTime()) {
      throw new BadRequestException(['fin doit être postérieure à debut']);
    }
    if (dto.debut || dto.fin) await this.verifierChevauchement(debut, fin, id);

    return this.prisma.blocage.update({
      where: { id },
      data: {
        debut: dto.debut,
        fin: dto.fin,
        ...(dto.motif !== undefined && { motif: dto.motif || null }),
      },
    });
  }

  remove(id: number) {
    return this.prisma.blocage.delete({ where: { id } });
  }

  /** Premier blocage qui partage au moins une nuit avec [debut, fin), ou `null`. Les périodes peuvent se suivre. */
  findChevauchement(debut: Date, fin: Date, exceptId?: number) {
    return this.prisma.blocage.findFirst({
      where: {
        debut: { lt: fin },
        fin: { gt: debut },
        ...(exceptId !== undefined && { id: { not: exceptId } }),
      },
      select: { debut: true, fin: true },
    });
  }

  /** Deux blocages ne se chevauchent pas ; ils peuvent se suivre (fin de l'un = début de l'autre). */
  private async verifierChevauchement(debut: Date, fin: Date, exceptId?: number) {
    const conflit = await this.findChevauchement(debut, fin, exceptId);
    if (conflit) {
      throw new BadRequestException([
        `Ces dates chevauchent des dates déjà bloquées (du ${jour(conflit.debut)} au ${jour(conflit.fin)})`,
      ]);
    }
  }
}
