import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule { }
