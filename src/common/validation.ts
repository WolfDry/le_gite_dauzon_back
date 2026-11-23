import { ValidationPipe } from '@nestjs/common'
import { IsInt, IsNumber, Max, Min, ValidationArguments, ValidationOptions, registerDecorator } from 'class-validator'

export const createValidationPipe = () =>
  new ValidationPipe({
    whitelist: true,
    transform: true,
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

/** Nombre de voyageurs d'une catégorie (adultes, enfants, animaux). */
export const MAX_VOYAGEURS = 50

export function IsNbVoyageurs(min = 0, options?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    IsInt(options)(object, propertyName)
    Min(min, options)(object, propertyName)
    Max(MAX_VOYAGEURS, options)(object, propertyName)
  }
}
