import Mailgun from 'mailgun.js'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { buildMail, MailContent, MailSubject } from './mail-templates'

export type { MailContent, MailSubject } from './mail-templates'

// Expéditeur par défaut si MAILGUN_FROM n'est pas défini.
const DEFAULT_FROM = "Le gite d'auzon <contact@legitedauzon.fr>"

@Injectable()
export class MailGunsService {
  private readonly mg: ReturnType<Mailgun['client']>
  private readonly domain: string
  private readonly emailReception: string
  private readonly from: string

  constructor(private configService: ConfigService) {
    const mailgun = new Mailgun(FormData)

    const key = this.configService.get<string>('MAILGUN_KEY')
    if (!key) {
      throw new Error('MAILGUN_KEY is not defined in environment variables')
    }
    const emailReception = this.configService.get<string>('MAILGUN_EMAIL_RECEPTION')
    if (!emailReception) {
      throw new Error('MAILGUN_EMAIL_RECEPTION is not defined in environment variables')
    }
    this.emailReception = emailReception

    this.mg = mailgun.client({
      username: 'api',
      key,
    })
    const domain = this.configService.get<string>('MAILGUN_DOMAIN')
    if (!domain) {
      throw new Error('MAILGUN_DOMAIN is not defined in environment variables')
    }
    this.domain = domain
    this.from = this.configService.get<string>('MAILGUN_FROM')?.trim() || DEFAULT_FROM
  }

  sendMail(subject: MailSubject, content?: MailContent) {
    const mail = buildMail(subject, content)

    return this.mg.messages.create(this.domain, {
      from: this.from,
      to: [this.emailReception],
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      // « Répondre » écrit directement au visiteur plutôt qu'à l'adresse d'expédition.
      ...(content?.email ? { 'h:Reply-To': content.email } : {}),
    })
  }
}
