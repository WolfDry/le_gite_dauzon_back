import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Controller('cron')
export class CronController {
  constructor(private readonly prisma: PrismaService) { }

  @Get()
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;

      return { status: 'ok' };
    } catch (err) {
      return { status: 'error', message: err.message };
    }
  }
}
