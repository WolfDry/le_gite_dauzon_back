import { BadRequestException, ValidationPipe } from '@nestjs/common'
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidationArguments,
  ValidationOptions,
  registerDecorator,
} from 'class-validator'
import { validationMessages } from './validation-messages'

export const createValidationPipe = () =>
  new ValidationPipe({
    whitelist: true,
    transform: true,
    // Messages en français, avec le libellé du champ plutôt que son nom technique.
    exceptionFactory: (errors) => new BadRequestException(validationMessages(errors)),
  })

export function IsAfter(property: string, options?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isAfter',
      target: object.constructor,
      propertyName,
      constraints: [property],
      options: { message: `${propertyName} doit être postérieure à ${property}`, ...options },
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const other = (args.object as Record<string, unknown>)[args.constraints[0] as string]
          if (!(value instanceof Date) || !(other instanceof Date)) return true
          return value.getTime() > other.getTime()
        },
      },
    })
  }
}

/** Montant en euros : nombre positif ou nul, au centime près (0 accepté). */
export function IsMontant(options?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 }, options)(object, propertyName)
    Min(0, options)(object, propertyName)
  }
}

/**
 * Numéro de téléphone, dans n'importe quel format (français, étranger, espaces, points,
 * tirets, parenthèses, indicatif...). Seule règle, la même que l'admin et le site public :
 * au moins 6 chiffres et 30 caractères au plus.
 */
export const TELEPHONE_MIN_CHIFFRES = 6
export const TELEPHONE_MAX_LENGTH = 30

export function IsTelephone(options?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    IsString(options)(object, propertyName)
    IsNotEmpty(options)(object, propertyName)
    MaxLength(TELEPHONE_MAX_LENGTH, options)(object, propertyName)
    registerDecorator({
      name: 'isTelephone',
      target: object.constructor,
      propertyName,
      options: { message: `${propertyName} doit contenir au moins ${TELEPHONE_MIN_CHIFFRES} chiffres`, ...options },
      validator: {
        validate(value: unknown) {
          // Valeur absente ou d'un autre type : déjà signalée par IsNotEmpty / IsString.
          if (typeof value !== 'string' || value === '') return true
          return value.replace(/\D/g, '').length >= TELEPHONE_MIN_CHIFFRES
        },
      },
    })
  }
}

/** Nombre de voyageurs d'une catégorie (adultes, enfants, animaux). */
export const MAX_VOYAGEURS = 50

export function IsNbVoyageurs(min = 0, options?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    IsInt(options)(object, propertyName)
    Min(min, options)(object, propertyName)
    Max(MAX_VOYAGEURS, options)(object, propertyName)
  }
}
