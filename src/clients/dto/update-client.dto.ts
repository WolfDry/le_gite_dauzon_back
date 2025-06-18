import { ApiProperty } from "@nestjs/swagger";

export class UpdateClientDto {

  @ApiProperty({ description: 'User email' })
  readonly email?: string;

  @ApiProperty({ description: 'User last name' })
  readonly nom?: string;
  
  @ApiProperty({ description: 'User first name' })
  readonly prenom?: string;
  
  @ApiProperty({ description: 'User phone number' })
  readonly telephone?: string;
}