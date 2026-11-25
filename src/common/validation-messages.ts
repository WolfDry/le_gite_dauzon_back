import type { ValidationError } from 'class-validator'

/**
 * Messages de validation en français.
 *
 * class-validator produit des messages en anglais avec le nom technique du champ
 * (« prix must not be less than 0 »). Plutôt que de fixer un message sur chaque décorateur
 * des DTO, la ValidationPipe passe ses erreurs par `validationMessages`, qui traduit les
 * messages par défaut et remplace le nom du champ par un libellé lisible :
 * « « Prix » doit valoir au moins 0 ». Un message déjà personnalisé est gardé tel quel.
 */

/** Libellés des champs des DTO, affichés tels quels dans l'admin et sur le site. */
const FIELD_LABELS: Record<string, string> = {
  acomptePourcentage: "Pourcentage d'acompte",
  adultes: 'Adultes',
  animaux: 'Animaux',
  capacite: 'Capacité',
  client: 'Client',
  clientId: 'Client',
  commentaire: 'Commentaire',
  content: 'Contenu',
  created: 'Date',
  date: 'Dates',
  debut: 'Date de début',
  depuis: 'Depuis le',
  desc: 'Description',
  disconnectClient: 'Détacher le client',
  email: 'E-mail',
  enfants: 'Enfants',
  fin: 'Date de fin',
  frequence: 'Fréquence',
  image: 'Image',
  jusqua: "Jusqu'au",
  label: 'Libellé',
  lien: 'Lien',
  localisation: 'Lieu',
  message: 'Message',
  motif: 'Motif',
  name: 'Nom',
  nb: 'Quantité',
  newClient: 'Nouveau client',
  nom: 'Nom',
  note: 'Note',
  parAnimal: 'Par animal',
  parDefaut: 'Tarif par défaut',
  password: 'Mot de passe',
  periodes: 'Périodes',
  phone: 'Téléphone',
  prenom: 'Prénom',
  prix: 'Prix',
  saisonDebut: 'Début de saison',
  saisonFin: 'Fin de saison',
  statut: 'Statut',
  subject: 'Objet',
  supplementId: 'Supplément',
  supplements: 'Suppléments',
  tarif: 'Tarif',
  taxeSejour: 'Taxe de séjour',
  telephone: 'Téléphone',
  titre: 'Titre',
  type: 'Type',
  vacance: 'Vacances scolaires',
  verif: 'Validé',
  vue: 'Vue',
}

/** Libellé d'un élément de liste : « Période 2 » plutôt que « Périodes 2 ». */
const ITEM_LABELS: Record<string, string> = {
  periodes: 'Période',
  supplements: 'Supplément',
  date: 'Date',
  frequence: 'Fréquence',
}

/**
 * Libellé lisible d'un champ, à partir de son nom ou de son chemin dans le corps de la requête
 * (`['periodes', '1', 'debut']` -> « Période 2 › Date de début »).
 */
export function fieldLabel(path: string | string[]): string {
  const segments = typeof path === 'string' ? [path] : path
  const parts: string[] = []
  segments.forEach((segment, i) => {
    if (/^\d+$/.test(segment)) {
      const list = segments[i - 1]
      parts[parts.length - 1] = `${ITEM_LABELS[list] ?? FIELD_LABELS[list] ?? list} ${Number(segment) + 1}`
    } else {
      parts.push(FIELD_LABELS[segment] ?? segment)
    }
  })
  return parts.join(' › ')
}

/** Message d'erreur sur un champ : « « Libellé » texte ». */
export function fieldMessage(path: string | string[], text: string): string {
  return `« ${fieldLabel(path)} » ${text}`
}

/** Message d'une date qui doit suivre une autre (fin après début). */
export function afterMessage(path: string | string[], other: string): string {
  return fieldMessage(path, `doit être postérieure à « ${fieldLabel(other)} »`)
}

/** Messages par défaut de class-validator (sans le nom du champ) et leur traduction. */
const TRANSLATIONS: [RegExp, (...groups: string[]) => string][] = [
  [/^should not be empty$/, () => 'est obligatoire'],
  [/^must be a string$/, () => 'doit être un texte'],
  [/^must be shorter than or equal to (\d+) characters?$/, (n) => `ne doit pas dépasser ${n} caractères`],
  [/^must be longer than or equal to (\d+) characters?$/, (n) => `doit contenir au moins ${n} caractères`],
  [/^must be a Date instance$/, () => 'doit être une date valide'],
  [/^must be an integer number$/, () => 'doit être un nombre entier'],
  [/^must be a number conforming to the specified constraints$/, () => 'doit être un nombre (2 décimales au plus)'],
  [/^must not be less than (\S+)$/, (n) => `doit valoir au moins ${n}`],
  [/^must not be greater than (\S+)$/, (n) => `doit valoir au plus ${n}`],
  [/^must be one of the following values: (.*)$/, (values) => `doit valoir l'une de ces valeurs : ${values}`],
  [/^must be an email$/, () => 'doit être une adresse e-mail valide'],
  [/^must be a boolean value$/, () => 'doit valoir vrai ou faux'],
  [/^must be an array$/, () => 'doit être une liste'],
  [/^must contain no more than (\d+) elements$/, (n) => `ne doit pas contenir plus de ${n} éléments`],
  [/^must match .* regular expression$/, () => "n'a pas le format attendu"],
  [/^must be equal to (.*)$/, (value) => `doit valoir ${value}`],
  [/^must be either object or array$/, () => 'doit être un objet ou une liste'],
  // Message du décorateur IsAfter : « fin doit être postérieure à debut ».
  [/^doit être postérieure à (\w+)$/, (other) => `doit être postérieure à « ${fieldLabel(other)} »`],
]

/**
 * Traduit un message de class-validator sur le champ `property` (chemin complet : `path`).
 * Un message qui n'est pas un message par défaut connu est renvoyé tel quel.
 */
export function translateValidationMessage(property: string, message: string, path: string[] = [property]): string {
  const match = /^(each value in )?(nested property )?(\S+) (.*)$/.exec(message)
  if (!match || match[3] !== property) return message
  const [, each, , , rest] = match

  for (const [pattern, translate] of TRANSLATIONS) {
    const groups = pattern.exec(rest)
    if (groups) {
      const text = translate(...groups.slice(1))
      return each ? `Chaque valeur de « ${fieldLabel(path)} » ${text}` : fieldMessage(path, text)
    }
  }
  return message
}

/** Messages lisibles de toutes les erreurs de validation, champs imbriqués compris. */
export function validationMessages(errors: ValidationError[], parents: string[] = []): string[] {
  return errors.flatMap((error) => {
    const path = [...parents, error.property]
    const own = Object.values(error.constraints ?? {}).map((message) =>
      translateValidationMessage(error.property, message, path),
    )
    return [...own, ...validationMessages(error.children ?? [], path)]
  })
}
