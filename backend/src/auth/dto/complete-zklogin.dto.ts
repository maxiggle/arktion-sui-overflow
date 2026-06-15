import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Body of POST /api/v1/auth/zklogin/complete.
 *
 * The frontend has already completed the OAuth dance with Google and received
 * the JWT. It posts the JWT here; the backend verifies it, derives the user's
 * Sui address, bootstraps their on-chain identity on first login, and returns
 * a session token for subsequent API calls.
 */
export class CompleteZkLoginDto {
  /**
   * Raw Google ID token (JWT). Three base64 segments separated by dots.
   * Signature is verified against Google's JWKS at runtime.
   */
  @IsString()
  @IsNotEmpty()
  jwt!: string;
}
