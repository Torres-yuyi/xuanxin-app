import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';
import type { RegisterRequest } from '@shared/api.interface';

export class RegisterDto implements RegisterRequest {
  @IsString()
  @MinLength(3, { message: '用户名至少 3 个字符' })
  @MaxLength(32, { message: '用户名最多 32 个字符' })
  username!: string;

  @IsString()
  @MinLength(6, { message: '密码至少 6 个字符' })
  @MaxLength(64, { message: '密码最多 64 个字符' })
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(32, { message: '昵称最多 32 个字符' })
  nickname?: string;
}
