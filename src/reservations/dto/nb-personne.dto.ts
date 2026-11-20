import { ApiProperty } from '@nestjs/swagger'
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator'

export class NbPersonneDto {

  constructor(label: string, nb: number) {
    this.label = label;
    this.nb = nb;
  }

  @ApiProperty({ description: 'Catégorie (Adultes, Enfants, Animaux…)', example: 'Adultes' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  readonly label: string

  @ApiProperty({ description: 'Nombre', example: 2 })
  @IsInt()
  @Min(0)
  readonly nb: number
}

export class SupplementLineDto {

  constructor(supplementId: number, nb: number, tarif?: number) {
    this.supplementId = supplementId;
    this.nb = nb;
    this.tarif = tarif;
  }

  @ApiProperty({ description: 'Identifiant du supplément' })
  @IsInt()
  readonly supplementId: number

  @ApiProperty({ description: 'Quantité' })
  @IsInt()
  @Min(1)
  readonly nb: number

  @ApiProperty({ description: 'Prix unitaire pour cette réservation (par défaut : prix actuel du supplément)', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  readonly tarif?: number
}

/** Copie en objets simples, pour le champ JSON `nbPersonne` de Prisma. */
export const toNbPersonneJson = (items: NbPersonneDto[]) => items.map(({ label, nb }) => ({ label, nb }))
