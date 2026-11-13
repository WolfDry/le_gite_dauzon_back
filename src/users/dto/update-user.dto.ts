import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PASSWORD_MIN_LENGTH } from './create-user.dto';

export class UpdateUserDto {

  @ApiProperty({ description: 'User email', required: false })
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  readonly email?: string;

  @ApiProperty({ description: `New password (${PASSWORD_MIN_LENGTH} characters minimum), hashed before saving`, required: false })
  @IsOptional()
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(72)
  readonly password?: string;
}
