import React, { useState, useEffect, useMemo } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Palette, LogIn } from 'lucide-react';
import dayjs from 'dayjs';
import isLeapYear from 'dayjs/plugin/isLeapYear';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { TopLevelFormatterParams, CallbackDataParams } from 'echarts/types/dist/shared';

import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@/components/ui/empty';
import WorkDetailDialog from '@/components/WorkDetailDialog';
import { getByYear } from '@/api/mood-works';
import {
  EMOTION_COLORS,
  EMOTION_LABELS,
  EMOTION_CATEGORIES,
} from '@/utils/emotion';
import { useAuth } from '@/hooks/useAuth';
import AuthDialog from '@/components/AuthDialog';
import type { MoodWork, EmotionCategory } from '@shared/api.interface';

dayjs.extend(isLeapYear);

const PalettePage = () => {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [year, setYear] = useState(dayjs().year());
  const [works, setWorks] = useState<MoodWork[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  const [detailWork, setDetailWork] = useState<MoodWork | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // 拉取全年作品
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
        const data = await getByYear(year);
        if (!cancelled) setWorks(data);
      } catch (err: any) {
        logger.error('情绪色盘数据加载失败', err);
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
  }, [year, isLoggedIn]);

  // 按日期分组（取当天最近一幅）
  const worksByDate = useMemo(() => {
    const map = new Map<string, MoodWork>();
    for (const w of works) {
      const d = dayjs(w.createdAt).format('YYYY-MM-DD');
      const existing = map.get(d);
      if (!existing || dayjs(w.createdAt).isAfter(dayjs(existing.createdAt))) {
        map.set(d, w);
      }
    }
    return map;
  }, [works]);

  // 年度统计
  const stats = useMemo(() => {
    const total = works.length;

    // 出现最多的情绪
    const emotionCount = new Map<EmotionCategory, number>();
    for (const w of works) {
      emotionCount.set(w.emotionCategory, (emotionCount.get(w.emotionCategory) ?? 0) + 1);
    }
    let topEmotion: EmotionCategory | null = null;
    let topCount = 0;
    for (const [e, c] of emotionCount) {
      if (c > topCount) {
        topCount = c;
        topEmotion = e;
      }
    }

    // 年度主色调（加权平均所有 dominantColors 的第一主色）
    // 简单加权：hex 转 RGB 后按 weight 加权平均
    let rSum = 0;
    let gSum = 0;
    let bSum = 0;
    let wSum = 0;
    for (const w of works) {
      if (!w.dominantColors || w.dominantColors.length === 0) continue;
      for (const c of w.dominantColors) {
        const hex = c.hex.replace('#', '');
        if (hex.length !== 6) continue;
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        const weight = c.weight;
        rSum += r * weight;
        gSum += g * weight;
        bSum += b * weight;
        wSum += weight;
      }
    }
    let dominantColor = '#C9A227';
    if (wSum > 0) {
      const r = Math.round(rSum / wSum);
      const g = Math.round(gSum / wSum);
      const b = Math.round(bSum / wSum);
      dominantColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    return { total, topEmotion, topCount, dominantColor, emotionCount };
  }, [works]);

  // === 色彩曲线图表（柱状色块图） ===
  const colorCurveOption: EChartsOption = useMemo(() => {
    const totalDays = dayjs(`${year}-01-01`).isLeapYear() ? 366 : 365;
    const dayIndices: number[] = [];
    const barData: Array<{ value: number; itemStyle: { color: string }; mood: string; dayIdx: number }> = [];

    for (let i = 1; i <= totalDays; i++) {
      const dateStr = dayjs(`${year}-01-01`).add(i - 1, 'day').format('YYYY-MM-DD');
      const work = worksByDate.get(dateStr);
      const hex = work?.dominantColors?.[0]?.hex;
      if (hex) {
        dayIndices.push(i);
        barData.push({
          value: 1,
          itemStyle: { color: hex },
          mood: work!.moodText,
          dayIdx: i,
        });
      }
    }

    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: TopLevelFormatterParams) => {
          const p = Array.isArray(params) ? params[0] : params;
          if (!p) return '';
          const data = p.data as { mood: string; dayIdx: number; itemStyle: { color: string } };
          const hex = data.itemStyle?.color ?? '#ccc';
          const dateStr = dayjs(`${year}-01-01`)
            .add(data.dayIdx - 1, 'day')
            .format('YYYY年M月D日');
          return `<div style="font-family: serif;">${dateStr}</div>
            <div style="margin-top:4px;display:flex;align-items:center;gap:6px;">
              <span style="display:inline-block;width:12px;height:12px;border-radius:2px;background:${hex};"></span>
              <span>${hex}</span>
            </div>
            <div style="margin-top:4px;color:#666;">${data.mood}</div>`;
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        top: '8%',
        bottom: '18%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: dayIndices.map(String),
        name: '一年中的第几天',
        nameLocation: 'middle',
        nameGap: 25,
        axisLabel: {
          interval: Math.floor(dayIndices.length / 6),
          formatter: (val: string) => `第${val}天`,
          fontSize: 11,
        },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 1,
        show: false,
      },
      series: [
        {
          type: 'bar',
          barWidth: '80%',
          data: barData,
          label: { show: false },
        },
      ],
    };
  }, [year, worksByDate]);

  // === 情绪占比横向柱状图（情绪类别超过5个，不使用饼图） ===
  const emotionBarOption: EChartsOption = useMemo(() => {
    const data: Array<{ name: string; value: number; itemStyle: { color: string } }> = [];
    // 按数量降序排列
    const sorted = [...EMOTION_CATEGORIES]
      .map((e) => ({ e, count: stats.emotionCount.get(e) ?? 0 }))
      .filter((x) => x.count > 0)
      .sort((a, b) => a.count - b.count); // 倒序让最多的在上面

    for (const { e, count } of sorted) {
      data.push({
        name: EMOTION_LABELS[e],
        value: count,
        itemStyle: { color: EMOTION_COLORS[e] },
      });
    }

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: TopLevelFormatterParams) => {
          const list = Array.isArray(params) ? params : [params];
          if (list.length === 0) return '';
          const p = list[0];
          const totalVal = stats.total;
          const pct = totalVal > 0
            ? ((p.value as number) / totalVal * 100).toFixed(1)
            : '0';
          return `${p.name}<br/>作品数: ${p.value}<br/>占比: ${pct}%`;
        },
      },
      grid: {
        left: '3%',
        right: '10%',
        top: '3%',
        bottom: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'value',
      },
      yAxis: {
        type: 'category',
        data: data.map((d) => d.name),
        axisLabel: { fontSize: 12 },
      },
      series: [
        {
          type: 'bar',
          data,
          barWidth: '60%',
          label: {
            show: true,
            position: 'right',
            formatter: (p: CallbackDataParams) => `${p.value}`,
          },
        },
      ],
    };
  }, [stats]);

  // === 月度情绪分布热力图 ===
  const heatmapOption: EChartsOption = useMemo(() => {
    // 数据：[monthIdx(0-11), emotionIdx, count]
    const monthEmotionCount: number[][] = Array.from({ length: 12 }, () =>
      Array(EMOTION_CATEGORIES.length).fill(0),
    );

    for (const w of works) {
      const monthIdx = dayjs(w.createdAt).month();
      const eIdx = EMOTION_CATEGORIES.indexOf(w.emotionCategory);
      if (eIdx >= 0) {
        monthEmotionCount[monthIdx][eIdx] += 1;
      }
    }

    const heatData: Array<[number, number, number]> = [];
    let maxVal = 0;
    for (let m = 0; m < 12; m++) {
      for (let e = 0; e < EMOTION_CATEGORIES.length; e++) {
        const v = monthEmotionCount[m][e];
        heatData.push([m, e, v]);
        if (v > maxVal) maxVal = v;
      }
    }

    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: TopLevelFormatterParams) => {
          const p = Array.isArray(params) ? params[0] : params;
          if (!p || !Array.isArray(p.data)) return '';
          const m = p.data[0] as number;
          const eIdx = p.data[1] as number;
          const v = p.data[2] as number;
          return `${m + 1}月 · ${EMOTION_LABELS[EMOTION_CATEGORIES[eIdx]]}<br/>作品数：${v}`;
        },
      },
      grid: {
        left: '10%',
        right: '10%',
        top: '5%',
        bottom: '25%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
        axisLabel: { fontSize: 11 },
      },
      yAxis: {
        type: 'category',
        data: EMOTION_CATEGORIES.map((e) => EMOTION_LABELS[e]),
        axisLabel: { fontSize: 11 },
      },
      visualMap: {
        min: 0,
        max: Math.max(maxVal, 1),
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        inRange: {
          color: ['#F0E8D6', '#C0392B'],
        },
        text: ['多', '少'],
        textStyle: { fontSize: 11 },
      },
      series: [
        {
          type: 'heatmap',
          data: heatData,
          label: {
            show: false,
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.2)',
            },
          },
        },
      ],
    };
  }, [works]);

  // 年视图小版预览（迷你贡献图）
  const miniYearGrid = useMemo(() => {
    const y = year;
    const firstDay = dayjs(`${y}-01-01`);
    const totalDays = dayjs(`${y}-01-01`).isLeapYear() ? 366 : 365;
    const cells: { date: string; emotion?: EmotionCategory; work?: MoodWork }[] = [];
    for (let i = 0; i < totalDays; i++) {
      const d = firstDay.add(i, 'day');
      const dateStr = d.format('YYYY-MM-DD');
      const work = worksByDate.get(dateStr);
      cells.push({
        date: dateStr,
        emotion: work?.emotionCategory,
        work,
      });
    }
    return cells;
  }, [year, worksByDate]);

  // 跳转心情墙年视图
  const goWallYear = () => {
    navigate(`/wall?view=year&year=${year}`);
  };

  const handleCellClick = (work?: MoodWork) => {
    if (work) {
      setDetailWork(work);
      setDetailOpen(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* 顶部标题栏 */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="ink-brush-text text-2xl md:text-3xl text-foreground flex items-center gap-2">
            <Palette className="text-liu-jin" size={28} />
            情绪色盘
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            你的年度情绪色彩曲线
          </p>
        </div>

        <div className="flex items-center gap-2 bg-card border border-border rounded-lg p-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setYear((y) => y - 1)}
            aria-label="上一年"
          >
            <ChevronLeft size={16} />
          </Button>
          <span className="ink-brush-text px-3 text-base">{year} 年</span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setYear((y) => y + 1)}
            aria-label="下一年"
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>

      {/* 加载态 */}
      {loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-[300px] rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-[350px] rounded-xl" />
            <Skeleton className="h-[350px] rounded-xl" />
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="glass-card rounded-lg p-6 text-center text-destructive text-sm">
          {error}
        </div>
      )}

      {/* 空状态 */}
      {!loading && !error && works.length === 0 && (
        <Empty className="glass-card">
          <EmptyHeader>
            <EmptyContent>
              {!isLoggedIn ? (
                <>
                  <EmptyTitle className="ink-brush-text">
                    登录后查看你的情绪色盘
                  </EmptyTitle>
                  <EmptyDescription>
                    登录后作品跨设备同步，随时查看年度情绪色彩变化
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
                  <EmptyTitle className="ink-brush-text">
                    空白画卷，等你落笔
                  </EmptyTitle>
                  <EmptyDescription>
                    {year} 年还没有心情作品，快去首页记录第一笔吧
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

      {/* 有数据时的内容 */}
      {!loading && !error && works.length > 0 && (
        <>
          {/* 顶部统计卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-card rounded-xl p-5">
              <div className="text-xs text-muted-foreground mb-2">
                年度总作品
              </div>
              <div className="ink-brush-text text-3xl text-foreground">
                {stats.total}
                <span className="text-sm text-muted-foreground ml-1 font-normal">
                  幅
                </span>
              </div>
            </div>

            <div className="glass-card rounded-xl p-5">
              <div className="text-xs text-muted-foreground mb-2">
                最多的情绪
              </div>
              <div className="flex items-center gap-3">
                <Badge
                  variant="secondary"
                  className="px-3 py-1 text-sm font-medium"
                  style={{
                    backgroundColor: stats.topEmotion
                      ? `${EMOTION_COLORS[stats.topEmotion]}20`
                      : undefined,
                    color: stats.topEmotion
                      ? EMOTION_COLORS[stats.topEmotion]
                      : undefined,
                    borderColor: 'transparent',
                  }}
                >
                  {stats.topEmotion
                    ? EMOTION_LABELS[stats.topEmotion]
                    : '-'}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {stats.topCount} 幅
                </span>
              </div>
            </div>

            <div className="glass-card rounded-xl p-5">
              <div className="text-xs text-muted-foreground mb-2">
                年度主色调
              </div>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg border border-border shadow-sm"
                  style={{ backgroundColor: stats.dominantColor }}
                />
                <span className="text-sm text-foreground font-mono uppercase">
                  {stats.dominantColor}
                </span>
              </div>
            </div>
          </div>

          {/* 色彩曲线图表 */}
          <div className="glass-card rounded-xl p-5">
            <h2 className="ink-brush-text text-lg text-foreground mb-3">
              年度色彩曲线
            </h2>
            <ReactECharts
              option={colorCurveOption}
              theme="ud"
              className="h-[300px] md:h-[320px] w-full"
            />
          </div>

          {/* 饼图 + 热力图 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 情绪占比饼图 */}
            <div className="glass-card rounded-xl p-5">
                <h2 className="ink-brush-text text-lg text-foreground mb-3">
                情绪分布
              </h2>
              <ReactECharts
                option={emotionBarOption}
                theme="ud"
                className="h-[300px] w-full"
              />
            </div>

            {/* 月度情绪热力图 */}
            <div className="glass-card rounded-xl p-5">
              <h2 className="ink-brush-text text-lg text-foreground mb-3">
                月度情绪分布
              </h2>
              <ReactECharts
                option={heatmapOption}
                theme="ud"
                className="h-[300px] w-full"
              />
            </div>
          </div>

          {/* 年视图迷你预览 */}
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="ink-brush-text text-lg text-foreground">
                全年情绪脉络
              </h2>
              <Button variant="outline" size="sm" onClick={goWallYear}>
                查看年视图 →
              </Button>
            </div>

            <div className="overflow-x-auto pb-2">
              <div className="min-w-[620px]">
                {/* 月份标签 */}
                <div className="flex text-[10px] text-muted-foreground mb-1 pl-5">
                  {[
                    '1月', '2月', '3月', '4月', '5月', '6月',
                    '7月', '8月', '9月', '10月', '11月', '12月',
                  ].map((m) => (
                    <div key={m} className="flex-1 text-left">
                      {m}
                    </div>
                  ))}
                </div>

                <div className="flex gap-1">
                  {/* 星期标签 */}
                  <div className="flex flex-col gap-[2px] text-[9px] text-muted-foreground pr-1 pt-0">
                    <span>一</span>
                    <span>&nbsp;</span>
                    <span>三</span>
                    <span>&nbsp;</span>
                    <span>五</span>
                    <span>&nbsp;</span>
                    <span>日</span>
                  </div>

                  {/* 格子 */}
                  <div className="flex gap-[2px]">
                    {(() => {
                      const firstDay = dayjs(`${year}-01-01`);
                      const startWeekday = firstDay.isoWeekday() - 1;
                      const totalDays = dayjs(`${year}-01-01`).isLeapYear()
                        ? 366
                        : 365;
                      const totalWeeks = Math.ceil(
                        (startWeekday + totalDays) / 7,
                      );

                      const cols: React.ReactElement[] = [];
                      for (let w = 0; w < totalWeeks; w++) {
                        const cells: React.ReactElement[] = [];
                        for (let dow = 0; dow < 7; dow++) {
                          const dayIdx = w * 7 + dow - startWeekday;
                          if (dayIdx < 0 || dayIdx >= totalDays) {
                            cells.push(
                              <div
                                key={`${w}-${dow}`}
                                className="w-2.5 h-2.5 rounded-sm bg-transparent"
                              />,
                            );
                          } else {
                            const cell = miniYearGrid[dayIdx];
                            const color = cell.emotion
                              ? EMOTION_COLORS[cell.emotion]
                              : '#EFE8DB';
                            cells.push(
                              <button
                                key={cell.date}
                                type="button"
                                onClick={() => handleCellClick(cell.work)}
                                title={cell.date}
                                className="w-2.5 h-2.5 rounded-sm transition-transform hover:scale-125 active:scale-110"
                                style={{ backgroundColor: color }}
                                aria-label={cell.date}
                              />
                            );
                          }
                        }
                        cols.push(
                          <div key={w} className="flex flex-col gap-[2px]">
                            {cells}
                          </div>,
                        );
                      }
                      return cols;
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
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

export default PalettePage;
