import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  PlazaPost,
  PlazaPostCreateRequest,
  PlazaPostListResponse,
  PlazaComment,
  LikeToggleResponse,
} from '@shared/api.interface';

export async function listPosts(cursor?: string, limit: number = 12): Promise<PlazaPostListResponse> {
  const res = await axiosForBackend.get('/api/plaza/posts', {
    params: { cursor, limit },
  });
  return res.data as PlazaPostListResponse;
}

export async function listMyPosts(limit: number = 50): Promise<{ items: PlazaPost[]; total: number; totalLikes: number }> {
  const res = await axiosForBackend.get('/api/plaza/my/posts', {
    params: { limit },
  });
  return res.data as { items: PlazaPost[]; total: number; totalLikes: number };
}

export async function createPost(dto: PlazaPostCreateRequest): Promise<PlazaPost> {
  const res = await axiosForBackend.post('/api/plaza/posts', dto);
  return res.data as PlazaPost;
}

export async function toggleLike(postId: string): Promise<LikeToggleResponse> {
  const res = await axiosForBackend.post(`/api/plaza/posts/${postId}/like`);
  return res.data as LikeToggleResponse;
}

export async function deletePost(postId: string): Promise<void> {
  await axiosForBackend.delete(`/api/plaza/posts/${postId}`);
}

export async function listComments(postId: string): Promise<PlazaComment[]> {
  const res = await axiosForBackend.get(`/api/plaza/posts/${postId}/comments`);
  return res.data as PlazaComment[];
}

export async function createComment(postId: string, content: string): Promise<PlazaComment> {
  const res = await axiosForBackend.post(`/api/plaza/posts/${postId}/comments`, { content });
  return res.data as PlazaComment;
}

export async function deleteComment(commentId: string): Promise<void> {
  await axiosForBackend.delete(`/api/plaza/comments/${commentId}`);
}
