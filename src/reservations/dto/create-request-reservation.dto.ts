import { ApiProperty } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import { ArrayMaxSize, IsArray, IsDate, IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator'
import { HasAtLeastOnePerson, IsAfter } from 'src/common/validation'
import { NbPersonneDto } from './nb-personne.dto'

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value)

export class CreateRequestReservationDto {

  constructor(debut: Date, fin: Date, nbPersonne: NbPersonneDto[], nom: string, email: string, phone: string, message?: string) {
    this.debut = debut;
    this.fin = fin;
    this.nbPersonne = nbPersonne;
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

  @ApiProperty({ description: 'Téléphone du demandeur' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  readonly phone: string

  @ApiProperty({ description: 'Message libre du demandeur', required: false })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  readonly message?: string

  @ApiProperty({ description: 'Nombre de personnes par catégorie', type: [NbPersonneDto] })
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => NbPersonneDto)
  @HasAtLeastOnePerson()
  readonly nbPersonne: NbPersonneDto[]
}
