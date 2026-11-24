import { ConfigService } from '@nestjs/config'
import { MailGunsService, MailSubject } from './mailGun.service'

const ENV = { MAILGUN_KEY: 'key', MAILGUN_EMAIL_RECEPTION: 'gite@example.com', MAILGUN_DOMAIN: 'mg.example.com' }

const setup = (env: Record<string, string> = {}) => {
  const values: Record<string, string> = { ...ENV, ...env }
  const config = { get: (key: string) => values[key] } as unknown as ConfigService
  const service = new MailGunsService(config)
  const create = jest.fn()
  ;(service as unknown as { mg: { messages: { create: jest.Mock } } }).mg = { messages: { create } }
  const sent = () => create.mock.calls[0][1] as Record<string, string | string[]>
  return { service, create, sent }
}

describe('MailGunsService', () => {
  it("n'envoie jamais de mail vide pour un sujet inconnu", () => {
    const { service, create } = setup()

    expect(() => service.sendMail('inconnu' as MailSubject)).toThrow('Sujet de mail inconnu')
    expect(create).not.toHaveBeenCalled()
  })

  it('échappe le HTML saisi dans le formulaire de contact', async () => {
    const { service, sent } = setup()

    await service.sendMail('autre', { name: '<b>Jean</b>', email: 'jean@example.com', message: '<a href="x">clic</a>' })
    expect(sent().html).not.toContain('<a href')
    expect(sent().html).toContain('&lt;b&gt;Jean&lt;/b&gt;')
  })

  it('met le message de contact aussi dans la version texte', async () => {
    const { service, sent } = setup()

    await service.sendMail('autre', { name: 'Jean', email: 'jean@example.com', message: 'Bonjour,\nest-ce libre ?' })
    expect(sent().text).toContain('Message :\nBonjour,\nest-ce libre ?')
    expect(sent().html).toContain('Bonjour,<br>est-ce libre ?')
  })

  it('détaille les voyageurs de la demande de réservation, au singulier ou au pluriel', async () => {
    const { service, sent } = setup()

    await service.sendMail('reservation', { name: 'Jean', email: 'jean@example.com', adultes: 2, enfants: 0, animaux: 1 })
    expect(sent().text).toContain('Personnes : 2 adultes, 1 animal')
  })

  it('répond au visiteur en un clic', async () => {
    const { service, sent } = setup()

    await service.sendMail('reservation', { name: 'Jean', email: 'jean@example.com' })
    expect(sent()['h:Reply-To']).toBe('jean@example.com')
    expect(sent().to).toEqual(['gite@example.com'])
  })

  it("n'ajoute pas de Reply-To sans e-mail (commentaire)", async () => {
    const { service, sent } = setup()

    await service.sendMail('commentaire', { name: 'Jean', note: 4, message: '<i>Super</i>' })
    expect(sent()['h:Reply-To']).toBeUndefined()
    expect(sent().subject).toBe('Nouveau commentaire de Jean')
    expect(sent().text).toContain('Note : 4/5')
    expect(sent().html).toContain('&lt;i&gt;Super&lt;/i&gt;')
  })

  it("garde l'objet sur une seule ligne", async () => {
    const { service, sent } = setup()

    await service.sendMail('reservation', { name: 'Jean\r\nBcc: x@y.z', email: 'jean@example.com' })
    expect(sent().subject).toBe('Nouvelle demande de réservation de Jean Bcc: x@y.z')
  })

  it("prend l'expéditeur dans MAILGUN_FROM", async () => {
    const { service, sent } = setup({ MAILGUN_FROM: 'Gîte <bonjour@exemple.fr>' })

    await service.sendMail('commentaire', { name: 'Jean', message: 'Super' })
    expect(sent().from).toBe('Gîte <bonjour@exemple.fr>')
  })

  it("garde l'expéditeur historique si MAILGUN_FROM est absent", async () => {
    const { service, sent } = setup()

    await service.sendMail('commentaire', { name: 'Jean', message: 'Super' })
    expect(sent().from).toBe("Le gite d'auzon <contact@legitedauzon.fr>")
  })
})
