import { ApiProperty } from "@nestjs/swagger"

export class CreateRequestReservationDto {

  @ApiProperty({ description: 'Start date of a reservation' })
  readonly debut: Date

  @ApiProperty({ description: 'End date of a reservation' })
  readonly fin: Date

  @ApiProperty({ description: 'End date of a reservation' })
  readonly email: string

  @ApiProperty({ description: 'End date of a reservation' })
  readonly phone: string

  @ApiProperty({ description: 'Number of personne in a reservation' })
  readonly nbPersonne: {
    label: string
    nb: number
  }[]

  @ApiProperty({ description: 'Is the reservation verifed' })
  readonly verif: boolean
}