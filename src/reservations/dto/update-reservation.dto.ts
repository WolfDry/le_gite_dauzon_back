import { ApiProperty } from "@nestjs/swagger"

export class UpdateReservationDto {

  @ApiProperty({ description: 'Price of a reservation' })
  readonly tarif?: number | null

  @ApiProperty({ description: 'Start date of a reservation' })
  readonly debut?: Date

  @ApiProperty({ description: 'End date of a reservation' })
  readonly fin?: Date

  @ApiProperty({ description: 'Number of personne of a reservation' })
  readonly nbPersonne?: {
    label: string
    nb: number
  }[]

  @ApiProperty({ description: 'Client related to a reservation' })
  readonly clientId?: number

  @ApiProperty({ description: 'Is the reservation verifed' })
  readonly verif?: boolean

  @ApiProperty({
    description: 'Supplements to attach to the reservation',
    type: [Object],
    required: false
  })
  readonly supplements?: { supplementId: number; nb: number; }[]

  @ApiProperty({ description: 'Client related to a reservation' })
  readonly client?: {
    email?: string
    nom?: string
    prenom?: string
    telephone?: string
  }

  @ApiProperty({ description: 'Whether to disconnect the client from the reservation', required: false })
  readonly disconnectClient?: boolean
}
