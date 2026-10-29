import { useCallback, useEffect, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import {
  LogOut,
  Trash2,
  Image as ImageIcon,
  MessageSquare,
  Heart,
  Sparkles,
  User,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import AuthDialog from '@/components/AuthDialog';
import { useAuth } from '@/hooks/useAuth';
import { list as listMoodWorks, remove as removeMoodWork } from '@/api/mood-works';
import { deletePost, listMyPosts } from '@/api/plaza';
import type { MoodWork, PlazaPost, EmotionCategory } from '@shared/api.interface';
import { Image } from '@client/src/components/ui/image';

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

interface MeStats {
  workCount: number;
  postCount: number;
  totalLikes: number;
}

function getInitial(name: string): string {
  return name?.charAt?.(0)?.toUpperCase?.() || '?';
}

function getDisplayName(username: string, nickname?: string): string {
  return nickname || username;
}

export default function MePage() {
  const { user, isLoggedIn, logout } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');

  const [activeTab, setActiveTab] = useState<'works' | 'posts'>('works');
  const [works, setWorks] = useState<MoodWork[]>([]);
  const [posts, setPosts] = useState<PlazaPost[]>([]);
  const [loading, setLoading] = useState(false);

  const [stats, setStats] = useState<MeStats>({
    workCount: 0,
    postCount: 0,
    totalLikes: 0,
  });

  const [viewerWork, setViewerWork] = useState<MoodWork | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'work' | 'post';
    id: string;
  } | null>(null);

  const loadUserData = useCallback(async () => {
    if (!isLoggedIn || !user) return;
    setLoading(true);
    try {
      const worksRes = await listMoodWorks(1, 50);
      setWorks(worksRes.items || []);
      setStats((prev) => ({ ...prev, workCount: worksRes.total || 0 }));
    } catch (err: unknown) {
      logger.error('load my works failed', err);
    }

    try {
      const data = await listMyPosts(50);
      setPosts(data.items || []);
      const totalLikes =
        data.totalLikes ??
        (data.items || []).reduce(
          (sum: number, p: PlazaPost) => sum + p.likeCount,
          0,
        );
      setStats((prev) => ({
        ...prev,
        postCount: data.total || 0,
        totalLikes,
      }));
    } catch (err: unknown) {
      logger.error('load my posts failed', err);
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, user]);

  useEffect(() => {
    if (isLoggedIn) {
      loadUserData();
    }
  }, [isLoggedIn, loadUserData]);

  const handleLoginClick = () => {
    setAuthTab('login');
    setAuthOpen(true);
  };

  const handleRegisterClick = () => {
    setAuthTab('register');
    setAuthOpen(true);
  };

  const handleAuthSuccess = () => {
    toast.success('登录成功');
  };

  const handleLogout = () => {
    logout();
    setWorks([]);
    setPosts([]);
    setStats({ workCount: 0, postCount: 0, totalLikes: 0 });
    toast.success('已退出登录');
  };

  const handleDeleteWork = (id: string) => {
    setDeleteConfirm({ type: 'work', id });
  };

  const handleDeletePost = (id: string) => {
    setDeleteConfirm({ type: 'post', id });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      if (deleteConfirm.type === 'work') {
        await removeMoodWork(deleteConfirm.id);
        setWorks((prev) => prev.filter((w) => w.id !== deleteConfirm.id));
        setStats((prev) => ({ ...prev, workCount: prev.workCount - 1 }));
        toast.success('作品已删除');
      } else {
        await deletePost(deleteConfirm.id);
        setPosts((prev) => prev.filter((p) => p.id !== deleteConfirm.id));
        setStats((prev) => ({ ...prev, postCount: prev.postCount - 1 }));
        toast.success('发布已删除');
      }
    } catch (err: unknown) {
      logger.error('delete failed', err);
      toast.error('删除失败，请稍后再试');
    } finally {
      setDeleteConfirm(null);
    }
  };

  // Not logged in view
  if (!isLoggedIn || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="glass-card rounded-2xl p-8 w-full max-w-md text-center space-y-6">
          <div className="flex justify-center">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="bg-shi-qing/10 text-shi-qing text-2xl font-serif">
                心
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="space-y-2">
            <h2 className="font-serif text-xl text-mo-se">你好，画中人</h2>
            <p className="text-sm text-muted-foreground">
              登录后，你的心情画卷将随你同行
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Button
              onClick={handleLoginClick}
              className="w-full bg-shi-qing hover:bg-shi-qing/90"
            >
              登录
            </Button>
            <Button
              onClick={handleRegisterClick}
              variant="outline"
              className="w-full"
            >
              注册新账号
            </Button>
          </div>
        </div>

        <AuthDialog
          open={authOpen}
          onOpenChange={setAuthOpen}
          defaultTab={authTab}
          onSuccess={handleAuthSuccess}
        />
      </div>
    );
  }

  const displayName = getDisplayName(user.username, user.nickname);

  return (
    <div className="space-y-6">
      {/* User Info Card */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-shi-qing/15 text-shi-qing text-xl font-serif">
              {getInitial(displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h2 className="font-serif text-lg text-mo-se truncate">
              {displayName}
            </h2>
            <p className="text-sm text-muted-foreground truncate">
              @{user.username}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="gap-1"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">退出</span>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          <Card className="text-center bg-card/50">
            <CardContent className="p-3">
              <div className="flex items-center justify-center mb-1">
                <ImageIcon size={16} className="text-shi-qing" />
              </div>
              <div className="text-lg font-semibold text-mo-se">
                {stats.workCount}
              </div>
              <div className="text-[10px] text-muted-foreground">作品</div>
            </CardContent>
          </Card>
          <Card className="text-center bg-card/50">
            <CardContent className="p-3">
              <div className="flex items-center justify-center mb-1">
                <MessageSquare size={16} className="text-shi-lu" />
              </div>
              <div className="text-lg font-semibold text-mo-se">
                {stats.postCount}
              </div>
              <div className="text-[10px] text-muted-foreground">发布</div>
            </CardContent>
          </Card>
          <Card className="text-center bg-card/50">
            <CardContent className="p-3">
              <div className="flex items-center justify-center mb-1">
                <Heart size={16} className="text-zhu-sha" />
              </div>
              <div className="text-lg font-semibold text-mo-se">
                {stats.totalLikes}
              </div>
              <div className="text-[10px] text-muted-foreground">点赞</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'works' | 'posts')}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="works" className="gap-1">
            <ImageIcon size={14} />
            我的作品
          </TabsTrigger>
          <TabsTrigger value="posts" className="gap-1">
            <MessageSquare size={14} />
            我的发布
          </TabsTrigger>
        </TabsList>

        {/* Works Tab */}
        <TabsContent value="works" className="pt-4">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
          ) : works.length === 0 ? (
            <Empty className="border-border">
              <EmptyHeader>
                <Sparkles className="text-liu-jin" size={32} />
                <EmptyTitle>空白画卷，等你落笔</EmptyTitle>
                <EmptyDescription>
                  去首页生成你的第一幅心情画吧
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {works.map((work) => (
                <div
                  key={work.id}
                  className="relative group rounded-lg overflow-hidden border border-border cursor-pointer"
                  onClick={() => setViewerWork(work)}
                >
                  <Image
                    src={work.imageUrl}
                    alt={work.moodText}
                    className="w-full aspect-square object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-xs line-clamp-2">
                      {work.moodText}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className="absolute top-2 left-2 text-[10px] bg-background/80 backdrop-blur-sm"
                  >
                    {emotionLabels[work.emotionCategory]}
                  </Badge>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteWork(work.id);
                    }}
                    className="absolute top-2 right-2 p-1 bg-destructive/80 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="删除作品"
                  >
                    <Trash2 size={12} />
                  </button>
                  <div className="absolute bottom-2 right-2 text-[10px] text-white/80 opacity-0 group-hover:opacity-100 transition-opacity">
                    {dayjs(work.createdAt).format('MM-DD')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Posts Tab */}
        <TabsContent value="posts" className="pt-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <Empty className="border-border">
              <EmptyHeader>
                <User className="text-muted-foreground" size={32} />
                <EmptyTitle>还没有发布</EmptyTitle>
                <EmptyDescription>去广场分享你的心情画吧</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="space-y-3">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="glass-card rounded-lg overflow-hidden flex"
                >
                  <Image
                    src={post.imageUrl}
                    alt={post.caption}
                    className="w-20 h-20 object-cover flex-shrink-0"
                  />
                  <div className="flex-1 p-3 min-w-0 flex flex-col justify-between">
                    <div>
                      <p className="text-sm text-foreground line-clamp-2 break-words">
                        {post.caption}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-[10px] py-0">
                          {emotionLabels[post.emotionCategory]}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {dayjs(post.createdAt).format('YYYY-MM-DD')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                        <Heart size={10} />
                        {post.likeCount}
                      </span>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                        <MessageSquare size={10} />
                        {post.commentCount}
                      </span>
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="ml-auto text-xs text-muted-foreground hover:text-destructive transition-colors"
                        aria-label="删除发布"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Work Viewer Dialog */}
      <Dialog
        open={!!viewerWork}
        onOpenChange={(v) => !v && setViewerWork(null)}
      >
        <DialogContent
          className="!max-w-[90vw] !max-h-[90vh] p-0 bg-transparent border-none shadow-none"
          showCloseButton={false}
        >
          {viewerWork && (
            <div className="relative">
              <Image
                src={viewerWork.imageUrl}
                alt={viewerWork.moodText}
                className="max-h-[85vh] w-auto mx-auto rounded-lg"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 rounded-b-lg">
                <p className="text-white text-sm">{viewerWork.moodText}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="text-[10px]">
                    {emotionLabels[viewerWork.emotionCategory]}
                  </Badge>
                  <span className="text-white/70 text-xs">
                    {dayjs(viewerWork.createdAt).format('YYYY-MM-DD')}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setViewerWork(null)}
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

      {/* Delete Confirm */}
      <AlertDialog
        open={!!deleteConfirm}
        onOpenChange={(v) => !v && setDeleteConfirm(null)}
      >
        <AlertDialogContent className="glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm?.type === 'work'
                ? '删除后作品将永久消失，确定要删除这幅心情画吗？'
                : '删除后无法恢复，确定要删除这条发布吗？'}
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

      {/* Auth Dialog */}
      <AuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        defaultTab={authTab}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}
