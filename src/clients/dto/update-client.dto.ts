import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { IsTelephone } from "src/common/validation";

export class UpdateClientDto {

  @ApiProperty({ description: 'Client email', required: false })
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  readonly email?: string;

  @ApiProperty({ description: 'Client last name', required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  readonly nom?: string;

  @ApiProperty({ description: 'Client first name', required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  readonly prenom?: string;

  @ApiProperty({ description: 'Client phone number (tout format, au moins 6 chiffres)', required: false })
  @IsOptional()
  @IsTelephone()
  readonly telephone?: string;
}
