import { ApiProperty } from '@nestjs/swagger'
import { ReservationStatut } from '@prisma/client'
import { Type } from 'class-transformer'
import {
  IsArray,
  IsDate,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator'
import { IsAfter, IsMontant, IsNbVoyageurs, IsTelephone } from 'src/common/validation'
import { SupplementLineDto } from './supplement-line.dto'

const isNewClient = (dto: CreateReservationDto) => dto.clientId === null || dto.clientId === undefined

export class CreateReservationDto {

  constructor(tarif: number, debut: Date, fin: Date, clientId?: number | null, nom?: string, prenom?: string, email?: string, telephone?: string, statut?: ReservationStatut, supplements?: SupplementLineDto[], adultes?: number, enfants?: number, animaux?: number) {
    this.tarif = tarif;
    this.debut = debut;
    this.fin = fin;
    this.adultes = adultes;
    this.enfants = enfants;
    this.animaux = animaux;
    this.clientId = clientId;
    this.nom = nom;
    this.prenom = prenom;
    this.email = email;
    this.telephone = telephone;
    this.statut = statut;
    this.supplements = supplements;
  }

  @ApiProperty({ description: 'Prix du séjour par semaine, en euros (0 accepté)' })
  @IsMontant()
  readonly tarif: number

  @ApiProperty({ description: "Date d'arrivée", type: String, format: 'date' })
  @Type(() => Date)
  @IsDate()
  readonly debut: Date

  @ApiProperty({ description: 'Date de départ (après la date d’arrivée)', type: String, format: 'date' })
  @Type(() => Date)
  @IsDate()
  @IsAfter('debut')
  readonly fin: Date

  @ApiProperty({ description: 'Nombre d’adultes (0 par défaut)', required: false })
  @IsOptional()
  @IsNbVoyageurs()
  readonly adultes?: number

  @ApiProperty({ description: 'Nombre d’enfants (0 par défaut)', required: false })
  @IsOptional()
  @IsNbVoyageurs()
  readonly enfants?: number

  @ApiProperty({ description: 'Nombre d’animaux (0 par défaut)', required: false })
  @IsOptional()
  @IsNbVoyageurs()
  readonly animaux?: number

  @ApiProperty({ description: 'Client existant ; sinon un client est créé avec les champs ci-dessous', required: false, nullable: true })
  @IsOptional()
  @IsInt()
  readonly clientId?: number | null

  @ApiProperty({ description: 'Nom du client (si pas de clientId)', required: false })
  @ValidateIf(isNewClient)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  readonly nom?: string

  @ApiProperty({ description: 'Prénom du client (si pas de clientId)', required: false })
  @ValidateIf(isNewClient)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  readonly prenom?: string

  @ApiProperty({ description: 'E-mail du client (si pas de clientId)', required: false })
  @ValidateIf(isNewClient)
  @IsEmail()
  @MaxLength(254)
  readonly email?: string

  @ApiProperty({ description: 'Téléphone du client (si pas de clientId)', required: false })
  @ValidateIf(isNewClient)
  @IsTelephone()
  readonly telephone?: string

  @ApiProperty({ description: 'Statut (CONFIRMEE par défaut pour une réservation saisie dans l’admin)', enum: ReservationStatut, required: false })
  @IsOptional()
  @IsEnum(ReservationStatut)
  readonly statut?: ReservationStatut

  @ApiProperty({ description: 'Suppléments rattachés à la réservation', type: [SupplementLineDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SupplementLineDto)
  readonly supplements?: SupplementLineDto[]
}
