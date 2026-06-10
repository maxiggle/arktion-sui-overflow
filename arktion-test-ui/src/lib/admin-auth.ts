/**
 * Storage + helpers for the admin session.
 *
 * The admin session is completely separate from the user (zkLogin) session.
 * Admin requests use the admin token; user requests use the user token.
 */

export interface StoredAdmin {
  id: string;
  email: string;
  role: 'SUPER_ADMIN' | 'MODERATOR' | 'REVIEWER';
}

const ADMIN_TOKEN_KEY = 'arktion.adminAccessToken';
const ADMIN_REFRESH_KEY = 'arktion.adminRefreshToken';
const ADMIN_USER_KEY = 'arktion.adminUser';

export const ADMIN_AUTH_CHANGED_EVENT = 'arktion:admin-auth-changed';

export function notifyAdminAuthChanged(): void {
  window.dispatchEvent(new Event(ADMIN_AUTH_CHANGED_EVENT));
}

export function getAdminToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function getAdminRefreshToken(): string | null {
  return localStorage.getItem(ADMIN_REFRESH_KEY);
}

export function getStoredAdmin(): StoredAdmin | null {
  const raw = localStorage.getItem(ADMIN_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredAdmin;
  } catch {
    return null;
  }
}

export function setAdminSession(params: {
  accessToken: string;
  refreshToken: string;
  admin: StoredAdmin;
}): void {
  localStorage.setItem(ADMIN_TOKEN_KEY, params.accessToken);
  localStorage.setItem(ADMIN_REFRESH_KEY, params.refreshToken);
  localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(params.admin));
  notifyAdminAuthChanged();
}

export function clearAdminSession(): void {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_REFRESH_KEY);
  localStorage.removeItem(ADMIN_USER_KEY);
  notifyAdminAuthChanged();
}
