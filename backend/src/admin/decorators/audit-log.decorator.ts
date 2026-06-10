import { SetMetadata } from '@nestjs/common';

export const AUDIT_LOG_KEY = 'admin:audit_log';

export interface AuditLogMeta {
  actionType: string;
  targetType?: string;
}

/**
 * Marks a controller method for automatic audit logging.
 * The AuditLogInterceptor reads this metadata and writes to admin_action_logs
 * after the handler resolves successfully.
 *
 * Usage:
 *   @AuditLog({ actionType: 'submission.approve', targetType: 'submission' })
 */
export const AuditLog = (meta: AuditLogMeta) =>
  SetMetadata(AUDIT_LOG_KEY, meta);
