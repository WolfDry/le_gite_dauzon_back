import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";

export const PASSWORD_MIN_LENGTH = 8;

export class CreateUserDto {

  constructor(email: string, password: string) {
    this.email = email;
    this.password = password;
  }

  @ApiProperty({ description: 'User email' })
  @IsEmail()
  @MaxLength(254)
  readonly email: string;

  @ApiProperty({ description: `User password (${PASSWORD_MIN_LENGTH} characters minimum)` })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(72)
  readonly password: string;
}
