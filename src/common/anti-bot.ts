import {
  applyDecorators,
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  NestInterceptor,
  SetMetadata,
  UseInterceptors,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Reflector } from '@nestjs/core'
import { ApiProperty } from '@nestjs/swagger'
import { IsOptional, IsString, MaxLength } from 'class-validator'
import type { Request } from 'express'
import { from, Observable, of, switchMap } from 'rxjs'

/**
 * Protection anti-robot des formulaires publics (B-F10).
 *
 * Deux champs, envoyés dans le corps de la requête par le site :
 * - `website` : champ piège, caché au visiteur. Un robot qui remplit tous les champs le remplit aussi :
 *   la requête reçoit alors une réponse de succès factice, sans rien enregistrer ni envoyer ;
 * - `turnstileToken` : jeton Cloudflare Turnstile, vérifié auprès de Cloudflare quand
 *   `TURNSTILE_SECRET_KEY` est défini. Sans cette variable, la vérification est désactivée
 *   (développement local, tests).
 *
 * Une requête de l'admin connecté (jeton JWT valide) n'est pas contrôlée.
 */

export const HONEYPOT_FIELD = 'website'
export const TURNSTILE_FIELD = 'turnstileToken'

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const VERIFY_TIMEOUT_MS = 5_000

/** Champs anti-robot, acceptés par les DTO des formulaires publics (ignorés ensuite). */
export class AntiBotDto {
  @ApiProperty({ description: 'Champ piège : doit rester vide', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  readonly website?: string

  @ApiProperty({ description: 'Jeton Cloudflare Turnstile du formulaire', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  readonly turnstileToken?: string
}

const FAKE_RESPONSE = 'antiBotFakeResponse'

type TurnstileResult = { success: boolean, 'error-codes'?: string[] }

@Injectable()
export class AntiBotInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AntiBotInterceptor.name)

  constructor(private readonly reflector: Reflector, private readonly config: ConfigService) { }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request & { user?: unknown }>()
    if (request.user) return next.handle()

    const body = (request.body ?? {}) as Record<string, unknown>

    const honeypot = body[HONEYPOT_FIELD]
    if (typeof honeypot === 'string' && honeypot.trim() !== '') {
      this.logger.warn(`Champ piège rempli sur ${request.method} ${request.path} : requête ignorée`)
      return of(this.reflector.get<unknown>(FAKE_RESPONSE, context.getHandler()) ?? {})
    }

    const token = body[TURNSTILE_FIELD]
    return from(this.verify(typeof token === 'string' ? token : '', request.ip)).pipe(switchMap(() => next.handle()))
  }

  private async verify(token: string, ip?: string): Promise<void> {
    const secret = this.config.get<string>('TURNSTILE_SECRET_KEY')
    if (!secret) return

    if (!token) throw new ForbiddenException('Vérification anti-robot manquante')

    let result: TurnstileResult
    try {
      const response = await fetch(SITEVERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, response: token, ...(ip ? { remoteip: ip } : {}) }),
        signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      result = (await response.json()) as TurnstileResult
    } catch (error) {
      // Cloudflare injoignable : on laisse passer plutôt que de perdre une demande de réservation.
      // La limite de débit reste active.
      const reason = error instanceof Error ? error.message : String(error)
      this.logger.error(`Vérification Turnstile impossible, requête acceptée sans contrôle : ${reason}`)
      return
    }

    if (!result.success) {
      this.logger.warn(`Jeton Turnstile refusé : ${(result['error-codes'] ?? []).join(', ') || 'sans code'}`)
      throw new ForbiddenException('Vérification anti-robot échouée')
    }
  }
}

/**
 * Active la protection anti-robot sur une route publique.
 * `fakeResponse` : corps renvoyé à un robot pris au champ piège (même forme qu'un vrai succès).
 */
export const ProtectFromBots = (fakeResponse: unknown = {}) =>
  applyDecorators(SetMetadata(FAKE_RESPONSE, fakeResponse), UseInterceptors(AntiBotInterceptor))
