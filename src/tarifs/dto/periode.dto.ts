import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { ArrayMaxSize, IsArray, IsDate, ValidateNested } from 'class-validator'
import { IsAfter } from 'src/common/validation'

/** Période d'application d'un tarif : les nuits du `debut` (inclus) au `fin` (jour de départ, exclu). */
export class PeriodeDto {

  constructor(debut: Date, fin: Date) {
    this.debut = debut;
    this.fin = fin;
  }

  @ApiProperty({ description: 'Première nuit de la période', type: String, format: 'date' })
  @Type(() => Date)
  @IsDate()
  readonly debut: Date

  @ApiProperty({ description: 'Jour de départ de la dernière nuit (exclu), après le début', type: String, format: 'date' })
  @Type(() => Date)
  @IsDate()
  @IsAfter('debut')
  readonly fin: Date
}

/** Décorateurs du champ `periodes` des DTO de tarif. */
export function IsPeriodes() {
  return (object: object, propertyName: string) => {
    IsArray()(object, propertyName)
    ArrayMaxSize(100)(object, propertyName)
    ValidateNested({ each: true })(object, propertyName)
    Type(() => PeriodeDto)(object, propertyName)
  }
}
