import { IsString, Length } from 'class-validator';

export class AdminTotpValidateDto {
  /** Short-lived pre-auth token returned when TOTP is required. */
  @IsString()
  preAuthToken!: string;

  /**
   * Six-digit TOTP code from authenticator app, or an 8-character hex backup code.
   */
  @IsString()
  @Length(6, 8)
  code!: string;
}
