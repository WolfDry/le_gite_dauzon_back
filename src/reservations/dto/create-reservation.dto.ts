import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator'
import { IsAfter } from 'src/common/validation'
import { NbPersonneDto, SupplementLineDto } from './nb-personne.dto'

const isNewClient = (dto: CreateReservationDto) => dto.clientId === null || dto.clientId === undefined

export class CreateReservationDto {

  constructor(tarif: number, debut: Date, fin: Date, nbPersonne: NbPersonneDto[], clientId?: number | null, nom?: string, prenom?: string, email?: string, telephone?: string, verif?: boolean, supplements?: SupplementLineDto[]) {
    this.tarif = tarif;
    this.debut = debut;
    this.fin = fin;
    this.nbPersonne = nbPersonne;
    this.clientId = clientId;
    this.nom = nom;
    this.prenom = prenom;
    this.email = email;
    this.telephone = telephone;
    this.verif = verif;
    this.supplements = supplements;
  }

  @ApiProperty({ description: 'Prix du séjour (0 accepté)' })
  @IsInt()
  @Min(0)
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

  @ApiProperty({ description: 'Nombre de personnes par catégorie', type: [NbPersonneDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NbPersonneDto)
  readonly nbPersonne: NbPersonneDto[]

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
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  readonly telephone?: string

  @ApiProperty({ description: 'Réservation confirmée', required: false })
  @IsOptional()
  @IsBoolean()
  readonly verif?: boolean

  @ApiProperty({ description: 'Suppléments rattachés à la réservation', type: [SupplementLineDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SupplementLineDto)
  readonly supplements?: SupplementLineDto[]
}
