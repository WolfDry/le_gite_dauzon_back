import { ApiProperty } from '@nestjs/swagger'
import { IsInt, IsOptional, Max, Min } from 'class-validator'
import { IsMontant, MAX_VOYAGEURS } from 'src/common/validation'

export class UpdateReglagesDto {
  @ApiProperty({ description: 'Taxe de séjour par adulte et par nuit, en euros', required: false })
  @IsOptional()
  @IsMontant()
  readonly taxeSejour?: number

  @ApiProperty({ description: 'Nombre maximal de voyageurs (adultes et enfants)', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_VOYAGEURS)
  readonly capacite?: number

  @ApiProperty({ description: 'Premier mois de la saison (1 à 12)', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  readonly saisonDebut?: number

  @ApiProperty({ description: 'Dernier mois de la saison (1 à 12), inclus', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  readonly saisonFin?: number

  @ApiProperty({ description: 'Acompte, en pourcentage du séjour hors taxe de séjour (0 à 100)', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  readonly acomptePourcentage?: number
}
