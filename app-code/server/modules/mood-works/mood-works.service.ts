import { Injectable, Inject, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, desc, and, gte, lt, count } from 'drizzle-orm';

import { moodWorks } from '@server/database/schema';
import type {
  MoodWork,
  MoodWorkCreateRequest,
  MoodWorkListResponse,
  EmotionCategory,
  DominantColor,
} from '@shared/api.interface';

@Injectable()
export class MoodWorksService {
  private readonly logger = new Logger(MoodWorksService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async create(userId: string, dto: MoodWorkCreateRequest): Promise<MoodWork> {
    const [inserted] = await this.db
      .insert(moodWorks)
      .values({
        userId,
        moodText: dto.moodText,
        imageUrl: dto.imageUrl,
        emotionCategory: dto.emotionCategory,
        dominantColors: dto.dominantColors as unknown as Record<string, unknown>[],
      })
      .returning({
        id: moodWorks.id,
        userId: moodWorks.userId,
        moodText: moodWorks.moodText,
        imageUrl: moodWorks.imageUrl,
        emotionCategory: moodWorks.emotionCategory,
        dominantColors: moodWorks.dominantColors,
        createdAt: moodWorks.createdAt,
      });

    return this.toMoodWork(inserted);
  }

  async list(userId: string, page: number, pageSize: number): Promise<MoodWorkListResponse> {
    const offset = (page - 1) * pageSize;

    const [countResult] = await this.db
      .select({ count: count() })
      .from(moodWorks)
      .where(eq(moodWorks.userId, userId));

    const rows = await this.db
      .select({
        id: moodWorks.id,
        userId: moodWorks.userId,
        moodText: moodWorks.moodText,
        imageUrl: moodWorks.imageUrl,
        emotionCategory: moodWorks.emotionCategory,
        dominantColors: moodWorks.dominantColors,
        createdAt: moodWorks.createdAt,
      })
      .from(moodWorks)
      .where(eq(moodWorks.userId, userId))
      .orderBy(desc(moodWorks.createdAt))
      .limit(pageSize)
      .offset(offset);

    return {
      items: rows.map((r: typeof rows[number]) => this.toMoodWork(r)),
      total: countResult.count,
    };
  }

  async getByDateRange(userId: string, startDate: string, endDate: string): Promise<MoodWork[]> {
    const start = new Date(startDate);
    // endDate 是包含的日期，取次日 0 点作为半开区间上界
    const end = new Date(endDate);
    end.setDate(end.getDate() + 1);

    const rows = await this.db
      .select({
        id: moodWorks.id,
        userId: moodWorks.userId,
        moodText: moodWorks.moodText,
        imageUrl: moodWorks.imageUrl,
        emotionCategory: moodWorks.emotionCategory,
        dominantColors: moodWorks.dominantColors,
        createdAt: moodWorks.createdAt,
      })
      .from(moodWorks)
      .where(and(
        eq(moodWorks.userId, userId),
        gte(moodWorks.createdAt, start),
        lt(moodWorks.createdAt, end),
      ))
      .orderBy(desc(moodWorks.createdAt));

    return rows.map((r: typeof rows[number]) => this.toMoodWork(r));
  }

  async getByYear(userId: string, year: number): Promise<MoodWork[]> {
    const start = new Date(`${year}-01-01T00:00:00.000Z`);
    const end = new Date(`${year + 1}-01-01T00:00:00.000Z`);

    const rows = await this.db
      .select({
        id: moodWorks.id,
        userId: moodWorks.userId,
        moodText: moodWorks.moodText,
        imageUrl: moodWorks.imageUrl,
        emotionCategory: moodWorks.emotionCategory,
        dominantColors: moodWorks.dominantColors,
        createdAt: moodWorks.createdAt,
      })
      .from(moodWorks)
      .where(and(
        eq(moodWorks.userId, userId),
        gte(moodWorks.createdAt, start),
        lt(moodWorks.createdAt, end),
      ))
      .orderBy(desc(moodWorks.createdAt));

    return rows.map((r: typeof rows[number]) => this.toMoodWork(r));
  }

  async remove(userId: string, id: string): Promise<void> {
    const [work] = await this.db
      .select({ id: moodWorks.id, userId: moodWorks.userId })
      .from(moodWorks)
      .where(eq(moodWorks.id, id))
      .limit(1);

    if (!work) {
      throw new NotFoundException('作品不存在');
    }
    if (work.userId !== userId) {
      throw new ForbiddenException('无权删除他人作品');
    }

    await this.db.delete(moodWorks).where(eq(moodWorks.id, id));
  }

  private toMoodWork(row: {
    id: string;
    userId: string;
    moodText: string;
    imageUrl: string;
    emotionCategory: string;
    dominantColors: unknown;
    createdAt: Date;
  }): MoodWork {
    return {
      id: row.id,
      userId: row.userId,
      moodText: row.moodText,
      imageUrl: row.imageUrl,
      emotionCategory: row.emotionCategory as EmotionCategory,
      dominantColors: (row.dominantColors as DominantColor[] | null) ?? [],
      createdAt: row.createdAt.toISOString(),
    };
  }
}
