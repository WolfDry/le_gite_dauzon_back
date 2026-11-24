import { Module } from '@nestjs/common'
import { MailGunsService } from 'src/MailGun/mailGun.service'
import { MailGunController } from './mailGun.controller'

@Module({
  controllers: [MailGunController],
  providers: [MailGunsService],
  exports: [MailGunsService],
})
export class MailGunModule { }
