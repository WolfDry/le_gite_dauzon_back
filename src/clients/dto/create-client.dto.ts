import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString, MaxLength } from "class-validator";
import { IsTelephone } from "src/common/validation";

export class CreateClientDto {

  constructor(email: string, nom: string, prenom: string, telephone: string) {
    this.email = email;
    this.nom = nom;
    this.prenom = prenom;
    this.telephone = telephone;
  }

  @ApiProperty({ description: 'Client email' })
  @IsEmail()
  @MaxLength(254)
  readonly email: string;

  @ApiProperty({ description: 'Client last name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  readonly nom: string;

  @ApiProperty({ description: 'Client first name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  readonly prenom: string;

  @ApiProperty({ description: 'Client phone number (tout format, au moins 6 chiffres)' })
  @IsTelephone()
  readonly telephone: string;
}
