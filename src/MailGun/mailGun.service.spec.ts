import { ConfigService } from '@nestjs/config'
import { MailGunsService, MailSubject } from './mailGun.service'

describe('MailGunsService', () => {
  const config = {
    get: (key: string) => ({ MAILGUN_KEY: 'key', MAILGUN_EMAIL_RECEPTION: 'gite@example.com', MAILGUN_DOMAIN: 'mg.example.com' })[key],
  } as unknown as ConfigService

  it("n'envoie jamais de mail vide pour un sujet inconnu", () => {
    const service = new MailGunsService(config)
    const create = jest.fn()
    ;(service as unknown as { mg: { messages: { create: jest.Mock } } }).mg = { messages: { create } }

    expect(() => service.sendMail('inconnu' as MailSubject)).toThrow('Sujet de mail inconnu')
    expect(create).not.toHaveBeenCalled()
  })

  it('échappe le HTML saisi dans le formulaire de contact', async () => {
    const service = new MailGunsService(config)
    const create = jest.fn()
    ;(service as unknown as { mg: { messages: { create: jest.Mock } } }).mg = { messages: { create } }

    await service.sendMail('autre', { name: '<b>Jean</b>', email: 'jean@example.com', message: '<a href="x">clic</a>' })
    const html: string = create.mock.calls[0][1].html
    expect(html).not.toContain('<a href')
    expect(html).toContain('&lt;b&gt;Jean&lt;/b&gt;')
  })

  it('détaille les voyageurs de la demande de réservation, au singulier ou au pluriel', async () => {
    const service = new MailGunsService(config)
    const create = jest.fn()
    ;(service as unknown as { mg: { messages: { create: jest.Mock } } }).mg = { messages: { create } }

    await service.sendMail('reservation', { name: 'Jean', email: 'jean@example.com', adultes: 2, enfants: 0, animaux: 1 })
    expect(create.mock.calls[0][1].text).toContain('Personnes : 2 adultes, 1 animal')
  })
})
