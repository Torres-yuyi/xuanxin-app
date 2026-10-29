import { useCallback, useEffect, useRef, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import {
  Heart,
  MessageCircle,
  Send,
  Plus,
  Trash2,
  Sparkles,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@/components/ui/empty';
import AuthDialog from '@/components/AuthDialog';
import { useAuth } from '@/hooks/useAuth';
import {
  listPosts,
  createPost,
  deletePost,
  toggleLike,
  listComments,
  createComment,
  deleteComment,
} from '@/api/plaza';
import type {
  PlazaPost,
  PlazaComment,
  EmotionCategory,
  LikeToggleResponse,
} from '@shared/api.interface';
import { Image } from '@client/src/components/ui/image';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const emotionLabels: Record<EmotionCategory, string> = {
  joy: '喜悦',
  sad: '悲伤',
  longing: '思念',
  anxious: '紧张',
  tired: '疲惫',
  calm: '平静',
  productive: '满足',
  warm: '温暖',
};

interface RecentWork {
  imageUrl: string;
  emotionCategory: EmotionCategory;
  moodText: string;
  workId?: string;
}

function getRecentWork(): RecentWork | null {
  try {
    const raw = localStorage.getItem('xuanxin_recent_work');
    if (!raw) return null;
    return JSON.parse(raw) as RecentWork;
  } catch {
    return null;
  }
}

function getInitial(str: string): string {
  return str?.charAt?.(0)?.toUpperCase?.() || '?';
}

function formatTime(iso: string): string {
  const now = dayjs();
  const t = dayjs(iso);
  const diffDays = now.diff(t, 'day');
  if (diffDays < 1) return t.fromNow();
  if (diffDays < 7) return `${diffDays}天前`;
  return t.format('MM-DD');
}

export default function PlazaPage() {
  const { user, isLoggedIn } = useAuth();

  const [posts, setPosts] = useState<PlazaPost[]>([]);
  const [sort, setSort] = useState<'latest' | 'hot'>('latest');
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [authOpen, setAuthOpen] = useState(false);

  const [publishOpen, setPublishOpen] = useState(false);
  const [publishCaption, setPublishCaption] = useState('');
  const [publishSupplement, setPublishSupplement] = useState('');
  const [publishing, setPublishing] = useState(false);
  const recentWork = getRecentWork();

  const [imageViewer, setImageViewer] = useState<PlazaPost | null>(null);

  const [commentsOpen, setCommentsOpen] = useState<string | null>(null);
  const [commentsMap, setCommentsMap] = useState<Record<string, PlazaComment[]>>(
    {},
  );
  const [commentInput, setCommentInput] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'post' | 'comment';
    id: string;
  } | null>(null);
  const [deleteCommentPostId, setDeleteCommentPostId] = useState<string>('');

  const sentinelRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const loadPosts = useCallback(
    async (reset: boolean = false, sortType: 'latest' | 'hot' = sort) => {
      if (loading) return;
      setLoading(true);
      setError(null);

      try {
        const res = await listPosts(reset ? undefined : cursor, 12);
        let items = res.items;
        if (sortType === 'hot') {
          items = [...items].sort((a, b) => b.likeCount - a.likeCount);
        }
        if (reset) {
          setPosts(items);
        } else {
          setPosts((prev) => [...prev, ...items]);
        }
        setCursor(res.nextCursor);
        setHasMore(res.hasMore);
      } catch (err: unknown) {
        logger.error('load plaza posts failed', err);
        setError('加载失败，请稍后重试');
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    },
    [cursor, loading, sort],
  );

  // Initial load on sort change
  useEffect(() => {
    setPosts([]);
    setCursor(undefined);
    setHasMore(true);
    setInitialLoading(true);
    loadPosts(true, sort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort]);

  // Infinite scroll observer
  useEffect(() => {
    if (initialLoading || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loading && hasMore) {
          loadPosts(false, sort);
        }
      },
      { threshold: 0.1 },
    );

    observerRef.current = observer;
    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [initialLoading, hasMore, loading, loadPosts, sort]);

  const handleSortChange = (value: string) => {
    setSort(value as 'latest' | 'hot');
  };

  const handlePublishClick = () => {
    if (!isLoggedIn) {
      setAuthOpen(true);
      toast.info('登录后即可发布心情');
      return;
    }
    if (!recentWork) {
      toast.info('先生成一幅心情画再发布哦');
      return;
    }
    setPublishOpen(true);
  };

  const handlePublishSubmit = async () => {
    if (!recentWork || !user) return;
    if (!publishCaption.trim()) {
      toast.error('请输入配文');
      return;
    }
    setPublishing(true);
    try {
      const newPost = await createPost({
        workId: recentWork.workId,
        imageUrl: recentWork.imageUrl,
        caption: publishCaption.trim(),
        supplementText: publishSupplement.trim() || undefined,
        emotionCategory: recentWork.emotionCategory,
      });
      setPosts((prev) => [newPost, ...prev]);
      setPublishOpen(false);
      setPublishCaption('');
      setPublishSupplement('');
      toast.success('发布成功');
    } catch (err: unknown) {
      logger.error('publish post failed', err);
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message || '发布失败，请稍后再试';
      toast.error(message);
    } finally {
      setPublishing(false);
    }
  };

  const handleToggleLike = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLoggedIn) {
      setAuthOpen(true);
      toast.info('登录后即可点赞');
      return;
    }
    const prevPosts = posts;
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              isLiked: !p.isLiked,
              likeCount: p.isLiked ? p.likeCount - 1 : p.likeCount + 1,
            }
          : p,
      ),
    );
    try {
      const result: LikeToggleResponse = await toggleLike(postId);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, isLiked: result.liked, likeCount: result.likeCount }
            : p,
        ),
      );
    } catch (err: unknown) {
      logger.error('toggle like failed', err);
      setPosts(prevPosts);
      toast.error('操作失败，请稍后再试');
    }
  };

  const handleOpenComments = async (postId: string) => {
    if (commentsOpen === postId) {
      setCommentsOpen(null);
      return;
    }
    setCommentsOpen(postId);
    setCommentInput('');
    if (!commentsMap[postId]) {
      setCommentsLoading(true);
      try {
        const list = await listComments(postId);
        setCommentsMap((prev) => ({ ...prev, [postId]: list }));
      } catch (err: unknown) {
        logger.error('load comments failed', err);
        toast.error('评论加载失败');
      } finally {
        setCommentsLoading(false);
      }
    }
  };

  const handleSendComment = async (postId: string) => {
    if (!isLoggedIn) {
      setAuthOpen(true);
      toast.info('登录后可评论');
      return;
    }
    const content = commentInput.trim();
    if (!content) return;
    setCommentLoading(true);
    try {
      const newComment = await createComment(postId, content);
      setCommentsMap((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), newComment],
      }));
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, commentCount: p.commentCount + 1 }
            : p,
        ),
      );
      setCommentInput('');
    } catch (err: unknown) {
      logger.error('create comment failed', err);
      toast.error('评论失败，请稍后再试');
    } finally {
      setCommentLoading(false);
    }
  };

  const handleDeleteComment = (commentId: string, postId: string) => {
    setDeleteConfirm({ type: 'comment', id: commentId });
    setDeleteCommentPostId(postId);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      if (deleteConfirm.type === 'comment') {
        await deleteComment(deleteConfirm.id);
        setCommentsMap((prev) => ({
          ...prev,
          [deleteCommentPostId]: (prev[deleteCommentPostId] || []).filter(
            (c) => c.id !== deleteConfirm.id,
          ),
        }));
        setPosts((prev) =>
          prev.map((p) =>
            p.id === deleteCommentPostId
              ? { ...p, commentCount: Math.max(0, p.commentCount - 1) }
              : p,
          ),
        );
        toast.success('评论已删除');
      } else {
        await deletePost(deleteConfirm.id);
        setPosts((prev) => prev.filter((p) => p.id !== deleteConfirm.id));
        toast.success('帖子已删除');
      }
    } catch (err: unknown) {
      logger.error('delete failed', err);
      toast.error('删除失败，请稍后再试');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const renderPostCard = (post: PlazaPost) => {
    const isOwn = user && post.userId === user.id;
    const comments = commentsMap[post.id] || [];
    const isCommentsOpen = commentsOpen === post.id;

    return (
      <div
        key={post.id}
        className="glass-card rounded-xl overflow-hidden mb-4 break-inside-avoid"
      >
        <div
          className="relative group cursor-zoom-in"
          onClick={() => setImageViewer(post)}
        >
          <Image
            src={post.imageUrl}
            alt={post.caption}
            className="w-full h-auto aspect-auto object-cover"
            loading="lazy"
          />
          <Badge
            variant="secondary"
            className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm"
          >
            {emotionLabels[post.emotionCategory] || post.emotionCategory}
          </Badge>
        </div>

        <div className="p-3 space-y-2">
          <p className="text-sm text-foreground leading-relaxed break-words">
            {post.caption}
          </p>
          {post.supplementText && (
            <p className="text-xs text-muted-foreground leading-relaxed break-words">
              {post.supplementText}
            </p>
          )}

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2 min-w-0">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-[10px] bg-shi-qing/20 text-shi-qing">
                  {getInitial(post.userId)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground truncate">
                {post.userId.slice(0, 8)}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground flex-shrink-0">
              {formatTime(post.createdAt)}
            </span>
          </div>

          <div className="flex items-center gap-4 pt-1 border-t border-border/50">
            <button
              onClick={(e) => handleToggleLike(post.id, e)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-zhu-sha transition-colors"
              aria-label={post.isLiked ? '取消点赞' : '点赞'}
            >
              <Heart
                size={16}
                className={
                  post.isLiked
                    ? 'fill-zhu-sha text-zhu-sha transition-all scale-110'
                    : 'transition-all'
                }
              />
              <span>{post.likeCount}</span>
            </button>
            <button
              onClick={() => handleOpenComments(post.id)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-shi-qing transition-colors"
              aria-label="评论"
            >
              <MessageCircle size={16} />
              <span>{post.commentCount}</span>
            </button>
            {isOwn && (
              <button
                onClick={() => setDeleteConfirm({ type: 'post', id: post.id })}
                className="ml-auto text-xs text-muted-foreground hover:text-destructive transition-colors"
                aria-label="删除帖子"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>

          {isCommentsOpen && (
            <div className="pt-3 border-t border-border/50 space-y-3">
              {commentsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-3/4" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">
                  暂无评论，来抢沙发吧
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-2 text-xs">
                      <Avatar className="h-5 w-5 flex-shrink-0">
                        <AvatarFallback className="text-[9px] bg-shi-lu/20 text-shi-lu">
                          {getInitial(comment.userId)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2">
                          <span className="text-muted-foreground flex-shrink-0">
                            {comment.userId.slice(0, 6)}
                          </span>
                          <span className="text-foreground break-words">
                            {comment.content}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground">
                            {formatTime(comment.createdAt)}
                          </span>
                          {user && comment.userId === user.id && (
                            <button
                              onClick={() =>
                                handleDeleteComment(comment.id, post.id)
                              }
                              className="text-[10px] text-muted-foreground hover:text-destructive"
                            >
                              删除
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                <Input
                  placeholder={isLoggedIn ? '写下你的评论…' : '登录后可评论'}
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && isLoggedIn) {
                      e.preventDefault();
                      handleSendComment(post.id);
                    }
                  }}
                  disabled={!isLoggedIn || commentLoading}
                  className="text-sm flex-1"
                />
                <Button
                  size="icon"
                  onClick={() => handleSendComment(post.id)}
                  disabled={!isLoggedIn || commentLoading || !commentInput.trim()}
                  className="bg-shi-qing hover:bg-shi-qing/90 flex-shrink-0"
                  aria-label="发送评论"
                >
                  <Send size={14} />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl text-mo-se">心情广场</h1>
          <p className="text-sm text-muted-foreground mt-1">
            一方宣纸，万般心绪
          </p>
        </div>
        <Button
          onClick={handlePublishClick}
          className="bg-zhu-sha hover:bg-zhu-sha/90 gap-1"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">发布心情</span>
          <span className="sm:hidden">发布</span>
        </Button>
      </div>

      {/* Sort tabs */}
      <div className="flex justify-center">
        <Tabs value={sort} onValueChange={handleSortChange}>
          <TabsList>
            <TabsTrigger value="latest" className="px-6">
              最新
            </TabsTrigger>
            <TabsTrigger value="hot" className="px-6">
              最热
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      {initialLoading ? (
        <div className="columns-1 md:columns-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="glass-card rounded-xl overflow-hidden mb-4 break-inside-avoid"
            >
              <Skeleton className="w-full aspect-square" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <div className="flex gap-4">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-12" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <Empty className="border-border">
          <EmptyHeader>
            <EmptyTitle>加载失败</EmptyTitle>
            <EmptyDescription>{error}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" onClick={() => loadPosts(true)}>
              重新加载
            </Button>
          </EmptyContent>
        </Empty>
      ) : posts.length === 0 ? (
        <Empty className="border-border">
          <EmptyHeader>
            <Sparkles className="text-liu-jin" size={32} />
            <EmptyTitle>空白画卷，等你落笔</EmptyTitle>
            <EmptyDescription>成为第一个分享心情的人吧</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          {/* Masonry columns */}
          <div className="columns-1 md:columns-2 gap-4">
            {posts.map((post) => renderPostCard(post))}
          </div>

          {/* Infinite scroll sentinel */}
          <div
            ref={sentinelRef}
            className="h-10 flex items-center justify-center"
          >
            {loading && (
              <div className="text-sm text-muted-foreground">加载中…</div>
            )}
            {!hasMore && posts.length > 0 && (
              <div className="text-sm text-muted-foreground">没有更多了</div>
            )}
          </div>
        </>
      )}

      {/* Publish Dialog */}
      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent className="glass-card sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-mo-se">
              发布心情
            </DialogTitle>
            <DialogDescription>给你的心情画配句话</DialogDescription>
          </DialogHeader>

          {!recentWork ? (
            <div className="py-8 text-center">
              <Sparkles className="mx-auto mb-3 text-muted-foreground" size={40} />
              <p className="text-muted-foreground">先生成一幅心情画再发布哦</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative rounded-lg overflow-hidden border border-border">
                <Image
                  src={recentWork.imageUrl}
                  alt="preview"
                  className="w-full max-h-64 object-contain bg-secondary/30"
                />
                <Badge
                  variant="secondary"
                  className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm"
                >
                  {emotionLabels[recentWork.emotionCategory] ||
                    recentWork.emotionCategory}
                </Badge>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  配文 <span className="text-destructive">*</span>
                </label>
                <Input
                  value={publishCaption}
                  onChange={(e) =>
                    setPublishCaption(e.target.value.slice(0, 200))
                  }
                  placeholder="一句话，道出此刻心情"
                  maxLength={200}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {publishCaption.length}/200
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  补充文字（选填）
                </label>
                <Textarea
                  value={publishSupplement}
                  onChange={(e) =>
                    setPublishSupplement(e.target.value.slice(0, 500))
                  }
                  placeholder="想多说点什么？"
                  rows={4}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {publishSupplement.length}/500
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handlePublishSubmit}
              disabled={!recentWork || publishing || !publishCaption.trim()}
              className="bg-zhu-sha hover:bg-zhu-sha/90"
            >
              {publishing ? '发布中…' : '发布'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Viewer Dialog */}
      <Dialog
        open={!!imageViewer}
        onOpenChange={(v) => !v && setImageViewer(null)}
      >
        <DialogContent
          className="!max-w-[90vw] !max-h-[90vh] p-0 bg-transparent border-none shadow-none"
          showCloseButton={false}
        >
          {imageViewer && (
            <div className="relative">
              <Image
                src={imageViewer.imageUrl}
                alt={imageViewer.caption}
                className="max-h-[85vh] w-auto mx-auto rounded-lg"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 rounded-b-lg">
                <p className="text-white text-sm">{imageViewer.caption}</p>
                {imageViewer.supplementText && (
                  <p className="text-white/80 text-xs mt-1">
                    {imageViewer.supplementText}
                  </p>
                )}
              </div>
              <button
                onClick={() => setImageViewer(null)}
                className="absolute top-3 right-3 bg-black/40 text-white rounded-full p-1.5 hover:bg-black/60 transition-colors"
                aria-label="关闭"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Auth Dialog */}
      <AuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        onSuccess={() => {}}
      />

      {/* Delete Confirm */}
      <AlertDialog
        open={!!deleteConfirm}
        onOpenChange={(v) => !v && setDeleteConfirm(null)}
      >
        <AlertDialogContent className="glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm?.type === 'post'
                ? '删除后无法恢复，确定要删除这条帖子吗？'
                : '删除后无法恢复，确定要删除这条评论吗？'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
