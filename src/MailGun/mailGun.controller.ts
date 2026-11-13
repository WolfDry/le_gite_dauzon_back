import { Body, Controller, Post } from '@nestjs/common'
import { MailGunsService } from 'src/MailGun/mailGun.service'
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Public } from 'src/auth/public.decorator'
import { ThrottlePublicWrite } from 'src/common/throttle'
import { ContactDto } from './dto/contact.dto'

@ApiTags('mailgun')
@Controller('mailgun')
export class MailGunController {
  constructor(private readonly mailGunService: MailGunsService) { }

  @Public()
  @ThrottlePublicWrite()
  @Post()
  @ApiOperation({ summary: "Send the contact form to the owners" })
  @ApiBody({ type: ContactDto })
  sendMail(@Body() data: ContactDto) {
    const { name, email, message } = data.content
    return this.mailGunService.sendMail(data.subject, { name, email, message })
  }
}
