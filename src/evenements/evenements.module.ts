import { Module } from '@nestjs/common'
import { UploadModule } from 'src/Upload/Upload.module'
import { EvenementController } from './evenements.controller'
import { EvenementService } from './evenements.service'

@Module({
  imports: [UploadModule],
  controllers: [EvenementController],
  providers: [EvenementService],
})
export class EvenementsModule { }
