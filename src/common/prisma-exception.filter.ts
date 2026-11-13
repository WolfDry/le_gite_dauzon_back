import {
  ArgumentsHost,
  Catch,
  ConflictException,
  ExceptionFilter,
  HttpException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import type { Response } from 'express'

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name)

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const error = this.translate(exception)
    if (error instanceof InternalServerErrorException) {
      this.logger.error(`${exception.code} : ${exception.message}`)
    }
    host.switchToHttp().getResponse<Response>().status(error.getStatus()).json(error.getResponse())
  }

  private translate(exception: Prisma.PrismaClientKnownRequestError): HttpException {
    switch (exception.code) {
      case 'P2025':
        return new NotFoundException('Élément introuvable')
      case 'P2002': {
        const target = exception.meta?.target
        const fields = Array.isArray(target) ? target.join(', ') : target
        return new ConflictException(
          fields ? `Cette valeur est déjà utilisée (${fields})` : 'Cette valeur est déjà utilisée',
        )
      }
      case 'P2003':
      case 'P2014':
        return new ConflictException(
          'Opération impossible : cet élément est lié à d’autres données (ou fait référence à un élément inexistant)',
        )
      default:
        return new InternalServerErrorException('Erreur de base de données')
    }
  }
}
