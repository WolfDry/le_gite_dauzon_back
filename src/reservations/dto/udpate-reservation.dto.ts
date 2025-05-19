export class UpdateReservationDto {
  readonly tarif?: number
  readonly debut?: Date
  readonly fin?: Date
  readonly nbPersonne?: number
  readonly clientId?: number
  readonly verif?: boolean
}