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
  return apiFetch<SeriesPage>(`/series?${q.toString()}`, { auth: false });
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
  return apiFetch<SubmissionDto[]>('/submissions/pending');
}

export function approveSubmission(id: string): Promise<SubmissionDto> {
  return apiFetch<SubmissionDto>(`/submissions/${id}/approve`, { method: 'POST' });
}

export function rejectSubmission(id: string): Promise<SubmissionDto> {
  return apiFetch<SubmissionDto>(`/submissions/${id}/reject`, { method: 'POST' });
}
