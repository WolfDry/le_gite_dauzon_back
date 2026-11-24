import { BadRequestException, Injectable } from '@nestjs/common';
import { Reglages } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { UpdateReglagesDto } from './dto/update-reglages.dto';

export type ValeursReglages = Omit<Reglages, 'id'>;

/** Valeurs créées par la migration, utilisées si la ligne de réglages a disparu. */
export const REGLAGES_PAR_DEFAUT: ValeursReglages = {
  taxeSejour: 1.65,
  capacite: 5,
  saisonDebut: 4,
  saisonFin: 9,
  acomptePourcentage: 30,
};

/** Les réglages tiennent sur une seule ligne. */
const REGLAGES_ID = 1;

@Injectable()
export class ReglagesService {
  constructor(private prisma: PrismaService) { }

  async get(): Promise<ValeursReglages> {
    const reglages = await this.prisma.reglages.findUnique({ where: { id: REGLAGES_ID } });
    if (!reglages) return { ...REGLAGES_PAR_DEFAUT };
    const { id: _id, ...valeurs } = reglages;
    return valeurs;
  }

  async update(dto: UpdateReglagesDto): Promise<ValeursReglages> {
    const actuels = await this.get();
    const saisonDebut = dto.saisonDebut ?? actuels.saisonDebut;
    const saisonFin = dto.saisonFin ?? actuels.saisonFin;
    if (saisonFin < saisonDebut) {
      throw new BadRequestException(['Le dernier mois de la saison ne peut pas précéder le premier']);
    }

    // Le DTO transformé contient aussi les champs absents (`undefined`) : on ne garde que ceux envoyés.
    const envoyes = Object.fromEntries(
      Object.entries(dto).filter(([, valeur]) => valeur !== undefined),
    ) as Partial<ValeursReglages>;
    const { id: _id, ...valeurs } = await this.prisma.reglages.upsert({
      where: { id: REGLAGES_ID },
      create: { ...REGLAGES_PAR_DEFAUT, ...envoyes, id: REGLAGES_ID },
      update: envoyes,
    });
    return valeurs;
  }
}
