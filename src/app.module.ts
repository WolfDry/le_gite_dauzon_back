import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { ConfigModule } from '@nestjs/config'
import { UsersModule } from './users/users.module'
import { ClientsModule } from './clients/clients.module'
import { ReservationsModule } from './reservations/reservations.module'
import { SupplementsModule } from './supplements/supplements.module'
import { CommentairesModule } from './commentaires/commentaires.module'
import { TarifsModule } from './tarifs/tarifs.module'

@Module({
  imports: [
    ConfigModule.forRoot({isGlobal: true}),
    UsersModule,
    ClientsModule,
    ReservationsModule,
    SupplementsModule,
    CommentairesModule,
    TarifsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
