import Mailgun from 'mailgun.js'
import * as formData from 'form-data'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

type Content = {
  name: string
  email: string
  message: string
}

@Injectable()
export class MailGunsService {
  private mg
  private domain
  private emailReception

  constructor(private configService: ConfigService) {
    const mailgun = new Mailgun(formData)

    const key = this.configService.get<string>('MAILGUN_KEY')
    if (!key) {
      throw new Error('MAILGUN_KEY is not defined in environment variables')
    }
    this.emailReception = this.configService.get<string>('MAILGUN_EMAIL_RECEPTION')
    if (!this.emailReception) {
      throw new Error('MAILGUN_EMAIL_RECEPTION is not defined in environment variables')
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

  sendMail(subject: string, content?: Content) {

    let data = {
      subject: '',
      text: '',
      html: ''
    }

    if (content) {
      return this.mg.messages.create(this.domain, {
        from: 'Le gite d\'auzon <contact@legitedauzon.fr>',
        to: [this.emailReception],
        subject: 'Quelqu\'un essaye de vous contacter',
        text: 'Quelqu\'un essaye de vous contacter',
        html: `<p>${content.name} veut vous dire :</p>
        <p>${content.message}</p>
        <p>Email : ${content.email}</p>
        `,
      })
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
      to: [this.emailReception],
      subject: data.subject,
      text: data.text,
      html: data.html,
    })
  }
}
