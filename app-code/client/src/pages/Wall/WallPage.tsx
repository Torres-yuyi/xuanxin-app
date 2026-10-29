import React, { useState, useEffect, useMemo } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar, Grid3X3, BarChart3, LogIn } from 'lucide-react';
import dayjs from 'dayjs';
import weekday from 'dayjs/plugin/weekday';
import isoWeek from 'dayjs/plugin/isoWeek';
import isLeapYear from 'dayjs/plugin/isLeapYear';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@/components/ui/empty';
import { Image } from '@/components/ui/image';
import WorkDetailDialog from '@/components/WorkDetailDialog';
import { getByDateRange, getByYear } from '@/api/mood-works';
import { EMOTION_COLORS, EMOTION_LABELS } from '@/utils/emotion';
import { useAuth } from '@/hooks/useAuth';
import AuthDialog from '@/components/AuthDialog';
import type { MoodWork } from '@shared/api.interface';

dayjs.extend(weekday);
dayjs.extend(isoWeek);
dayjs.extend(isLeapYear);

type ViewType = 'week' | 'month' | 'year';

interface DayCell {
  date: string;
  works: MoodWork[];
  latestWork?: MoodWork;
}

const WallPage = () => {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [view, setView] = useState<ViewType>('week');
  const [works, setWorks] = useState<MoodWork[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  // 周/月/年的基准日期
  const [anchorDate, setAnchorDate] = useState(dayjs());

  // 详情弹窗
  const [detailWork, setDetailWork] = useState<MoodWork | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const openDetail = (work: MoodWork) => {
    setDetailWork(work);
    setDetailOpen(true);
  };

  // 计算当前视图的起止日期
  const { startDate, endDate } = useMemo(() => {
    if (view === 'week') {
      const start = anchorDate.startOf('isoWeek');
      const end = anchorDate.endOf('isoWeek');
      return { startDate: start, endDate: end };
    }
    if (view === 'month') {
      const start = anchorDate.startOf('month');
      const end = anchorDate.endOf('month');
      return { startDate: start, endDate: end };
    }
    // year
    const start = anchorDate.startOf('year');
    const end = anchorDate.endOf('year');
    return { startDate: start, endDate: end };
  }, [view, anchorDate]);

  // 拉取数据
  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      if (!isLoggedIn) {
        setWorks([]);
        setLoading(false);
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        let data: MoodWork[];
        if (view === 'year') {
          data = await getByYear(anchorDate.year());
        } else {
          data = await getByDateRange(
            startDate.format('YYYY-MM-DD'),
            endDate.format('YYYY-MM-DD'),
          );
        }
        if (!cancelled) setWorks(data);
      } catch (err: any) {
        logger.error('心情墙数据加载失败', err);
        if (err?.response?.status === 401) {
          if (!cancelled) {
            setWorks([]);
            setError(null);
          }
        } else {
          if (!cancelled) setError('加载失败，请稍后重试');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [view, startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD'), anchorDate.year(), isLoggedIn]);

  // 按日期分组
  const worksByDate = useMemo(() => {
    const map = new Map<string, MoodWork[]>();
    for (const w of works) {
      const d = dayjs(w.createdAt).format('YYYY-MM-DD');
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(w);
    }
    // 每天按时间倒序
    for (const [k, v] of map) {
      map.set(
        k,
        v.sort((a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf()),
      );
    }
    return map;
  }, [works]);

  // === 周视图数据 ===
  const weekDays = useMemo<DayCell[]>(() => {
    const days: DayCell[] = [];
    for (let i = 0; i < 7; i++) {
      const d = startDate.add(i, 'day');
      const dateStr = d.format('YYYY-MM-DD');
      const dayWorks = worksByDate.get(dateStr) ?? [];
      days.push({
        date: dateStr,
        works: dayWorks,
        latestWork: dayWorks[0],
      });
    }
    return days;
  }, [startDate, worksByDate]);

  // === 月视图数据 ===
  const monthCells = useMemo<DayCell[]>(() => {
    const cells: DayCell[] = [];
    const firstDay = startDate;
    // 周一为起始
    const startWeekday = firstDay.isoWeekday() - 1; // 0=周一
    const daysInMonth = endDate.date();

    // 前置空格
    for (let i = 0; i < startWeekday; i++) {
      cells.push({ date: '', works: [] });
    }
    // 当月日期
    for (let i = 1; i <= daysInMonth; i++) {
      const d = firstDay.date(i);
      const dateStr = d.format('YYYY-MM-DD');
      const dayWorks = worksByDate.get(dateStr) ?? [];
      cells.push({
        date: dateStr,
        works: dayWorks,
        latestWork: dayWorks[0],
      });
    }
    return cells;
  }, [startDate, endDate, worksByDate]);

  // === 年视图数据 ===
  const yearGrid = useMemo(() => {
    const year = anchorDate.year();
    const firstDay = dayjs(`${year}-01-01`);
    const totalDays = anchorDate.isLeapYear() ? 366 : 365;
    const cells: { date: string; emotion?: MoodWork['emotionCategory']; work?: MoodWork }[] = [];

    for (let i = 0; i < totalDays; i++) {
      const d = firstDay.add(i, 'day');
      const dateStr = d.format('YYYY-MM-DD');
      const dayWorks = worksByDate.get(dateStr);
      cells.push({
        date: dateStr,
        emotion: dayWorks?.[0]?.emotionCategory,
        work: dayWorks?.[0],
      });
    }
    return cells;
  }, [anchorDate, worksByDate]);

  // 切换上一/下一周期
  const goPrev = () => {
    if (view === 'week') setAnchorDate((d) => d.subtract(1, 'week'));
    else if (view === 'month') setAnchorDate((d) => d.subtract(1, 'month'));
    else setAnchorDate((d) => d.subtract(1, 'year'));
  };
  const goNext = () => {
    if (view === 'week') setAnchorDate((d) => d.add(1, 'week'));
    else if (view === 'month') setAnchorDate((d) => d.add(1, 'month'));
    else setAnchorDate((d) => d.add(1, 'year'));
  };

  // 标题
  const titleText = useMemo(() => {
    if (view === 'week') {
      return `${startDate.format('YYYY年M月D日')} — ${endDate.format('M月D日')}`;
    }
    if (view === 'month') return anchorDate.format('YYYY年 M月');
    return `${anchorDate.year()} 年`;
  }, [view, startDate, endDate, anchorDate]);

  const weekdayLabels = ['一', '二', '三', '四', '五', '六', '日'];

  return (
    <div className="space-y-6">
      {/* 顶部：标题 + 视图切换 */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="ink-brush-text text-2xl md:text-3xl text-foreground">
            心情墙
          </h1>
          <p className="text-sm text-muted-foreground mt-1">你的心画卷轴</p>
        </div>

        <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
          <Button
            variant={view === 'week' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('week')}
            className="text-xs"
          >
            <BarChart3 size={14} />
            周
          </Button>
          <Button
            variant={view === 'month' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('month')}
            className="text-xs"
          >
            <Grid3X3 size={14} />
            月
          </Button>
          <Button
            variant={view === 'year' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('year')}
            className="text-xs"
          >
            <Calendar size={14} />
            年
          </Button>
        </div>
      </div>

      {/* 周期切换栏 */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="icon"
          onClick={goPrev}
          aria-label="上一周期"
        >
          <ChevronLeft size={18} />
        </Button>
        <span className="ink-brush-text text-base md:text-lg text-foreground">
          {titleText}
        </span>
        <Button
          variant="outline"
          size="icon"
          onClick={goNext}
          aria-label="下一周期"
        >
          <ChevronRight size={18} />
        </Button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="glass-card rounded-lg p-6 text-center text-destructive text-sm">
          {error}
        </div>
      )}

      {/* 加载态 */}
      {loading && !error && (
        <div className="glass-card rounded-xl p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {Array.from({ length: view === 'year' ? 52 : view === 'month' ? 28 : 7 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-md" />
            ))}
          </div>
        </div>
      )}

      {/* 空状态 */}
      {!loading && !error && works.length === 0 && (
        <Empty className="glass-card">
          <EmptyHeader>
            <EmptyContent>
              {!isLoggedIn ? (
                <>
                  <EmptyTitle className="ink-brush-text">登录后查看你的心情墙</EmptyTitle>
                  <EmptyDescription>
                    登录后作品跨设备同步，随时回顾每一天的心情
                  </EmptyDescription>
                  <Button
                    variant="default"
                    className="mt-4 bg-zhu-sha hover:bg-zhu-sha/90"
                    onClick={() => setAuthOpen(true)}
                  >
                    <LogIn size={16} className="mr-2" />
                    登录 / 注册
                  </Button>
                </>
              ) : (
                <>
                  <EmptyTitle className="ink-brush-text">空白画卷，等你落笔</EmptyTitle>
                  <EmptyDescription>
                    在首页记录心情，让每一天都有色彩
                  </EmptyDescription>
                  <Button
                    variant="default"
                    className="mt-4 bg-zhu-sha hover:bg-zhu-sha/90"
                    onClick={() => navigate('/')}
                  >
                    去渲心
                  </Button>
                </>
              )}
            </EmptyContent>
          </EmptyHeader>
        </Empty>
      )}

      {/* === 周视图 === */}
      {!loading && !error && works.length > 0 && view === 'week' && (
        <div className="glass-card rounded-xl p-4 md:p-6">
          <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 md:mx-0 md:px-0">
            {weekDays.map((day) => {
              const dayObj = dayjs(day.date);
              const weekdayIdx = dayObj.isoWeekday() - 1;
              return (
                <div
                  key={day.date}
                  className="snap-center shrink-0 w-[70vw] sm:w-[200px] md:w-[160px]"
                >
                  <div className="text-xs text-muted-foreground mb-2 flex items-center justify-between">
                    <span>周{weekdayLabels[weekdayIdx]}</span>
                    <span className="font-medium text-foreground">
                      {dayObj.format('M/D')}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => day.latestWork && openDetail(day.latestWork)}
                    disabled={!day.latestWork}
                    className="w-full relative rounded-lg overflow-hidden group transition-transform active:scale-[0.98]"
                  >
                    <div className="frame-border aspect-square rounded-lg overflow-hidden bg-secondary">
                      {day.latestWork?.imageUrl ? (
                        <Image
                          src={day.latestWork.imageUrl}
                          alt={day.latestWork.moodText}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                          空白
                        </div>
                      )}
                    </div>

                    {/* 多幅角标 */}
                    {day.works.length > 1 && (
                      <div className="absolute top-2 right-2 bg-zhu-sha text-white text-[10px] px-1.5 py-0.5 rounded-md font-medium shadow-sm">
                        共{day.works.length}幅
                      </div>
                    )}
                  </button>

                  {/* 心情短语 */}
                  <p className="mt-2 text-xs text-foreground/80 line-clamp-2 leading-relaxed">
                    {day.latestWork?.moodText?.slice(0, 20) || ''}
                    {day.latestWork && day.latestWork.moodText.length > 20 ? '…' : ''}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* === 月视图 === */}
      {!loading && !error && works.length > 0 && view === 'month' && (
        <div className="glass-card rounded-xl p-4 md:p-6">
          {/* 星期表头 */}
          <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2">
            {weekdayLabels.map((w) => (
              <div
                key={w}
                className="text-center text-xs text-muted-foreground py-1"
              >
                {w}
              </div>
            ))}
          </div>

          {/* 日历格子 */}
          <div className="grid grid-cols-7 gap-1 md:gap-2">
            {monthCells.map((cell, idx) => {
              if (!cell.date) {
                return <div key={`empty-${idx}`} className="aspect-square" />;
              }
              const dayNum = dayjs(cell.date).date();
              const hasWork = !!cell.latestWork;
              return (
                <button
                  key={cell.date}
                  type="button"
                  onClick={() => cell.latestWork && openDetail(cell.latestWork)}
                  disabled={!hasWork}
                  className="aspect-square relative rounded-md overflow-hidden border border-border bg-secondary/50 transition-transform active:scale-[0.96]"
                >
                  {cell.latestWork?.imageUrl ? (
                    <Image
                      src={cell.latestWork.imageUrl}
                      alt={cell.latestWork.moodText}
                      className="w-full h-full object-cover"
                      quality={60}
                    />
                  ) : hasWork && cell.latestWork?.dominantColors?.[0]?.hex ? (
                    <div
                      className="w-full h-full"
                      style={{
                        backgroundColor: cell.latestWork.dominantColors[0].hex,
                      }}
                    />
                  ) : null}

                  {/* 日期数字 */}
                  <span
                    className={`absolute bottom-0.5 right-1 text-[10px] ${
                      hasWork ? 'text-white/90 drop-shadow-sm' : 'text-muted-foreground'
                    }`}
                  >
                    {dayNum}
                  </span>

                  {/* 多幅小圆点 */}
                  {cell.works.length > 1 && (
                    <span className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-zhu-sha shadow-sm" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* === 年视图 === */}
      {!loading && !error && works.length > 0 && view === 'year' && (
        <div className="glass-card rounded-xl p-4 md:p-6 overflow-x-auto">
          <div className="min-w-[680px]">
            {/* 月份标签 */}
            <div className="flex text-[10px] text-muted-foreground mb-1 pl-6">
              {['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'].map((m) => (
                <div key={m} className="flex-1 text-left">{m}</div>
              ))}
            </div>

            <div className="flex gap-1">
              {/* 星期标签 */}
              <div className="flex flex-col gap-[3px] text-[10px] text-muted-foreground pr-1 pt-[1px]">
                <span>一</span>
                <span>&nbsp;</span>
                <span>三</span>
                <span>&nbsp;</span>
                <span>五</span>
                <span>&nbsp;</span>
                <span>日</span>
              </div>

              {/* 格子矩阵：按列（周）排列，每列 7 格 */}
              <div className="flex gap-[3px]">
                {(() => {
                  const year = anchorDate.year();
                  const firstDay = dayjs(`${year}-01-01`);
                  const startWeekday = firstDay.isoWeekday() - 1; // 周一为 0
                  const totalDays = anchorDate.isLeapYear() ? 366 : 365;
                  const totalWeeks = Math.ceil((startWeekday + totalDays) / 7);

                  const cols: React.ReactElement[] = [];
                  for (let w = 0; w < totalWeeks; w++) {
                    const cells: React.ReactElement[] = [];
                    for (let dow = 0; dow < 7; dow++) {
                      const dayIdx = w * 7 + dow - startWeekday;
                      if (dayIdx < 0 || dayIdx >= totalDays) {
                        cells.push(
                          <div
                            key={`${w}-${dow}`}
                            className="w-3 h-3 rounded-sm bg-transparent"
                          />,
                        );
                      } else {
                        const cell = yearGrid[dayIdx];
                        const color = cell.emotion
                          ? EMOTION_COLORS[cell.emotion]
                          : '#EFE8DB';
                        cells.push(
                          <button
                            key={cell.date}
                            type="button"
                            onClick={() => cell.work && openDetail(cell.work)}
                            disabled={!cell.work}
                            title={`${cell.date}${cell.emotion ? ' · ' + EMOTION_LABELS[cell.emotion] : ''}`}
                            className="w-3 h-3 rounded-sm transition-transform hover:scale-125 active:scale-110"
                            style={{ backgroundColor: color }}
                            aria-label={`${cell.date} ${cell.emotion ? EMOTION_LABELS[cell.emotion] : '无作品'}`}
                          />
                        );
                      }
                    }
                    cols.push(
                      <div key={w} className="flex flex-col gap-[3px]">
                        {cells}
                      </div>,
                    );
                  }
                  return cols;
                })()}
              </div>
            </div>

            {/* 图例 */}
            <div className="flex items-center justify-end gap-2 mt-4 text-[10px] text-muted-foreground">
              <span>少</span>
              <div className="flex gap-0.5">
                {['joy', 'calm', 'productive', 'warm', 'sad'].map((e) => (
                  <div
                    key={e}
                    className="w-3 h-3 rounded-sm"
                    style={{
                      backgroundColor:
                        EMOTION_COLORS[e as keyof typeof EMOTION_COLORS],
                    }}
                    title={EMOTION_LABELS[e as keyof typeof EMOTION_LABELS]}
                  />
                ))}
              </div>
              <span>多</span>
            </div>
          </div>

          {/* 跳转色盘页 */}
          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              查看全年情绪色彩分析 →
            </span>
            <Button variant="outline" size="sm" onClick={() => navigate('/palette')}>
              情绪色盘
            </Button>
          </div>
        </div>
      )}

      {/* 详情弹窗 */}
      <WorkDetailDialog
        open={detailOpen}
        work={detailWork}
        onClose={() => setDetailOpen(false)}
      />
    </div>
  );
};

export default WallPage;
