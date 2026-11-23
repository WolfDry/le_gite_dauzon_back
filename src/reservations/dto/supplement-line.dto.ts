import { ApiProperty } from '@nestjs/swagger'
import { IsInt, IsOptional, Min } from 'class-validator'
import { IsMontant } from 'src/common/validation'

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

  @ApiProperty({ description: 'Prix unitaire en euros pour cette réservation (par défaut : prix actuel du supplément)', required: false })
  @IsOptional()
  @IsMontant()
  readonly tarif?: number
}
