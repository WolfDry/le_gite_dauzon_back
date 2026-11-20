// src/users/users.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, ConflictException, ParseIntPipe } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Prisma } from '@prisma/client';
import { ApiBody, ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../auth/public.decorator';
import { hashPassword } from '../auth/password';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Post()
  @ApiOperation({ summary: "Create a user (admin only)" })
  @ApiBody({ type: CreateUserDto })
  async create(@Body() createUserDto: CreateUserDto) {
    const { email, password } = createUserDto;
    const payload: Prisma.UserCreateInput = { email, password: await hashPassword(password) }
    return this.usersService.create(payload);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: "Update a user (the password is hashed)" })
  @ApiBody({ type: UpdateUserDto })
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateUserDto: UpdateUserDto) {
    const { email, password } = updateUserDto
    const payload: Prisma.UserUpdateInput = {
      email,
      password: password !== undefined ? await hashPassword(password) : undefined,
    }
    return this.usersService.update(id, payload);
  }

  @Delete(':id')
  @ApiOperation({ summary: "Delete a user (neither your own account nor the last one)" })
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: AuthUser) {
    if (currentUser.userId === id) {
      throw new ConflictException('Vous ne pouvez pas supprimer votre propre compte');
    }
    if ((await this.usersService.count()) <= 1) {
      throw new ConflictException('Impossible de supprimer le dernier compte');
    }
    return this.usersService.remove(id);
  }
}
