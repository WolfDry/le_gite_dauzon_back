import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { ArrayMaxSize, IsArray, IsDate, IsEmail, IsNotEmpty, IsString, MaxLength, ValidateNested } from 'class-validator'
import { HasAtLeastOnePerson, IsAfter } from 'src/common/validation'
import { NbPersonneDto } from './nb-personne.dto'

export class CreateRequestReservationDto {

  constructor(debut: Date, fin: Date, nbPersonne: NbPersonneDto[], email: string, phone: string) {
    this.debut = debut;
    this.fin = fin;
    this.nbPersonne = nbPersonne;
    this.email = email;
    this.phone = phone;
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

  @ApiProperty({ description: 'E-mail du demandeur' })
  @IsEmail()
  @MaxLength(254)
  readonly email: string

  @ApiProperty({ description: 'Téléphone du demandeur' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  readonly phone: string

  @ApiProperty({ description: 'Nombre de personnes par catégorie', type: [NbPersonneDto] })
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => NbPersonneDto)
  @HasAtLeastOnePerson()
  readonly nbPersonne: NbPersonneDto[]
}
