import { useState, useRef, useCallback } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { capabilityClient } from '@lark-apaas/client-toolkit';
import {
  Download,
  RefreshCw,
  Save,
  Sparkles,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@client/src/components/ui/button';
import AuthDialog from '@client/src/components/AuthDialog';
import { useAuth } from '@client/src/hooks/useAuth';
import { detectEmotion, emotionLabels, emotionColorMap, buildDanqingPrompt } from '@client/src/utils/emotion';
import { extractDominantColors } from '@client/src/utils/color-extractor';
import { createMoodWork } from '@client/src/api/mood-works';
import type { EmotionCategory, DominantColor } from '@shared/api.interface';
import { Image } from '@client/src/components/ui/image';

const PLUGIN_INSTANCE_ID = 'mood_painting_danqing_style_1';
const MAX_CHAR_COUNT = 100;

const HomePage = () => {
  const [moodText, setMoodText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [dominantColors, setDominantColors] = useState<DominantColor[]>([]);
  const [isExtractingColors, setIsExtractingColors] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedWorkId, setSavedWorkId] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const { isLoggedIn, logout } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  const emotion: EmotionCategory = detectEmotion(moodText);
  const canGenerate = moodText.trim().length > 0 && !isGenerating;

  const handleGenerate = useCallback(async () => {
    if (!canGenerate) return;

    const trimmedText = moodText.trim();
    const emotionCategory = detectEmotion(trimmedText);
    const prompt = buildDanqingPrompt(trimmedText, emotionCategory);

    setIsGenerating(true);
    setGeneratedImageUrl(null);
    setDominantColors([]);
    setSavedWorkId(null);

    try {
      const result = await capabilityClient
        .load(PLUGIN_INSTANCE_ID)
        .call('textToImage', { mood_description: prompt });

      const images = (result as { images?: string[] })?.images;
      if (images && images.length > 0 && images[0]) {
        setGeneratedImageUrl(images[0]);
        toast.success('渲心已成，快来看看');
      } else {
        toast.error('生成失败，请重试');
        logger.error('生图返回为空', result);
      }
    } catch (error) {
      logger.error('生图调用失败', error);
      const message =
        error instanceof Error ? error.message : '未知错误';
      toast.error(`渲心失败：${message}`);
    } finally {
      setIsGenerating(false);
    }
  }, [moodText, canGenerate]);

  const handleImageLoad = useCallback(() => {
    if (!imageRef.current) return;
    setIsExtractingColors(true);
    try {
      const colors = extractDominantColors(imageRef.current, 5);
      setDominantColors(colors);
    } catch (error) {
      logger.error('主色提取失败', error);
    } finally {
      setIsExtractingColors(false);
    }
  }, []);

  const handleDownload = useCallback(async () => {
    if (!generatedImageUrl) return;
    try {
      const response = await fetch(generatedImageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const timestamp = Date.now();
      link.download = `渲心-${emotionLabels[emotion]}-${timestamp}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('已下载到本地');
    } catch (error) {
      logger.error('图片下载失败', error);
      toast.error('下载失败，请重试');
    }
  }, [generatedImageUrl, emotion]);

  const handleRegenerate = useCallback(() => {
    void handleGenerate();
  }, [handleGenerate]);

  const handleSave = useCallback(async () => {
    if (!generatedImageUrl || isSaving) return;

    if (!isLoggedIn) {
      setAuthOpen(true);
      return;
    }

    setIsSaving(true);
    try {
      const work = await createMoodWork({
        moodText: moodText.trim(),
        imageUrl: generatedImageUrl,
        emotionCategory: emotion,
        dominantColors,
      });
      setSavedWorkId(work.id);
      toast.success('作品已保存到心情墙');
    } catch (error: any) {
      logger.error('保存作品失败', error);
      if (error?.response?.status === 401) {
        logout();
        toast.error('登录已过期，请重新登录');
        setAuthOpen(true);
      } else {
        toast.error('保存失败，请重试');
      }
    } finally {
      setIsSaving(false);
    }
  }, [generatedImageUrl, isSaving, isLoggedIn, moodText, emotion, dominantColors, logout]);

  const emotionTagClass = emotionColorMap[emotion];

  return (
    <div className="mx-auto w-full max-w-[560px] space-y-6">
      {/* 标题区 */}
      <div className="text-center space-y-2 pt-2">
        <h1 className="ink-brush-text text-3xl md:text-4xl text-mo-se">
          渲<span className="text-zhu-sha">心</span>
        </h1>
        <p className="text-sm text-muted-foreground font-serif tracking-widest">
          一句话，渲出一颗心
        </p>
      </div>

      {/* 输入区卡片 */}
      <div className="glass-card rounded-xl p-6 space-y-4">
        <div className="space-y-2">
          <textarea
            value={moodText}
            onChange={(e) => {
              const value = e.target.value;
              if (value.length <= MAX_CHAR_COUNT) {
                setMoodText(value);
              }
            }}
            placeholder="今天的心情，一句话说清…"
            className="w-full h-32 resize-none bg-transparent border border-border rounded-lg p-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-zhu-sha/50 focus:border-zhu-sha/30 transition-colors text-base leading-relaxed ink-brush-text"
          />
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {moodText.length}/{MAX_CHAR_COUNT}
            </span>
            {moodText.trim().length > 0 && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${emotionTagClass}`}
              >
                <Sparkles size={12} />
                当前情绪：{emotionLabels[emotion]}
              </span>
            )}
          </div>
        </div>

        <Button
          variant="destructive"
          size="lg"
          className="w-full min-h-12 text-base font-medium bg-zhu-sha hover:bg-zhu-sha/90 text-white border-zhu-sha/30"
          disabled={!canGenerate}
          onClick={handleGenerate}
        >
          {isGenerating ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              渲心晕染中…
            </>
          ) : (
            <>
              <Sparkles size={18} />
              开始渲心
            </>
          )}
        </Button>
      </div>

      {/* 结果展示区 */}
      {generatedImageUrl && (
        <div className="glass-card rounded-xl p-6 space-y-5">
          {/* 心情文字 */}
          <div className="text-center space-y-2">
            <p className="ink-brush-text text-lg md:text-xl text-mo-se leading-relaxed">
              「{moodText.trim()}」
            </p>
            <span
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs border ${emotionTagClass}`}
            >
              {emotionLabels[emotion]}
            </span>
          </div>

          {/* 画作展示 */}
          <div className="frame-border rounded-sm p-3 bg-background/60 shadow-md">
            <div className="aspect-square w-full overflow-hidden rounded-sm bg-background">
              <Image
                ref={imageRef}
                src={generatedImageUrl}
                alt="心情画作"
                onLoad={handleImageLoad}
                crossOrigin="anonymous"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* 主色提取 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">主色调</span>
              {isExtractingColors && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="animate-spin" size={12} />
                  取色中…
                </span>
              )}
            </div>
            {dominantColors.length > 0 && (
              <div className="flex gap-2">
                {dominantColors.map((color, index) => (
                  <div
                    key={`${color.hex}-${index}`}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <div
                      className="w-full aspect-square rounded-md border border-border shadow-sm"
                      style={{ backgroundColor: color.hex }}
                    />
                    <span className="text-[10px] text-muted-foreground font-mono uppercase">
                      {color.hex}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3 pt-1">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleDownload}
            >
              <Download size={16} />
              下载
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleRegenerate}
              disabled={isGenerating}
            >
              <RefreshCw size={16} className={isGenerating ? 'animate-spin' : ''} />
              再来一张
            </Button>
            <Button
              variant="default"
              className="flex-1 bg-shi-qing hover:bg-shi-qing/90 border-shi-qing/30"
              onClick={handleSave}
              disabled={isSaving || savedWorkId !== null}
            >
              {isSaving ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  保存中
                </>
              ) : savedWorkId ? (
                <>
                  <Save size={16} />
                  已保存
                </>
              ) : (
                <>
                  <Save size={16} />
                  保存作品
                </>
              )}
            </Button>
          </div>

          {!isLoggedIn && (
            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-liu-jin/10 border border-liu-jin/20 rounded-lg p-3">
              <AlertCircle size={14} className="text-liu-jin mt-0.5 flex-shrink-0" />
              <span>登录后作品才会永久保存，可在「我的」中查看登录选项。</span>
            </div>
          )}
        </div>
      )}

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />

      {/* 空状态提示 */}
      {!generatedImageUrl && !isGenerating && (
        <div className="text-center py-8 text-muted-foreground">
          <div className="ink-brush-text text-sm">
            空白画卷，等你落笔
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
