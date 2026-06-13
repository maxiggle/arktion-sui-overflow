export interface AuthUser {
  id: string;
  walletAddress: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface AuthResult {
  sessionToken: string;
  expiresAt: string;
  /** true on first-ever sign-in — triggers onboarding redirect */
  isNewUser: boolean;
  user: AuthUser;
}
