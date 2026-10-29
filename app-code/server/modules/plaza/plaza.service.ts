import { Injectable, Inject, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, desc, and, lt, inArray } from 'drizzle-orm';

import {
  plazaPosts,
  plazaLikes,
  plazaComments,
} from '@server/database/schema';
import type {
  PlazaPost,
  PlazaPostCreateRequest,
  PlazaPostListResponse,
  PlazaComment,
  EmotionCategory,
  LikeToggleResponse,
} from '@shared/api.interface';

const SENSITIVE_WORDS = ['傻逼', '操你', '去死', '狗娘养的', '废物', '垃圾人'];

@Injectable()
export class PlazaService {
  private readonly logger = new Logger(PlazaService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async listPosts(
    cursor: string | undefined,
    limit: number,
    userId?: string,
  ): Promise<PlazaPostListResponse> {
    const conditions = [];
    if (cursor) {
      conditions.push(lt(plazaPosts.createdAt, new Date(cursor)));
    }

    const rows = await this.db
      .select({
        id: plazaPosts.id,
        workId: plazaPosts.workId,
        userId: plazaPosts.userId,
        imageUrl: plazaPosts.imageUrl,
        caption: plazaPosts.caption,
        supplementText: plazaPosts.supplementText,
        likeCount: plazaPosts.likeCount,
        commentCount: plazaPosts.commentCount,
        emotionCategory: plazaPosts.emotionCategory,
        createdAt: plazaPosts.createdAt,
      })
      .from(plazaPosts)
      .where(and(...conditions))
      .orderBy(desc(plazaPosts.createdAt))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : undefined;

    let isLikedMap: Map<string, boolean> | undefined;
    if (userId && items.length > 0) {
      const postIds = items.map((p: typeof items[number]) => p.id);
      const likedRows = await this.db
        .select({ postId: plazaLikes.postId })
        .from(plazaLikes)
        .where(and(
          inArray(plazaLikes.postId, postIds),
          eq(plazaLikes.userId, userId),
        ));
      isLikedMap = new Map<string, boolean>();
      for (const r of likedRows) {
        isLikedMap.set(r.postId, true);
      }
    }

    return {
      items: items.map((r: typeof items[number]) => this.toPlazaPost(r, isLikedMap?.get(r.id))),
      nextCursor,
      hasMore,
    };
  }

  async listMyPosts(
    userId: string,
    limit: number,
  ): Promise<{ items: PlazaPost[]; total: number; totalLikes: number }> {
    const rows = await this.db
      .select({
        id: plazaPosts.id,
        workId: plazaPosts.workId,
        userId: plazaPosts.userId,
        imageUrl: plazaPosts.imageUrl,
        caption: plazaPosts.caption,
        supplementText: plazaPosts.supplementText,
        likeCount: plazaPosts.likeCount,
        commentCount: plazaPosts.commentCount,
        emotionCategory: plazaPosts.emotionCategory,
        createdAt: plazaPosts.createdAt,
      })
      .from(plazaPosts)
      .where(eq(plazaPosts.userId, userId))
      .orderBy(desc(plazaPosts.createdAt))
      .limit(limit);

    const totalLikes = rows.reduce((sum: number, r: typeof rows[number]) => sum + r.likeCount, 0);

    return {
      items: rows.map((r: typeof rows[number]) => this.toPlazaPost(r, true)),
      total: rows.length,
      totalLikes,
    };
  }

  async createPost(userId: string, dto: PlazaPostCreateRequest): Promise<PlazaPost> {
    const [inserted] = await this.db
      .insert(plazaPosts)
      .values({
        workId: dto.workId ?? null,
        userId,
        imageUrl: dto.imageUrl,
        caption: dto.caption,
        supplementText: dto.supplementText ?? null,
        emotionCategory: dto.emotionCategory,
      })
      .returning({
        id: plazaPosts.id,
        workId: plazaPosts.workId,
        userId: plazaPosts.userId,
        imageUrl: plazaPosts.imageUrl,
        caption: plazaPosts.caption,
        supplementText: plazaPosts.supplementText,
        likeCount: plazaPosts.likeCount,
        commentCount: plazaPosts.commentCount,
        emotionCategory: plazaPosts.emotionCategory,
        createdAt: plazaPosts.createdAt,
      });

    return this.toPlazaPost(inserted, false);
  }

  async toggleLike(postId: string, userId: string): Promise<LikeToggleResponse> {
    const [post] = await this.db
      .select({ id: plazaPosts.id, likeCount: plazaPosts.likeCount })
      .from(plazaPosts)
      .where(eq(plazaPosts.id, postId))
      .limit(1);
    if (!post) {
      throw new NotFoundException('帖子不存在');
    }

    const [existing] = await this.db
      .select({ id: plazaLikes.id })
      .from(plazaLikes)
      .where(and(eq(plazaLikes.postId, postId), eq(plazaLikes.userId, userId)))
      .limit(1);

    if (existing) {
      // 取消点赞
      await this.db.delete(plazaLikes).where(eq(plazaLikes.id, existing.id));
      const [updated] = await this.db
        .update(plazaPosts)
        .set({ likeCount: post.likeCount - 1 })
        .where(eq(plazaPosts.id, postId))
        .returning({ likeCount: plazaPosts.likeCount });
      return { liked: false, likeCount: updated.likeCount };
    } else {
      // 点赞
      await this.db.insert(plazaLikes).values({ postId, userId });
      const [updated] = await this.db
        .update(plazaPosts)
        .set({ likeCount: post.likeCount + 1 })
        .where(eq(plazaPosts.id, postId))
        .returning({ likeCount: plazaPosts.likeCount });
      return { liked: true, likeCount: updated.likeCount };
    }
  }

  async deletePost(postId: string, userId: string): Promise<void> {
    const [post] = await this.db
      .select({ id: plazaPosts.id, userId: plazaPosts.userId })
      .from(plazaPosts)
      .where(eq(plazaPosts.id, postId))
      .limit(1);
    if (!post) {
      throw new NotFoundException('帖子不存在');
    }
    if (post.userId !== userId) {
      throw new ForbiddenException('无权删除他人帖子');
    }
    await this.db.delete(plazaPosts).where(eq(plazaPosts.id, postId));
  }

  async listComments(postId: string): Promise<PlazaComment[]> {
    // 先验证帖子存在
    const [post] = await this.db
      .select({ id: plazaPosts.id })
      .from(plazaPosts)
      .where(eq(plazaPosts.id, postId))
      .limit(1);
    if (!post) {
      throw new NotFoundException('帖子不存在');
    }

    const rows = await this.db
      .select({
        id: plazaComments.id,
        postId: plazaComments.postId,
        userId: plazaComments.userId,
        content: plazaComments.content,
        createdAt: plazaComments.createdAt,
      })
      .from(plazaComments)
      .where(eq(plazaComments.postId, postId))
      .orderBy(desc(plazaComments.createdAt));

    return rows.map((r: typeof rows[number]) => ({
      id: r.id,
      postId: r.postId,
      userId: r.userId,
      content: r.content,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async createComment(postId: string, userId: string, content: string): Promise<PlazaComment> {
    const [post] = await this.db
      .select({ id: plazaPosts.id, commentCount: plazaPosts.commentCount })
      .from(plazaPosts)
      .where(eq(plazaPosts.id, postId))
      .limit(1);
    if (!post) {
      throw new NotFoundException('帖子不存在');
    }

    const filtered = this.filterContent(content);

    const [inserted] = await this.db
      .insert(plazaComments)
      .values({ postId, userId, content: filtered })
      .returning({
        id: plazaComments.id,
        postId: plazaComments.postId,
        userId: plazaComments.userId,
        content: plazaComments.content,
        createdAt: plazaComments.createdAt,
      });

    await this.db
      .update(plazaPosts)
      .set({ commentCount: post.commentCount + 1 })
      .where(eq(plazaPosts.id, postId));

    return {
      id: inserted.id,
      postId: inserted.postId,
      userId: inserted.userId,
      content: inserted.content,
      createdAt: inserted.createdAt.toISOString(),
    };
  }

  async deleteComment(commentId: string, userId: string): Promise<void> {
    const [comment] = await this.db
      .select({ id: plazaComments.id, userId: plazaComments.userId, postId: plazaComments.postId })
      .from(plazaComments)
      .where(eq(plazaComments.id, commentId))
      .limit(1);
    if (!comment) {
      throw new NotFoundException('评论不存在');
    }
    if (comment.userId !== userId) {
      throw new ForbiddenException('无权删除他人评论');
    }

    const [post] = await this.db
      .select({ commentCount: plazaPosts.commentCount })
      .from(plazaPosts)
      .where(eq(plazaPosts.id, comment.postId))
      .limit(1);

    await this.db.delete(plazaComments).where(eq(plazaComments.id, commentId));

    if (post && post.commentCount > 0) {
      await this.db
        .update(plazaPosts)
        .set({ commentCount: post.commentCount - 1 })
        .where(eq(plazaPosts.id, comment.postId));
    }
  }

  private filterContent(content: string): string {
    let result = content;
    for (const word of SENSITIVE_WORDS) {
      const replacement = '*'.repeat(word.length);
      result = result.split(word).join(replacement);
    }
    return result;
  }

  private toPlazaPost(
    row: {
      id: string;
      workId: string | null;
      userId: string;
      imageUrl: string;
      caption: string;
      supplementText: string | null;
      likeCount: number;
      commentCount: number;
      emotionCategory: string;
      createdAt: Date;
    },
    isLiked?: boolean,
  ): PlazaPost {
    return {
      id: row.id,
      workId: row.workId ?? undefined,
      userId: row.userId,
      imageUrl: row.imageUrl,
      caption: row.caption,
      supplementText: row.supplementText ?? undefined,
      likeCount: row.likeCount,
      commentCount: row.commentCount,
      emotionCategory: row.emotionCategory as EmotionCategory,
      createdAt: row.createdAt.toISOString(),
      isLiked,
    };
  }
}
