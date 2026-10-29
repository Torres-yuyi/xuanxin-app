export type EmotionCategory =
  | 'joy'
  | 'sad'
  | 'longing'
  | 'anxious'
  | 'tired'
  | 'calm'
  | 'productive'
  | 'warm';

export interface DominantColor {
  hex: string;
  weight: number;
}

export interface MoodWork {
  id: string;
  userId: string;
  moodText: string;
  imageUrl: string;
  emotionCategory: EmotionCategory;
  dominantColors: DominantColor[];
  createdAt: string;
}

export interface MoodWorkCreateRequest {
  moodText: string;
  imageUrl: string;
  emotionCategory: EmotionCategory;
  dominantColors: DominantColor[];
}

export interface MoodWorkListResponse {
  items: MoodWork[];
  total: number;
}

export interface PlazaPost {
  id: string;
  workId?: string;
  userId: string;
  imageUrl: string;
  caption: string;
  supplementText?: string;
  likeCount: number;
  commentCount: number;
  emotionCategory: EmotionCategory;
  createdAt: string;
  isLiked?: boolean;
}

export interface PlazaPostCreateRequest {
  workId?: string;
  imageUrl: string;
  caption: string;
  supplementText?: string;
  emotionCategory: EmotionCategory;
}

export interface PlazaPostListResponse {
  items: PlazaPost[];
  nextCursor?: string;
  hasMore: boolean;
}

export interface PlazaComment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: string;
}

export interface PlazaCommentCreateRequest {
  postId: string;
  content: string;
}

// ===== Auth =====

export interface AuthUser {
  id: string;
  username: string;
  nickname?: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface RegisterRequest {
  username: string;
  password: string;
  nickname?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LikeToggleResponse {
  liked: boolean;
  likeCount: number;
}
