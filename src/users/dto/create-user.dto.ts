import { ApiProperty } from "@nestjs/swagger";

export class CreateUserDto {

  @ApiProperty({ description: 'User email' })
  readonly email: string;

  @ApiProperty({ description: 'User password' })
  readonly password: string;
}