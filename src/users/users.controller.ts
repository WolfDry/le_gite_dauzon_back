// src/users/users.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, HttpException, HttpStatus, UnauthorizedException, UseGuards } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Prisma } from '@prisma/client';
import { ApiBody, ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from '../auth/auth.service';
import { AuthGuard } from '@nestjs/passport';
import { AuthUser, CurrentUser, Public } from '../auth/public.decorator';

class LoginDto { email!: string; password!: string; }

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) { }

  @Public()
  @Post()
  @ApiOperation({ summary: "Create a user (JWT required, except for the very first user)" })
  @ApiBody({ type: CreateUserDto })
  @ApiBearerAuth()
  async create(@Body() createUserDto: CreateUserDto, @CurrentUser() currentUser: AuthUser | null) {
    if (!currentUser && (await this.usersService.count()) > 0) {
      throw new UnauthorizedException();
    }
    const { email, password } = createUserDto;
    if (!email) throw new HttpException("Missing 'email'", HttpStatus.BAD_REQUEST);
    if (!password) throw new HttpException("Missing 'password'", HttpStatus.BAD_REQUEST);
    const hash = bcrypt.hashSync(`${process.env.SECRET_SALT}${password}`, 10);
    const payload: Prisma.UserCreateInput = { email, password: hash }
    return this.usersService.create(payload);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: "Login & get JWT" })
  @ApiBody({ type: LoginDto })
  async login(@Body() body: LoginDto) {
    const user = await this.authService.validateUser(body.email, body.password);
    const access_token = this.authService.signToken({ id: user.id, email: user.email });
    return { user, access_token };
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: "Update a user" })
  @ApiBody({ type: UpdateUserDto })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    const payload: Prisma.UserUpdateInput = { ...updateUserDto }
    return this.usersService.update(+id, payload);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
