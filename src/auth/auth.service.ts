import { Injectable, HttpException, HttpStatus, forwardRef, Inject } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

type JwtPayload = { sub: number; email: string };

@Injectable()
export class AuthService {
  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly jwt: JwtService,
  ) { }

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
    }
    const ok = await bcrypt.compare(`${process.env.SECRET_SALT}${password}`, user.password);
    if (!ok) {
      throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
    }
    const { password: _pw, ...safe } = user as any;
    return safe;
  }

  signToken(user: { id: number; email: string }) {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    return this.jwt.sign(payload);
  }
}
