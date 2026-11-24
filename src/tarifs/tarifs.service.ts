import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { Prisma, TarifFrequence } from '@prisma/client';
import { libellePeriode, seChevauchent } from 'src/tarification/calcul';
import { CreateTarifsDto } from './dto/create-tarifs.dto';
import { UpdateTarifsDto } from './dto/update-tarifs.dto';
import { PeriodeDto } from './dto/periode.dto';

const INCLUDE_PERIODES = {
  periodes: { select: { id: true, debut: true, fin: true }, orderBy: { debut: 'asc' } },
} satisfies Prisma.TarifInclude;

type TarifAvecPeriodes = Prisma.TarifGetPayload<{ include: typeof INCLUDE_PERIODES }>;

const DATE_FR = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC' });

@Injectable()
export class TarifsService {
  constructor (private prisma: PrismaService) { }

  /**
   * `date` renvoyé : le texte des périodes datées qui ne sont pas terminées (« Du 2 mai au 4 juillet 2026 »),
   * ou, pour un tarif sans période datée, l'ancien texte libre. Le site public l'affiche tel quel.
   */
  private avecTexte({ periodes, date, ...tarif }: TarifAvecPeriodes, maintenant = new Date()) {
    const aujourdhui = Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), maintenant.getUTCDate());
    return {
      ...tarif,
      date: periodes.length > 0
        ? periodes.filter((p) => p.fin.getTime() > aujourdhui).map(libellePeriode)
        : date,
      periodes,
    };
  }

  /** Refuse des périodes qui se chevauchent, entre elles ou avec celles d'un autre tarif. */
  private async verifierPeriodes(periodes: PeriodeDto[], tarifId?: number) {
    const triees = [...periodes].sort((a, b) => a.debut.getTime() - b.debut.getTime());
    for (let i = 1; i < triees.length; i++) {
      if (seChevauchent(triees[i - 1], triees[i])) {
        throw new BadRequestException([
          `Les périodes ${this.texte(triees[i - 1])} et ${this.texte(triees[i])} se chevauchent`,
        ]);
      }
    }
    if (periodes.length === 0) return;

    const conflit = await this.prisma.tarifPeriode.findFirst({
      where: {
        ...(tarifId !== undefined && { tarifId: { not: tarifId } }),
        OR: periodes.map(({ debut, fin }) => ({ debut: { lt: fin }, fin: { gt: debut } })),
      },
      select: { debut: true, fin: true, tarif: { select: { label: true } } },
    });
    if (conflit) {
      throw new BadRequestException([
        `La période ${this.texte(conflit)} du tarif « ${conflit.tarif.label.trim()} » chevauche une période saisie : une nuit ne peut avoir qu'un tarif`,
      ]);
    }
  }

  /** Les périodes et le tarif par défaut servent au calcul de l'hébergement à la semaine. */
  private verifierFrequence(frequence: TarifFrequence[], aDesPeriodes: boolean, parDefaut: boolean) {
    if ((aDesPeriodes || parDefaut) && !frequence.includes(TarifFrequence.SEMAINE)) {
      throw new BadRequestException([
        'Seul un prix à la semaine peut avoir des périodes ou être le tarif par défaut',
      ]);
    }
  }

  /** Un seul tarif par défaut : en marquer un retire la marque des autres, dans la même transaction. */
  private async avecDefautUnique<T>(parDefaut: boolean | undefined, ecriture: Prisma.PrismaPromise<T>, exceptId?: number): Promise<T> {
    if (parDefaut !== true) return ecriture;
    const [, resultat] = await this.prisma.$transaction([
      this.prisma.tarif.updateMany({
        where: { parDefaut: true, ...(exceptId !== undefined && { id: { not: exceptId } }) },
        data: { parDefaut: false },
      }),
      ecriture,
    ]);
    return resultat;
  }

  private texte({ debut, fin }: { debut: Date; fin: Date }) {
    return `du ${DATE_FR.format(debut)} au ${DATE_FR.format(fin)}`;
  }

  /** Des périodes datées remplacent l'ancien texte libre. */
  private donneesPeriodes(periodes: PeriodeDto[] | undefined, date: string[] | undefined) {
    if (periodes === undefined) return { date };
    return {
      date: periodes.length > 0 ? [] : date,
      periodes: periodes.map(({ debut, fin }) => ({ debut, fin })),
    };
  }

  async create({ periodes, date, ...dto }: CreateTarifsDto) {
    this.verifierFrequence(dto.frequence, (periodes?.length ?? 0) > 0, dto.parDefaut === true);
    await this.verifierPeriodes(periodes ?? []);
    const donnees = this.donneesPeriodes(periodes, date ?? []);
    const tarif = await this.avecDefautUnique(
      dto.parDefaut,
      this.prisma.tarif.create({
        data: {
          ...dto,
          date: donnees.date,
          periodes: donnees.periodes && { create: donnees.periodes },
        },
        include: INCLUDE_PERIODES,
      }),
    );
    return this.avecTexte(tarif);
  }

  async findAll() {
    const tarifs = await this.prisma.tarif.findMany({ include: INCLUDE_PERIODES, orderBy: { id: 'asc' } });
    return tarifs.map((tarif) => this.avecTexte(tarif));
  }

  async findOne(id: number) {
    const tarif = await this.prisma.tarif.findUniqueOrThrow({ where: { id }, include: INCLUDE_PERIODES });
    return this.avecTexte(tarif);
  }

  /** `periodes` absent : les périodes ne changent pas. Présent (même vide) : elles remplacent les anciennes. */
  async update(id: number, { periodes, date, ...dto }: UpdateTarifsDto) {
    if (dto.frequence !== undefined || periodes !== undefined || dto.parDefaut !== undefined) {
      const actuel = await this.prisma.tarif.findUniqueOrThrow({
        where: { id },
        select: { frequence: true, parDefaut: true, _count: { select: { periodes: true } } },
      });
      this.verifierFrequence(
        dto.frequence ?? actuel.frequence,
        periodes !== undefined ? periodes.length > 0 : actuel._count.periodes > 0,
        dto.parDefaut ?? actuel.parDefaut,
      );
    }
    if (periodes) await this.verifierPeriodes(periodes, id);
    const donnees = this.donneesPeriodes(periodes, date);
    const tarif = await this.avecDefautUnique(
      dto.parDefaut,
      this.prisma.tarif.update({
        where: { id },
        data: {
          ...dto,
          date: donnees.date,
          periodes: donnees.periodes && { deleteMany: {}, create: donnees.periodes },
        },
        include: INCLUDE_PERIODES,
      }),
      id,
    );
    return this.avecTexte(tarif);
  }

  remove(id: number) {
    return this.prisma.tarif.delete({ where: { id } });
  }
}
