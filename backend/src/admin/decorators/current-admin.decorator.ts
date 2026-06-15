import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedAdmin } from '../types/authenticated-admin.type';

type RequestWithAdmin = Request & { admin: AuthenticatedAdmin };

export const CurrentAdmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedAdmin => {
    const request = ctx.switchToHttp().getRequest<RequestWithAdmin>();
    return request.admin;
  },
);
