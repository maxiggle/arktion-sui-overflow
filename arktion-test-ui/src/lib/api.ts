import { clearSession, getSessionToken, type StoredUser } from './auth-storage';
import { clearAdminSession, getAdminToken } from './admin-auth';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1';

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
  // Auth scope:
  //   'user'  → attach the zkLogin session token (default)
  //   'admin' → attach the admin access token
  //   'none'  → no Authorization header
  auth?: 'user' | 'admin' | 'none' | boolean;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = 'user' } = options;
  // Back-compat with the original `auth?: boolean` API.
  const authScope: 'user' | 'admin' | 'none' =
    auth === false ? 'none' : auth === true ? 'user' : auth;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (authScope === 'user') {
    const token = getSessionToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  } else if (authScope === 'admin') {
    const token = getAdminToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  // Session expired or revoked: drop the matching local auth.
  if (res.status === 401) {
    if (authScope === 'admin') {
      clearAdminSession();
    } else if (authScope === 'user') {
      clearSession();
      notifyAuthChanged();
    }
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
  identityBlobUrl: string | null;
  lastSyncedAt: string;
  explorerUrl: string;
  walletAddress: string;
  imageUrl: string | null;
}

export interface SnapshotResult {
  blobId: string;
  walrusUrl: string;
  snapshotAt: string;
  recordCount: number;
  onChainAnchored: boolean;
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
    auth: 'none',
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

export function takePassportSnapshot(): Promise<SnapshotResult> {
  return apiFetch<SnapshotResult>('/passport/snapshot', { method: 'POST' });
}

// ── INK ──────────────────────────────────────────────────────────────────────

export interface InkBalanceDto {
  balance: string;
  level: number;
  totalInkEarned: string;
}

export interface InkLedgerEntryDto {
  id: string;
  actionType: number;
  amount: string;
  idempotencyKey: string;
  suiTxDigest: string | null;
  createdAt: string;
}

export interface InkLedgerPage {
  data: InkLedgerEntryDto[];
  total: number;
  page: number;
  limit: number;
}

export const INK_ACTION_LABELS: Record<number, string> = {
  0: 'Chapter Read',
  1: 'Series Complete',
  2: 'Submission Approved',
};

export function getInkBalance(): Promise<InkBalanceDto> {
  return apiFetch<InkBalanceDto>('/ink/balance');
}

export function getInkLedger(page = 1, limit = 10): Promise<InkLedgerPage> {
  return apiFetch<InkLedgerPage>(`/ink/ledger?page=${page}&limit=${limit}`);
}

// ── BADGES ───────────────────────────────────────────────────────────────────

export interface BadgeDto {
  id: string;
  suiObjectId: string;
  category: number;
  badgeType: number;
  seriesId: string | null;
  tier: number;
  metadataBlobId: string;
  awardedAt: string;
}

export const BADGE_CATEGORY_LABELS: Record<number, string> = {
  0: 'Reading', 1: 'Community', 2: 'Series Lore', 3: 'Creator', 4: 'Contributor',
};

export const BADGE_TYPE_LABELS: Record<number, Record<number, string>> = {
  0: { 0: 'First Chapter', 1: 'Binge Reader', 2: 'Completionist', 3: 'Marathon Reader', 4: 'OG Reader' },
  4: { 0: 'Submission Approved', 1: 'Translation Bounty', 2: 'Fanfiction Patron' },
};

export function getMyBadges(): Promise<BadgeDto[]> {
  return apiFetch<BadgeDto[]>('/badges');
}

// ── SERIES ───────────────────────────────────────────────────────────────────

export interface SeriesDto {
  id: string;
  externalId: string;
  title: string;
  formatType: number;
  sourceLanguage: string;
  coverUrl: string | null;
  description: string | null;
  status: string;
  createdAt: string;
}

export interface SeriesPage {
  data: SeriesDto[];
  total: number;
  page: number;
  limit: number;
}

export const FORMAT_LABELS: Record<number, string> = {
  0: 'Novel', 1: 'Manga', 2: 'Manhwa', 3: 'Manhua', 4: 'Webtoon',
};

export function getSeries(params: {
  search?: string;
  formatType?: number;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<SeriesPage> {
  const q = new URLSearchParams();
  if (params.search) q.set('search', params.search);
  if (params.formatType !== undefined) q.set('formatType', String(params.formatType));
  if (params.status) q.set('status', params.status);
  q.set('page', String(params.page ?? 1));
  q.set('limit', String(params.limit ?? 10));
  return apiFetch<SeriesPage>(`/series?${q.toString()}`, { auth: 'none' });
}

// ── CHAPTERS / READER ────────────────────────────────────────────────────────

export interface ChapterDto {
  id: string;
  seriesId: string;
  chapterNumber: number;
  title: string | null;
  language: string;
  pageCount: number;
  isLicensed: boolean;
  inkCost: number;
  publishedAt: string | null;
}

export interface PageDto {
  pageNumber: number;
  imageUrl: string;
}

export function getChapters(
  seriesId: string,
  language = 'en',
  refresh = false,
): Promise<ChapterDto[]> {
  const q = new URLSearchParams({ language });
  if (refresh) q.set('refresh', 'true');
  return apiFetch<ChapterDto[]>(`/series/${seriesId}/chapters?${q.toString()}`, {
    auth: 'none',
  });
}

export function getChapterPages(
  chapterId: string,
  dataSaver = false,
): Promise<PageDto[]> {
  const q = new URLSearchParams();
  if (dataSaver) q.set('dataSaver', 'true');
  const qs = q.toString();
  return apiFetch<PageDto[]>(
    `/chapters/${chapterId}/pages${qs ? `?${qs}` : ''}`,
    { auth: 'none' },
  );
}

// ── READING ──────────────────────────────────────────────────────────────────

export interface ReadingRecordDto {
  id: string;
  seriesId: string;
  status: number;
  currentChapter: number;
  lastReadAt: string;
  completedAt: string | null;
  createdAt: string;
}

export const READING_STATUS_LABELS: Record<number, string> = {
  0: 'Reading', 1: 'Completed', 2: 'On Hold', 3: 'Dropped', 4: 'Plan to Read',
};

export function getMyReadingRecords(status?: number): Promise<ReadingRecordDto[]> {
  const q = status !== undefined ? `?status=${status}` : '';
  return apiFetch<ReadingRecordDto[]>(`/reading/records${q}`);
}

export function upsertReadingRecord(body: {
  seriesId: string;
  status: number;
  currentChapter: number;
}): Promise<ReadingRecordDto> {
  return apiFetch<ReadingRecordDto>('/reading/records', { method: 'POST', body });
}

export function deleteReadingRecord(seriesId: string): Promise<void> {
  return apiFetch<void>(`/reading/records/${seriesId}`, { method: 'DELETE' });
}

// ── JOURNAL ──────────────────────────────────────────────────────────────────

export interface JournalEntryDto {
  id: string;
  entryId: string;
  externalTitle: string;
  formatType: number;
  externalUrl: string;
  totalChapters: number;
  currentChapter: number;
  notes: string | null;
  submittedAsSuggestion: boolean;
  createdAt: string;
  updatedAt: string;
}

export function getJournalEntries(): Promise<JournalEntryDto[]> {
  return apiFetch<JournalEntryDto[]>('/journal/entries');
}

export function createJournalEntry(body: {
  externalTitle: string;
  formatType: number;
  externalUrl: string;
  totalChapters?: number;
  currentChapter?: number;
  notes?: string;
}): Promise<JournalEntryDto> {
  return apiFetch<JournalEntryDto>('/journal/entries', { method: 'POST', body });
}

export function updateJournalEntry(
  entryId: string,
  body: { currentChapter?: number; totalChapters?: number; notes?: string },
): Promise<JournalEntryDto> {
  return apiFetch<JournalEntryDto>(`/journal/entries/${entryId}`, { method: 'PATCH', body });
}

export function deleteJournalEntry(entryId: string): Promise<void> {
  return apiFetch<void>(`/journal/entries/${entryId}`, { method: 'DELETE' });
}

// ── SUBMISSIONS ───────────────────────────────────────────────────────────────

export interface SubmissionDto {
  id: string;
  title: string;
  formatType: number;
  externalUrl: string;
  suggestedSource: string;
  status: number;
  rewardClaimed: boolean;
  reviewedAt: string | null;
  createdAt: string;
}

export const SUBMISSION_STATUS_LABELS: Record<number, string> = {
  0: 'Pending', 1: 'Approved', 2: 'Rejected',
};

export function createSubmission(body: {
  title: string;
  formatType: number;
  externalUrl: string;
  suggestedSource: string;
}): Promise<SubmissionDto> {
  return apiFetch<SubmissionDto>('/submissions', { method: 'POST', body });
}

export function getMySubmissions(): Promise<SubmissionDto[]> {
  return apiFetch<SubmissionDto[]>('/submissions/mine');
}

export function getPendingSubmissions(): Promise<SubmissionDto[]> {
  return apiFetch<SubmissionDto[]>('/submissions/pending', { auth: 'admin' });
}

export function approveSubmission(id: string): Promise<SubmissionDto> {
  return apiFetch<SubmissionDto>(`/submissions/${id}/approve`, {
    method: 'POST',
    auth: 'admin',
  });
}

export function rejectSubmission(id: string): Promise<SubmissionDto> {
  return apiFetch<SubmissionDto>(`/submissions/${id}/reject`, {
    method: 'POST',
    auth: 'admin',
  });
}

// ── ADMIN AUTH ───────────────────────────────────────────────────────────────

export interface AdminTokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AdminLoginResponse {
  requiresTotp: boolean;
  preAuthToken?: string;
  tokens?: AdminTokenPair;
}

export interface AdminTotpSetupResponse {
  secret: string;
  otpauthUrl: string;
  backupCodes: string[];
}

export interface AdminTotpConfirmResponse {
  message: string;
  backupCodes: string[];
}

export function adminLogin(body: {
  email: string;
  password: string;
}): Promise<AdminLoginResponse> {
  return apiFetch<AdminLoginResponse>('/admin/auth/login', {
    method: 'POST',
    body,
    auth: 'none',
  });
}

export function adminValidateTotp(body: {
  preAuthToken: string;
  code: string;
}): Promise<AdminTokenPair> {
  return apiFetch<AdminTokenPair>('/admin/auth/totp/validate', {
    method: 'POST',
    body,
    auth: 'none',
  });
}

export function adminLogout(): Promise<void> {
  return apiFetch<void>('/admin/auth/logout', {
    method: 'DELETE',
    auth: 'admin',
  });
}

export function adminLogoutAll(): Promise<void> {
  return apiFetch<void>('/admin/auth/logout/all', {
    method: 'DELETE',
    auth: 'admin',
  });
}

export function adminInitTotpSetup(): Promise<AdminTotpSetupResponse> {
  return apiFetch<AdminTotpSetupResponse>('/admin/auth/totp/setup/init', {
    method: 'POST',
    auth: 'admin',
  });
}

export function adminConfirmTotpSetup(code: string): Promise<AdminTotpConfirmResponse> {
  return apiFetch<AdminTotpConfirmResponse>('/admin/auth/totp/setup/confirm', {
    method: 'POST',
    body: { code },
    auth: 'admin',
  });
}

export function adminDisableTotp(code: string): Promise<void> {
  return apiFetch<void>('/admin/auth/totp', {
    method: 'DELETE',
    body: { code },
    auth: 'admin',
  });
}

// ── ADMIN USERS ──────────────────────────────────────────────────────────────

export type AdminRoleStr = 'SUPER_ADMIN' | 'MODERATOR' | 'REVIEWER';

export interface AdminUserDto {
  id: string;
  email: string;
  role: AdminRoleStr;
  isActive: boolean;
  totpEnabled: boolean;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  createdAt: string;
}

export const ADMIN_ROLES: AdminRoleStr[] = ['REVIEWER', 'MODERATOR', 'SUPER_ADMIN'];

export function getAdminUsers(): Promise<AdminUserDto[]> {
  return apiFetch<AdminUserDto[]>('/admin/users', { auth: 'admin' });
}

export function createAdminUser(body: {
  email: string;
  password: string;
  role: AdminRoleStr;
}): Promise<AdminUserDto> {
  return apiFetch<AdminUserDto>('/admin/users', {
    method: 'POST',
    body,
    auth: 'admin',
  });
}

export function updateAdminUserRole(
  id: string,
  role: AdminRoleStr,
): Promise<AdminUserDto> {
  return apiFetch<AdminUserDto>(`/admin/users/${id}/role`, {
    method: 'PATCH',
    body: { role },
    auth: 'admin',
  });
}

export function deactivateAdminUser(id: string): Promise<void> {
  return apiFetch<void>(`/admin/users/${id}/deactivate`, {
    method: 'POST',
    auth: 'admin',
  });
}

export function activateAdminUser(id: string): Promise<void> {
  return apiFetch<void>(`/admin/users/${id}/activate`, {
    method: 'POST',
    auth: 'admin',
  });
}
