import Mailgun from 'mailgun.js'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

export type MailSubject = 'reservation' | 'commentaire' | 'autre'

type Content = {
  name?: string
  email: string
  phone?: string
  message?: string
  debut?: Date | null
  fin?: Date | null
  adultes?: number
  enfants?: number
  animaux?: number
}

const escapeHtml = (value?: string | null) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const formatDate = (value?: Date | null) =>
  value ? new Date(value).toLocaleDateString('fr-FR', { timeZone: 'UTC' }) : '?'

const VOYAGEURS = [
  ['adultes', 'adulte', 'adultes'],
  ['enfants', 'enfant', 'enfants'],
  ['animaux', 'animal', 'animaux'],
] as const

const formatVoyageurs = (content?: Content) =>
  VOYAGEURS.flatMap(([key, singulier, pluriel]) => {
    const nb = content?.[key] ?? 0
    return nb > 0 ? [`${nb} ${nb === 1 ? singulier : pluriel}`] : []
  }).join(', ')

const paragraphs = (text: string) => escapeHtml(text).replace(/\r?\n/g, '<br>')

@Injectable()
export class MailGunsService {
  private readonly mg: ReturnType<Mailgun['client']>
  private readonly domain: string
  private readonly emailReception: string

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
  }

  sendMail(subject: MailSubject, content?: Content) {

    let data = {
      subject: '',
      text: '',
      html: ''
    }

    switch (subject) {
      case 'reservation': {
        const personnes = formatVoyageurs(content)
        const dates = `Du ${formatDate(content?.debut)} au ${formatDate(content?.fin)}`
        data = {
          subject: `Nouvelle demande de réservation${content?.name ? ` de ${content.name.replace(/\s+/g, ' ')}` : ''}`,
          text: [
            'Vous avez une nouvelle demande de réservation.',
            `Nom : ${content?.name ?? ''}`,
            `E-mail : ${content?.email ?? ''}`,
            `Téléphone : ${content?.phone ?? ''}`,
            `Personnes : ${personnes}`,
            `Dates : ${dates}`,
            content?.message ? `Message :\n${content.message}` : '',
            'La demande est enregistrée dans l\'admin, rubrique Réservations.',
          ].filter(Boolean).join('\n'),
          html: `<h1>Vous avez une nouvelle demande de réservation</h1>
          <p>Nom : ${escapeHtml(content?.name)}</p>
          <p>E-mail : ${escapeHtml(content?.email)}</p>
          <p>Téléphone : ${escapeHtml(content?.phone)}</p>
          <p>Personnes : ${escapeHtml(personnes)}</p>
          <p>Dates : ${escapeHtml(dates)}</p>
          ${content?.message ? `<p>Message :<br>${paragraphs(content.message)}</p>` : ''}
          <p>La demande est enregistrée dans l'admin, rubrique Réservations.</p>`
        }
        break
      }
      case 'commentaire':
        data = {
          subject: 'Nouveau commentaire',
          text: 'Vous avez un nouveau commentaire sur le gite',
          html: '<h1>Vous avez un nouveau commentaire sur le site !</h1>',
        }
        break
      case 'autre':
        data = {
          subject: 'Quelqu\'un essaye de vous contacter',
          text: 'Quelqu\'un essaye de vous contacter',
          html: `<p>${escapeHtml(content?.name || 'pas de nom (pas normal)')}</p>
          <p>Email : ${escapeHtml(content?.email || 'pas d\'email (pas normal)')}</p>
        <p>${content?.message ? paragraphs(content.message) : 'pas de message (pas normal)'}</p>
        `,
        }
        break
      default:
        // Jamais d'e-mail vide : un sujet inconnu est une erreur de programmation.
        throw new Error(`Sujet de mail inconnu : ${String(subject)}`)
    }

    return this.mg.messages.create(this.domain, {
      from: 'Le gite d\'auzon <contact@legitedauzon.fr>',
      to: [this.emailReception],
      subject: data.subject,
      text: data.text,
      html: data.html,
      ...(content?.email ? { 'h:Reply-To': content.email } : {}),
    })
  }
}
