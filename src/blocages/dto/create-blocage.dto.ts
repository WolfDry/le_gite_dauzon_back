import { ApiProperty } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import { IsDate, IsOptional, IsString, MaxLength } from 'class-validator'
import { IsAfter } from 'src/common/validation'

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value)

/** Dates bloquées : les nuits du `debut` (inclus) au `fin` (jour de départ, exclu), comme un séjour. */
export class CreateBlocageDto {

  constructor(debut: Date, fin: Date, motif?: string | null) {
    this.debut = debut;
    this.fin = fin;
    this.motif = motif;
  }

  @ApiProperty({ description: 'Première nuit bloquée', type: String, format: 'date' })
  @Type(() => Date)
  @IsDate()
  readonly debut: Date

  @ApiProperty({ description: 'Jour où le gîte redevient libre (exclu), après le début', type: String, format: 'date' })
  @Type(() => Date)
  @IsDate()
  @IsAfter('debut')
  readonly fin: Date

  @ApiProperty({ description: 'Motif interne, jamais montré sur le site (vide : aucun)', required: false, nullable: true, type: String })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  readonly motif?: string | null
}
