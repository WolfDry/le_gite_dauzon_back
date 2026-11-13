import { Injectable, HttpException, HttpStatus, forwardRef, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { verifyPassword } from './password';

type JwtPayload = { sub: number; email: string };

@Injectable()
export class AuthService {
  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly jwt: JwtService,
  ) { }

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmailWithPassword(email);
    if (!user) {
      throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
    }
    const ok = await verifyPassword(password, user.password);
    if (!ok) {
      throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
    }
    const { password: _pw, ...safe } = user;
    return safe;
  }

  signToken(user: { id: number; email: string }) {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    return this.jwt.sign(payload);
  }
}
