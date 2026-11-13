import { Controller, Post, Body } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import { LoginDto } from './dto/login.dto';
import { ThrottleLogin } from '../common/throttle';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) { }

  @Public()
  @ThrottleLogin()
  @Post('login')
  @ApiOperation({ summary: 'Login & get JWT' })
  @ApiBody({ type: LoginDto })
  async login(@Body() body: LoginDto) {
    const user = await this.auth.validateUser(body.email, body.password);
    const access_token = this.auth.signToken({ id: user.id, email: user.email });
    return { user, access_token };
  }
}
