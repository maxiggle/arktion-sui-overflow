import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';

import { PrismaService } from '../../prisma/prisma.service';
import { AUDIT_LOG_KEY, AuditLogMeta } from '../decorators/audit-log.decorator';
import type { AuthenticatedAdmin } from '../types/authenticated-admin.type';

/**
 * Intercepts admin routes decorated with @AuditLog() and writes a record to
 * admin_action_logs after the handler resolves successfully.
 *
 * targetId is extracted from:
 *   1. route params (`:id`, `:adminId`, `:submissionId`, etc.) — first UUID found
 *   2. the response body's `id` field if no param found
 *
 * Applied globally to the AdminModule via AdminModule providers.
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.get<AuditLogMeta | undefined>(
      AUDIT_LOG_KEY,
      context.getHandler(),
    );

    if (!meta) return next.handle();

    const request = context.switchToHttp().getRequest<
      Request & { admin?: AuthenticatedAdmin }
    >();

    const adminId = request.admin?.id ?? null;
    const ipAddress = request.ip ?? null;

    // Extract targetId from route params (first UUID-shaped value)
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const params = request.params as Record<string, string>;
    const targetId =
      Object.values(params).find((v) => uuidPattern.test(v)) ?? null;

    return next.handle().pipe(
      tap({
        next: (responseBody: unknown) => {
          const resolvedTargetId =
            targetId ??
            (responseBody &&
            typeof responseBody === 'object' &&
            'id' in responseBody &&
            typeof (responseBody as Record<string, unknown>).id === 'string'
              ? (responseBody as Record<string, unknown>).id as string
              : null);

          this.prisma.adminActionLog
            .create({
              data: {
                adminId,
                actionType: meta.actionType,
                targetId: resolvedTargetId,
                targetType: meta.targetType ?? null,
                ipAddress,
                metadata: {
                  method: request.method,
                  path: request.path,
                },
              },
            })
            .catch(() => {
              // Audit log failure must never break the response
            });
        },
      }),
    );
  }
}
