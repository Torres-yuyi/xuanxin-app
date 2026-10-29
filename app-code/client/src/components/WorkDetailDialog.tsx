import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Image } from '@/components/ui/image';
import { X } from 'lucide-react';
import dayjs from 'dayjs';
import type { MoodWork } from '@shared/api.interface';
import { EMOTION_LABELS, EMOTION_COLORS } from '@/utils/emotion';

export interface WorkDetailDialogProps {
  open: boolean;
  work: MoodWork | null;
  onClose: () => void;
}

/**
 * 作品详情弹窗 — 装裱画框样式
 */
const WorkDetailDialog = ({ open, work, onClose }: WorkDetailDialogProps) => {
  if (!work) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-[90vw] md:max-w-2xl p-0 overflow-hidden bg-card rounded-xl"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">
          {work.moodText} — 心情画作
        </DialogTitle>

        {/* 关闭按钮 */}
        <DialogClose
          className="absolute top-4 right-4 z-10 rounded-full bg-black/20 hover:bg-black/40 text-white p-2 transition-colors"
          aria-label="关闭"
        >
          <X size={18} />
        </DialogClose>

        <div className="p-4 md:p-6">
          {/* 装裱画框：大图 */}
          <div className="frame-border rounded-lg overflow-hidden bg-white p-3 md:p-4">
            <div className="relative w-full aspect-square overflow-hidden rounded-md bg-secondary">
              {work.imageUrl ? (
                <Image
                  src={work.imageUrl}
                  alt={work.moodText}
                  className="w-full h-full object-cover"
                  quality={85}
                />
              ) : (
                <div
                  className="w-full h-full"
                  style={{
                    backgroundColor:
                      work.dominantColors?.[0]?.hex ?? '#E8DFD0',
                  }}
                />
              )}
            </div>
          </div>

          {/* 下方信息区 */}
          <div className="mt-5 space-y-4">
            {/* 心情文案 */}
            <p className="ink-brush-text text-lg md:text-xl text-foreground leading-relaxed">
              {work.moodText}
            </p>

            <div className="flex items-center justify-between flex-wrap gap-3">
              {/* 情绪标签 */}
              <Badge
                variant="secondary"
                className="px-3 py-1 text-xs font-medium"
                style={{
                  backgroundColor: `${EMOTION_COLORS[work.emotionCategory]}20`,
                  color: EMOTION_COLORS[work.emotionCategory],
                  borderColor: 'transparent',
                }}
              >
                {EMOTION_LABELS[work.emotionCategory]}
              </Badge>

              {/* 日期 */}
              <span className="text-xs text-muted-foreground">
                {dayjs(work.createdAt).format('YYYY年MM月DD日 HH:mm')}
              </span>
            </div>

            {/* 主色色块 */}
            {work.dominantColors && work.dominantColors.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground shrink-0">
                  主色
                </span>
                <div className="flex gap-1.5">
                  {work.dominantColors.slice(0, 5).map((c, i) => (
                    <div
                      key={i}
                      className="w-6 h-6 rounded-full border border-border shadow-sm"
                      style={{ backgroundColor: c.hex }}
                      title={`${c.hex} (${Math.round(c.weight * 100)}%)`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WorkDetailDialog;
