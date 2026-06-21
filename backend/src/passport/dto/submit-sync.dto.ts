import { IsNotEmpty, IsString } from 'class-validator';

export class SubmitSyncDto {
  /** Base64 transaction bytes returned by /passport/sync/build. */
  @IsString()
  @IsNotEmpty()
  txBytes!: string;

  /** Serialized zkLogin signature over the transaction bytes. */
  @IsString()
  @IsNotEmpty()
  userSignature!: string;
}
