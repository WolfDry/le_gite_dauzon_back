import { ApiProperty } from "@nestjs/swagger"

export class CreateReservationDto {
  
  @ApiProperty({ description: 'Price of a reservation' })
  readonly tarif: number
  
  @ApiProperty({ description: 'Start date of a reservation' })
  readonly debut: Date

  @ApiProperty({ description: 'End date of a reservation' })
  readonly fin: Date
  
  @ApiProperty({ description: 'Number of personne in a reservation' })
  readonly nbPersonne: number

  @ApiProperty({ description: 'Client related to a reservation' })
  readonly clientId: number
  
  @ApiProperty({ description: 'Last name of the client (if no clientId)' })
  readonly nom?: string
  
  @ApiProperty({ description: 'First name of the client (if no clientId)' })
  readonly prenom?: string
  
  @ApiProperty({ description: 'Email of the client (if no clientId)' })
  readonly email?: string
  
  @ApiProperty({ description: 'Phone number of the client (if no clientId)' })
  readonly telephone?: string
  
  @ApiProperty({ description: 'Is the reservation verifed' })
  readonly verif: boolean
}