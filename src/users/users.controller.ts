import { Controller, Get, Post, Body, Patch, Param, Delete, HttpException, HttpStatus } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Prisma } from '@prisma/client';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Post()
  @ApiOperation({ summary: "Create a user" })
  @ApiBody({ type: CreateUserDto })
  async create(@Body() createUserDto: CreateUserDto) {
    const { email, password } = createUserDto;
    if (!email) {
      throw new HttpException("Missing 'email' property for user creation", HttpStatus.BAD_REQUEST);
    }
    if (!password) {
      throw new HttpException("Missing 'password' property for user creation", HttpStatus.BAD_REQUEST);
    }
    const hash = bcrypt.hashSync(`${process.env.SECRET_SALT}${password}`, 10);
    const payload: Prisma.UserCreateInput = { email, password: hash }

    const result = await this.usersService.create(payload);
    return result;

  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: "Update a reservation" })
  @ApiBody({ type: UpdateUserDto })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {

    const payload: Prisma.UserUpdateInput = { ...updateUserDto }
    return this.usersService.update(+id, payload);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}