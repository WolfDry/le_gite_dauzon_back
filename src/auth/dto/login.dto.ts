import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {

  constructor(email: string, password: string) {
    this.email = email;
    this.password = password;
  }

  @ApiProperty({ description: 'User email' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(254)
  readonly email: string;

  @ApiProperty({ description: 'User password' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  readonly password: string;
}
