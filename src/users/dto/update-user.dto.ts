import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto extends PartialType(CreateUserDto) {

  @ApiProperty({ description: 'User email' })
  readonly email?: string;

  @ApiProperty({ description: 'User password' })
  readonly password?: string;
}