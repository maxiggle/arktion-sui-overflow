import { clearSession, getSessionToken, type StoredUser } from './auth-storage';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1';

// /health is mounted at the origin root by the backend, NOT under /api/v1.
const HEALTH_URL = `${API_BASE_URL.replace(/\/api\/v1\/?$/, '')}/health`;

// Fired whenever the session changes (login, logout, or a 401 that clears auth)
// so the App can re-read the token and re-render the authenticated sections.
export const AUTH_CHANGED_EVENT = 'arktion:auth-changed';

export function notifyAuthChanged(): void {
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  // Attach the bearer token. Defaults to true.
  auth?: boolean;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = getSessionToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  // Session expired or revoked: drop local auth and re-prompt sign-in.
  if (res.status === 401) {
    clearSession();
    notifyAuthChanged();
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new ApiError(res.status, extractMessage(errBody, res.status), errBody);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function extractMessage(body: unknown, status: number): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const msg = (body as { message: unknown }).message;
    if (Array.isArray(msg)) return msg.join(', ');
    if (typeof msg === 'string') return msg;
  }
  return `Request failed with status ${status}`;
}

// ---- Response types ----

export interface HealthResponse {
  status: string;
  uptime: number;
  timestamp: string;
  checks: Record<string, string>;
  network: string;
  version: string;
}

export interface UserProfile {
  id: string;
  walletAddress: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

export interface ZkLoginCompleteResponse {
  sessionToken: string;
  expiresAt: string;
  isNewUser: boolean;
  user: StoredUser;
}

export interface PassportResponse {
  objectId: string;
  level: number;
  totalInkEarned: string;
  chaptersRead: number;
  seriesCompleted: number;
  seriesTracked: number;
  identityBlobId: string | null;
  lastSyncedAt: string;
  explorerUrl: string;
}

export interface UpdateProfileBody {
  displayName?: string;
  avatarUrl?: string;
}

// ---- Endpoint helpers ----

export async function getHealth(): Promise<HealthResponse> {
  const res = await fetch(HEALTH_URL);
  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new ApiError(res.status, extractMessage(errBody, res.status), errBody);
  }
  return (await res.json()) as HealthResponse;
}

export function completeZkLogin(jwt: string): Promise<ZkLoginCompleteResponse> {
  return apiFetch<ZkLoginCompleteResponse>('/auth/zklogin/complete', {
    method: 'POST',
    body: { jwt },
    auth: false,
  });
}

export function logout(): Promise<void> {
  return apiFetch<void>('/auth/logout', { method: 'POST' });
}

export function getMyProfile(): Promise<UserProfile> {
  return apiFetch<UserProfile>('/users/me');
}

export function updateMyProfile(body: UpdateProfileBody): Promise<UserProfile> {
  return apiFetch<UserProfile>('/users/me', { method: 'PATCH', body });
}

export function getMyPassport(): Promise<PassportResponse> {
  return apiFetch<PassportResponse>('/passport/me');
}
