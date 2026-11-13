import { Module } from '@nestjs/common'
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { AppService } from './app.service'
import { ConfigModule } from '@nestjs/config'
import { AppController } from './app.controller'
import { UsersModule } from './users/users.module'
import { TarifsModule } from './tarifs/tarifs.module'
import { ClientsModule } from './clients/clients.module'
import { MailGunModule } from './MailGun/mailGun.module'
import { EvenementsModule } from './evenements/evenements.module'
import { SupplementsModule } from './supplements/supplements.module'
import { CommentairesModule } from './commentaires/commentaires.module'
import { ReservationsModule } from './reservations/reservations.module'
import { CronModule } from './cron/cron.module'
import { AuthModule } from './auth/auth.module'
import { UploadModule } from './Upload/Upload.module'
import { JwtAuthGuard } from './auth/jwt-auth.guard'
import { PrismaModule } from './prisma/prisma.module'
import { DEFAULT_THROTTLE } from './common/throttle'
import { createValidationPipe } from './common/validation'
import { PrismaExceptionFilter } from './common/prisma-exception.filter'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([DEFAULT_THROTTLE]),
    PrismaModule,
    UsersModule,
    AuthModule,
    ClientsModule,
    ReservationsModule,
    SupplementsModule,
    CommentairesModule,
    TarifsModule,
    MailGunModule,
    EvenementsModule,
    CronModule,
    UploadModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_PIPE, useFactory: createValidationPipe },
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
  ],
})
export class AppModule { }
