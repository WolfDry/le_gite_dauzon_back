import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from './public.decorator';

/**
 * Garde global : une route est réservée au back office (JWT obligatoire)
 * sauf si elle est marquée `@Public()`.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!isPublic) {
      return (await super.canActivate(context)) as boolean;
    }

    // Route publique : on identifie quand même l'admin s'il envoie un jeton valide
    // (certaines routes publiques acceptent plus de champs pour lui), sans jamais bloquer.
    try {
      await super.canActivate(context);
    } catch {
      // visiteur anonyme
    }
    return true;
  }
}
