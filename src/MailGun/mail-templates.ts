export type MailSubject = 'reservation' | 'commentaire' | 'autre'

export type MailContent = {
  name?: string
  email?: string
  phone?: string
  message?: string
  note?: number
  debut?: Date | null
  fin?: Date | null
  adultes?: number
  enfants?: number
  animaux?: number
}

export type RenderedMail = { subject: string; text: string; html: string }

type Field = { label: string; value?: string | number | null; multiline?: boolean }

type Gabarit = {
  subject: string
  intro: string
  fields: Field[]
  outro?: string
}

export const escapeHtml = (value?: string | number | null) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const paragraphs = (value: string | number) => escapeHtml(value).replace(/\r?\n/g, '<br>')

// Un en-tête ne doit jamais contenir de retour à la ligne (injection d'en-têtes).
const oneLine = (value: string) => value.replace(/\s+/g, ' ').trim()

const formatDate = (value?: Date | null) =>
  value ? new Date(value).toLocaleDateString('fr-FR', { timeZone: 'UTC' }) : '?'

const VOYAGEURS = [
  ['adultes', 'adulte', 'adultes'],
  ['enfants', 'enfant', 'enfants'],
  ['animaux', 'animal', 'animaux'],
] as const

const formatVoyageurs = (content: MailContent) =>
  VOYAGEURS.flatMap(([key, singulier, pluriel]) => {
    const nb = content[key] ?? 0
    return nb > 0 ? [`${nb} ${nb === 1 ? singulier : pluriel}`] : []
  }).join(', ')

const isPresent = (field: Field) => field.value !== undefined && field.value !== null && field.value !== ''

// Texte et HTML sont produits à partir des mêmes champs : ils ne peuvent pas diverger.
// Tout ce qui vient du visiteur est échappé dans la version HTML.
const render = ({ subject, intro, fields, outro }: Gabarit): RenderedMail => {
  const present = fields.filter(isPresent)

  const text = [
    intro,
    '',
    ...present.map(({ label, value, multiline }) => (multiline ? `${label} :\n${value}` : `${label} : ${value}`)),
    ...(outro ? ['', outro] : []),
  ].join('\n')

  const html = [
    `<p style="font-size:16px"><strong>${escapeHtml(intro)}</strong></p>`,
    ...present.map(
      ({ label, value, multiline }) =>
        `<p><strong>${escapeHtml(label)} :</strong>${multiline ? '<br>' : ' '}${paragraphs(value as string | number)}</p>`,
    ),
    ...(outro ? [`<p style="color:#555">${escapeHtml(outro)}</p>`] : []),
  ].join('\n')

  return { subject: oneLine(subject), text, html }
}

const REPONDRE = 'Répondez directement à ce mail pour écrire à la personne.'

const demandeReservation = (content: MailContent): RenderedMail =>
  render({
    subject: `Nouvelle demande de réservation${content.name ? ` de ${content.name}` : ''}`,
    intro: 'Vous avez une nouvelle demande de réservation.',
    fields: [
      { label: 'Nom', value: content.name },
      { label: 'E-mail', value: content.email },
      { label: 'Téléphone', value: content.phone },
      { label: 'Personnes', value: formatVoyageurs(content) },
      { label: 'Dates', value: `Du ${formatDate(content.debut)} au ${formatDate(content.fin)}` },
      { label: 'Message', value: content.message, multiline: true },
    ],
    outro: `${REPONDRE} La demande est enregistrée dans l'admin, rubrique Réservations.`,
  })

const commentaire = (content: MailContent): RenderedMail =>
  render({
    subject: `Nouveau commentaire${content.name ? ` de ${content.name}` : ''}`,
    intro: 'Vous avez un nouveau commentaire sur le site.',
    fields: [
      { label: 'Nom', value: content.name },
      { label: 'Note', value: content.note ? `${content.note}/5` : undefined },
      { label: 'Commentaire', value: content.message, multiline: true },
    ],
    outro: "Il n'apparaît sur le site qu'une fois validé dans l'admin, rubrique Commentaires.",
  })

const contact = (content: MailContent): RenderedMail =>
  render({
    subject: `Message de ${content.name || 'contact'} via le site`,
    intro: 'Vous avez reçu un message depuis le formulaire de contact du site.',
    fields: [
      { label: 'Nom', value: content.name },
      { label: 'E-mail', value: content.email },
      { label: 'Message', value: content.message, multiline: true },
    ],
    outro: REPONDRE,
  })

export const buildMail = (subject: MailSubject, content: MailContent = {}): RenderedMail => {
  switch (subject) {
    case 'reservation':
      return demandeReservation(content)
    case 'commentaire':
      return commentaire(content)
    case 'autre':
      return contact(content)
    default:
      // Jamais d'e-mail vide : un sujet inconnu est une erreur de programmation.
      throw new Error(`Sujet de mail inconnu : ${String(subject)}`)
  }
}
