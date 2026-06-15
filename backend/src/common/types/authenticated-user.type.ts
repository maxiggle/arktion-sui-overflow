/**
 * Shape of `request.user` after JwtAuthGuard authenticates a request.
 * Lightweight by design — controllers can fetch the full user record from
 * UsersService when they need more data.
 */
export interface AuthenticatedUser {
  id: string;
  walletAddress: string;
  sessionId: string;
}
