import { Injectable, Inject, Logger, ConflictException, BadRequestException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';

import { xuanUsers } from '@server/database/schema';
import type { AuthResponse, AuthUser } from '@shared/api.interface';
import { signToken } from './jwt-auth.guard';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async register(username: string, password: string, nickname?: string): Promise<AuthResponse> {
    const existing = await this.db
      .select({ id: xuanUsers.id })
      .from(xuanUsers)
      .where(eq(xuanUsers.username, username))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException('用户名已被占用');
    }

    const passwordHash = bcrypt.hashSync(password, 10);

    const [inserted] = await this.db
      .insert(xuanUsers)
      .values({
        username,
        passwordHash,
        nickname: nickname ?? null,
      })
      .returning({ id: xuanUsers.id, username: xuanUsers.username, nickname: xuanUsers.nickname });

    const user: AuthUser = {
      id: inserted.id,
      username: inserted.username,
      nickname: inserted.nickname ?? undefined,
    };
    const token = signToken({ id: user.id, username: user.username });

    return { token, user };
  }

  async login(username: string, password: string): Promise<AuthResponse> {
    const [userRow] = await this.db
      .select({
        id: xuanUsers.id,
        username: xuanUsers.username,
        nickname: xuanUsers.nickname,
        passwordHash: xuanUsers.passwordHash,
      })
      .from(xuanUsers)
      .where(eq(xuanUsers.username, username))
      .limit(1);

    if (!userRow) {
      throw new BadRequestException('用户名或密码错误');
    }

    const valid = bcrypt.compareSync(password, userRow.passwordHash);
    if (!valid) {
      throw new BadRequestException('用户名或密码错误');
    }

    const user: AuthUser = {
      id: userRow.id,
      username: userRow.username,
      nickname: userRow.nickname ?? undefined,
    };
    const token = signToken({ id: user.id, username: user.username });

    return { token, user };
  }

  async getCurrentUser(userId: string): Promise<AuthUser> {
    const [userRow] = await this.db
      .select({
        id: xuanUsers.id,
        username: xuanUsers.username,
        nickname: xuanUsers.nickname,
      })
      .from(xuanUsers)
      .where(eq(xuanUsers.id, userId))
      .limit(1);

    if (!userRow) {
      throw new BadRequestException('用户不存在');
    }

    return {
      id: userRow.id,
      username: userRow.username,
      nickname: userRow.nickname ?? undefined,
    };
  }
}
