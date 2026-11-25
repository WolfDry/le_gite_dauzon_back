import { ApiProperty } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import { IsDate, IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator'
import { IsAfter, IsNbVoyageurs, IsTelephone } from 'src/common/validation'
import { AntiBotDto } from 'src/common/anti-bot'

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value)

export class CreateRequestReservationDto extends AntiBotDto {

  constructor(debut: Date, fin: Date, adultes: number, nom: string, email: string, phone: string, message?: string, enfants?: number, animaux?: number) {
    super();
    this.debut = debut;
    this.fin = fin;
    this.adultes = adultes;
    this.enfants = enfants;
    this.animaux = animaux;
    this.nom = nom;
    this.email = email;
    this.phone = phone;
    this.message = message;
  }

  @ApiProperty({ description: "Date d'arrivée", type: String, format: 'date' })
  @Type(() => Date)
  @IsDate()
  readonly debut: Date

  @ApiProperty({ description: 'Date de départ (après la date d’arrivée)', type: String, format: 'date' })
  @Type(() => Date)
  @IsDate()
  @IsAfter('debut')
  readonly fin: Date

  @ApiProperty({ description: 'Prénom et nom du demandeur' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  readonly nom: string

  @ApiProperty({ description: 'E-mail du demandeur' })
  @Transform(trim)
  @IsEmail()
  @MaxLength(254)
  readonly email: string

  @ApiProperty({ description: 'Téléphone du demandeur (tout format, au moins 6 chiffres)' })
  @Transform(trim)
  @IsTelephone()
  readonly phone: string

  @ApiProperty({ description: 'Message libre du demandeur', required: false })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  readonly message?: string

  @ApiProperty({ description: 'Nombre d’adultes (au moins 1)' })
  @IsNbVoyageurs(1)
  readonly adultes: number

  @ApiProperty({ description: 'Nombre d’enfants (0 par défaut)', required: false })
  @IsOptional()
  @IsNbVoyageurs()
  readonly enfants?: number

  @ApiProperty({ description: 'Nombre d’animaux (0 par défaut)', required: false })
  @IsOptional()
  @IsNbVoyageurs()
  readonly animaux?: number
}
