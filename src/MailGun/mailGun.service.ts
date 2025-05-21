import Mailgun from 'mailgun.js'
import * as formData from 'form-data'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class MailGunsService {
  private mg
  private domain

  constructor(private configService: ConfigService) {
    const mailgun = new Mailgun(formData)

    const key = this.configService.get<string>('MAILGUN_KEY')
    if (!key) {
      throw new Error('MAILGUN_KEY is not defined in environment variables')
    }

    this.mg = mailgun.client({
      username: 'api',
      key,
    })
    this.domain = this.configService.get<string>('MAILGUN_DOMAIN')
    if (!this.domain) {
      throw new Error('MAILGUN_DOMAIN is not defined in environment variables')
    }
  }

  sendMail(subject: string) {

    let data = {
      subject: '',
      text: '',
      html: ''
    }

    switch (subject) {
      case 'reservation':
        data = {
          subject: 'Nouvelle demande de reservation',
          text: 'Vous avez une nouvelle demande de reservation',
          html: '<h1>Vous avez une nouvelle demande de reservation!</h1>',
        }
        break
      case 'commentaire':
        data = {
          subject: 'Nouveau commentaire',
          text: 'Vous avez un nouveau commentaire sur le gite',
          html: '<h1>Vous avez un nouveau commentaire sur le site !</h1>',          
        }
      default:
        break
    }

    return this.mg.messages.create(this.domain, {
      from: 'Le gite d\'auzon <contact@legitedauzon.fr>',
      to: ['benjamindeltour22@gmail.com'],
      subject: data.subject,
      text: data.text,
      html: data.html,
    })
  }
}
