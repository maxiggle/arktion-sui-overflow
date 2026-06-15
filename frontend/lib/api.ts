/**
 * Backward-compat re-exports.
 * New code should import from @/lib/api/client and @/lib/types/auth directly.
 */
export { apiClient as api } from "./api/client";
export type { AuthUser, AuthResult } from "./types/auth";
