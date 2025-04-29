import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { ClientsModule } from './clients/clients.module';
import { ReservationsModule } from './reservations/reservations.module';
import { SupplementsModule } from './supplements/supplements.module';

@Module({
  imports: [
    UsersModule,
    ClientsModule,
    ReservationsModule,
    SupplementsModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
