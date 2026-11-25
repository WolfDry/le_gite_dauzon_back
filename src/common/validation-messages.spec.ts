import { BadRequestException } from '@nestjs/common'
import { CreateReservationDto } from 'src/reservations/dto/create-reservation.dto'
import { CreateTarifsDto } from 'src/tarifs/dto/create-tarifs.dto'
import { CreateClientDto } from 'src/clients/dto/create-client.dto'
import { createValidationPipe } from './validation'
import { fieldLabel, translateValidationMessage } from './validation-messages'

/** Messages renvoyés par la ValidationPipe de l'application pour `body` validé contre `metatype`. */
async function messagesFor(metatype: new (...args: never[]) => object, body: object): Promise<string[]> {
  try {
    await createValidationPipe().transform(body, { type: 'body', metatype })
  } catch (error) {
    if (error instanceof BadRequestException) {
      return (error.getResponse() as { message: string[] }).message
    }
    throw error
  }
  throw new Error('La validation aurait dû échouer')
}

const reservation = {
  tarif: 500,
  debut: '2026-07-04T00:00:00.000Z',
  fin: '2026-07-11T00:00:00.000Z',
  clientId: 1,
}

describe('messages de validation', () => {
  it('traduit les messages par défaut avec le libellé du champ', async () => {
    expect(await messagesFor(CreateClientDto, { nom: '', prenom: 'Léa', email: 'pas-un-email', telephone: 'x'.repeat(31) })).toEqual(
      expect.arrayContaining([
        '« Nom » est obligatoire',
        '« E-mail » doit être une adresse e-mail valide',
        '« Téléphone » ne doit pas dépasser 30 caractères',
      ]),
    )
  })

  it('traduit les bornes et les montants', async () => {
    const messages = await messagesFor(CreateReservationDto, { ...reservation, tarif: -1, adultes: 1.5, enfants: 99 })
    expect(messages).toEqual(
      expect.arrayContaining([
        '« Tarif » doit valoir au moins 0',
        '« Adultes » doit être un nombre entier',
        '« Enfants » doit valoir au plus 50',
      ]),
    )
    expect(await messagesFor(CreateReservationDto, { ...reservation, tarif: 10.555 })).toEqual([
      '« Tarif » doit être un nombre (2 décimales au plus)',
    ])
  })

  it('nomme les deux dates quand la fin précède le début', async () => {
    expect(await messagesFor(CreateReservationDto, { ...reservation, fin: '2026-07-01T00:00:00.000Z' })).toEqual([
      '« Date de fin » doit être postérieure à « Date de début »',
    ])
  })

  it('situe les erreurs des listes imbriquées', async () => {
    const messages = await messagesFor(CreateReservationDto, {
      ...reservation,
      supplements: [{ supplementId: 1, nb: 1 }, { supplementId: 2, nb: 0 }],
    })
    expect(messages).toEqual(['« Supplément 2 › Quantité » doit valoir au moins 1'])
  })

  it('traduit les règles appliquées à chaque valeur d’une liste', async () => {
    const messages = await messagesFor(CreateTarifsDto, { desc: '', label: 'Été', prix: 700, frequence: ['TOUS_LES_JOURS'] })
    expect(messages).toHaveLength(1)
    expect(messages[0]).toMatch(/^Chaque valeur de « Fréquence » doit valoir l'une de ces valeurs : /)
  })
})

describe('translateValidationMessage', () => {
  it('garde un message déjà personnalisé', () => {
    expect(translateValidationMessage('image', '« Image » doit être une image envoyée')).toBe('« Image » doit être une image envoyée')
    expect(translateValidationMessage('prix', 'prix fait quelque chose d’inconnu')).toBe('prix fait quelque chose d’inconnu')
  })

  it('garde le nom technique d’un champ sans libellé', () => {
    expect(fieldLabel('inconnu')).toBe('inconnu')
    expect(fieldLabel(['periodes', '0', 'fin'])).toBe('Période 1 › Date de fin')
  })
})
