import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class ChatMessageDto implements ChatMessage {
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content!: string;
}

export class AssistDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  prompt!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  history?: ChatMessageDto[];

  /** Optional OpenRouter model override. Falls back to OPENROUTER_MODEL env var. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  model?: string;
}
