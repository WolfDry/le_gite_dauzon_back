import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsArray, IsDate, IsOptional, ValidateNested } from 'class-validator'
import { IsAfter, IsMontant, IsNbVoyageurs } from 'src/common/validation'
import { SupplementLineDto } from 'src/reservations/dto/supplement-line.dto'

export class DevisDto {

  constructor(debut: Date, fin: Date) {
    this.debut = debut;
    this.fin = fin;
  }

  @ApiProperty({ description: "Date d'arrivée", type: String, format: 'date' })
  @Type(() => Date)
  @IsDate()
  readonly debut: Date

  @ApiProperty({ description: 'Date de départ (après la date d’arrivée)', type: String, format: 'date' })
  @Type(() => Date)
  @IsDate()
  @IsAfter('debut')
  readonly fin: Date

  @ApiProperty({ description: 'Nombre d’adultes, qui paient la taxe de séjour (0 par défaut)', required: false })
  @IsOptional()
  @IsNbVoyageurs()
  readonly adultes?: number

  @ApiProperty({ description: 'Nombre d’enfants (0 par défaut)', required: false })
  @IsOptional()
  @IsNbVoyageurs()
  readonly enfants?: number

  @ApiProperty({
    description: 'Nombre d’animaux (0 par défaut). Sans `supplements`, ajoute le supplément facturé par animal, comme une demande du site',
    required: false,
  })
  @IsOptional()
  @IsNbVoyageurs()
  readonly animaux?: number

  @ApiProperty({
    description: "Prix de l'hébergement par semaine, celui d'une réservation (par défaut : le tarif de la période de chaque semaine)",
    required: false,
  })
  @IsOptional()
  @IsMontant()
  readonly tarif?: number

  @ApiProperty({
    description: 'Taxe de séjour par adulte et par nuit, celle d’une réservation (par défaut : celle des réglages)',
    required: false,
  })
  @IsOptional()
  @IsMontant()
  readonly taxeSejour?: number

  @ApiProperty({ description: 'Suppléments choisis', type: [SupplementLineDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SupplementLineDto)
  readonly supplements?: SupplementLineDto[]
}
