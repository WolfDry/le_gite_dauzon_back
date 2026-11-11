import { Body, Controller, Post } from '@nestjs/common'
import { MailGunsService } from 'src/MailGun/mailGun.service'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { Public } from 'src/auth/public.decorator'

@ApiTags('mailgun')
@Controller('mailgun')
export class MailGunController {
  constructor(private readonly mailGunService: MailGunsService) { }

  @Public()
  @Post()
  @ApiOperation({ summary: "Send a mail depending on the subject" })
  sendMail(@Body() data) {
    return this.mailGunService.sendMail(data.subject, data.content)
  }
}