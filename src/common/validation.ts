import { ValidationPipe } from '@nestjs/common'
import { ValidationArguments, ValidationOptions, registerDecorator } from 'class-validator'

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
          const other = (args.object as Record<string, unknown>)[args.constraints[0]]
          if (!(value instanceof Date) || !(other instanceof Date)) return true
          return value.getTime() > other.getTime()
        },
      },
    })
  }
}

export function HasAtLeastOnePerson(options?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'hasAtLeastOnePerson',
      target: object.constructor,
      propertyName,
      options: { message: `${propertyName} doit compter au moins une personne`, ...options },
      validator: {
        validate(value: unknown) {
          if (!Array.isArray(value)) return false
          return value.reduce((total, item) => total + (typeof item?.nb === 'number' ? item.nb : 0), 0) > 0
        },
      },
    })
  }
}
