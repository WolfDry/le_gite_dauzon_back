import { Module } from '@nestjs/common'
import { EvenementController } from './evenements.controller'
import { EvenementService } from './evenements.service'

@Module({
  controllers: [EvenementController],
  providers: [EvenementService],
})
export class EvenementsModule { }