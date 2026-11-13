// src/users/users.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, ConflictException, ParseIntPipe } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Prisma } from '@prisma/client';
import { ApiBody, ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from '../auth/auth.service';
import { AuthUser, CurrentUser, Public } from '../auth/public.decorator';
import { hashPassword } from '../auth/password';
import { LoginDto } from '../auth/dto/login.dto';
import { ThrottleLogin } from '../common/throttle';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) { }

  @Post()
  @ApiOperation({ summary: "Create a user" })
  @ApiBody({ type: CreateUserDto })
  async create(@Body() createUserDto: CreateUserDto) {
    const { email, password } = createUserDto;
    const payload: Prisma.UserCreateInput = { email, password: await hashPassword(password) }
    return this.usersService.create(payload);
  }

  @Public()
  @ThrottleLogin()
  @Post('login')
  @ApiOperation({ summary: "Login & get JWT" })
  @ApiBody({ type: LoginDto })
  async login(@Body() body: LoginDto) {
    const user = await this.authService.validateUser(body.email, body.password);
    const access_token = this.authService.signToken({ id: user.id, email: user.email });
    return { user, access_token };
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
