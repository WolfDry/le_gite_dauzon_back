import { Controller, Get, Headers, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma.service';
import { Public } from '../auth/public.decorator';
import { ReservationsService } from '../reservations/reservations.service';

@Public()
@Controller('cron')
export class CronController {
  private readonly logger = new Logger(CronController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reservationsService: ReservationsService,
    private readonly config: ConfigService,
  ) { }

  @Get()
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;

      return { status: 'ok' };
    } catch (err) {
      return { status: 'error', message: err.message };
    }
  }

  @Get('purge-demandes')
  @ApiExcludeEndpoint()
  async purgeDemandes(@Headers('authorization') authorization?: string) {
    const secret = this.config.get<string>('CRON_SECRET');
    if (!secret) {
      this.logger.warn('CRON_SECRET non défini : purge des demandes impossible');
      throw new UnauthorizedException();
    }
    if (!authorization || !sameText(authorization, `Bearer ${secret}`)) {
      throw new UnauthorizedException();
    }

    const { count } = await this.reservationsService.purgeDemandes();
    this.logger.log(`Purge des demandes : ${count} supprimée(s)`);
    return { supprimees: count };
  }
}

function sameText(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
