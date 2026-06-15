export enum AdminRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  MODERATOR = 'MODERATOR',
  REVIEWER = 'REVIEWER',
}

/**
 * Role hierarchy. Higher index = more privileged.
 * Used by RoleGuard to enforce minimum role requirements.
 */
export const ROLE_RANK: Record<AdminRole, number> = {
  [AdminRole.REVIEWER]: 0,
  [AdminRole.MODERATOR]: 1,
  [AdminRole.SUPER_ADMIN]: 2,
};
