import { ApiProperty } from "@nestjs/swagger"
import { TarifFrequence } from "@prisma/client"

export class UpdateTarifsDto {

  @ApiProperty({ description: 'Description of a tarif' })
  readonly desc?: string

  @ApiProperty({ description: 'Label of a tarif' })
  readonly label?: string

  @ApiProperty({ description: 'Start date of a tarif' })
  readonly start_date?: Date[]

  @ApiProperty({ description: 'End date of a tarif' })
  readonly end_date?: Date[]

  @ApiProperty({ description: 'Tarif is during vacance' })
  readonly vacance?: boolean

  @ApiProperty({ description: 'Price of a tarif' })
  readonly prix?: number

  @ApiProperty({ description: 'Frequency of a tarif' })
  readonly frequence?: TarifFrequence[]
}