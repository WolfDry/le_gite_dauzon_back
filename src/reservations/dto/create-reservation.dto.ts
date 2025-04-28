export class CreateReservationDto {
  readonly tarif: number;
  readonly debut: Date;
  readonly fin: Date;
  readonly nbPersonne: number;
  readonly clientId: number;
  readonly nom?: string;
  readonly prenom?: string;
  readonly email?: string;
  readonly telephone?: string;
}