import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export type AuthUser = { userId: number; email: string };

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser | null =>
    context.switchToHttp().getRequest().user ?? null,
);
