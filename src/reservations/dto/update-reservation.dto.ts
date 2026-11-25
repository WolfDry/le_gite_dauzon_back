import { ApiProperty } from '@nestjs/swagger'
import { ReservationStatut } from '@prisma/client'
import { Type } from 'class-transformer'
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator'
import { IsAfter, IsMontant, IsNbVoyageurs, IsTelephone } from 'src/common/validation'
import { SupplementLineDto } from './supplement-line.dto'

export class UpdateReservationClientDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  readonly email?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  readonly nom?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  readonly prenom?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsTelephone()
  readonly telephone?: string
}

export class NewReservationClientDto {

  constructor(email: string, nom: string, prenom: string, telephone: string) {
    this.email = email
    this.nom = nom
    this.prenom = prenom
    this.telephone = telephone
  }

  @ApiProperty()
  @IsEmail()
  @MaxLength(254)
  readonly email: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  readonly nom: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  readonly prenom: string

  @ApiProperty()
  @IsTelephone()
  readonly telephone: string
}

export class UpdateReservationDto {

  @ApiProperty({ description: 'Prix du séjour par semaine, en euros (0 accepté, null pour une demande non chiffrée)', required: false, nullable: true })
  @IsOptional()
  @IsMontant()
  readonly tarif?: number | null

  @ApiProperty({ description: "Date d'arrivée", type: String, format: 'date', required: false })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  readonly debut?: Date

  @ApiProperty({ description: 'Date de départ (après la date d’arrivée)', type: String, format: 'date', required: false })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  @IsAfter('debut')
  readonly fin?: Date

  @ApiProperty({ description: 'Nombre d’adultes', required: false })
  @IsOptional()
  @IsNbVoyageurs()
  readonly adultes?: number

  @ApiProperty({ description: 'Nombre d’enfants', required: false })
  @IsOptional()
  @IsNbVoyageurs()
  readonly enfants?: number

  @ApiProperty({ description: 'Nombre d’animaux', required: false })
  @IsOptional()
  @IsNbVoyageurs()
  readonly animaux?: number

  @ApiProperty({ description: 'Client existant à rattacher (null pour détacher le client)', required: false, nullable: true })
  @IsOptional()
  @IsInt()
  readonly clientId?: number | null

  @ApiProperty({ description: 'Statut de la réservation (OPTION et CONFIRMEE exigent un client et un tarif)', enum: ReservationStatut, required: false })
  @IsOptional()
  @IsEnum(ReservationStatut)
  readonly statut?: ReservationStatut

  @ApiProperty({ description: 'Suppléments (remplacent les suppléments existants)', type: [SupplementLineDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SupplementLineDto)
  readonly supplements?: SupplementLineDto[]

  @ApiProperty({ description: 'Coordonnées du client rattaché', type: UpdateReservationClientDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateReservationClientDto)
  readonly client?: UpdateReservationClientDto

  @ApiProperty({ description: 'Crée une fiche client et la rattache (ignoré si clientId est fourni)', type: NewReservationClientDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => NewReservationClientDto)
  readonly newClient?: NewReservationClientDto

  @ApiProperty({ description: 'Détacher le client de la réservation', required: false })
  @IsOptional()
  @IsBoolean()
  readonly disconnectClient?: boolean
}
