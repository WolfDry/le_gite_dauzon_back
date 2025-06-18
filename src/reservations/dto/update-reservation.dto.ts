import { ApiProperty } from "@nestjs/swagger"

export class UpdateReservationDto {
  
  @ApiProperty({ description: 'Price of a reservation' })
  readonly tarif?: number
  
  @ApiProperty({ description: 'Start date of a reservation' })
  readonly debut?: Date
  
  @ApiProperty({ description: 'End date of a reservation' })
  readonly fin?: Date
  
  @ApiProperty({ description: 'Number of personne of a reservation' })
  readonly nbPersonne?: number
  
  @ApiProperty({ description: 'Client related to a reservation' })
  readonly clientId?: number
  
  @ApiProperty({ description: 'Is the reservation verifed' })
  readonly verif?: boolean
}