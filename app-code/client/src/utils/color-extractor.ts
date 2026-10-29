import type { DominantColor } from '@shared/api.interface';

interface Bucket {
  r: number;
  g: number;
  b: number;
  count: number;
  totalR: number;
  totalG: number;
  totalB: number;
}

const BUCKET_LEVELS = 8; // 每通道 8 级 → 512 桶
const MIN_SAMPLE_SIZE = 50; // 最少采样像素数

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number): string => {
    const hex = Math.round(v).toString(16);
    return hex.length === 1 ? `0${hex}` : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

export function extractDominantColors(
  imageElement: HTMLImageElement,
  count: number = 5,
): DominantColor[] {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];

  // 缩放到较小尺寸以提高性能
  const maxSize = 100;
  const scale = Math.min(maxSize / imageElement.naturalWidth, maxSize / imageElement.naturalHeight, 1);
  canvas.width = Math.max(1, Math.floor(imageElement.naturalWidth * scale));
  canvas.height = Math.max(1, Math.floor(imageElement.naturalHeight * scale));

  ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const pixelCount = canvas.width * canvas.height;

  if (pixelCount < MIN_SAMPLE_SIZE) return [];

  // 分桶统计
  const bucketMap = new Map<number, Bucket>();

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // 跳过完全透明像素
    if (a < 10) continue;

    // 按 BUCKET_LEVELS 分级确定桶索引
    const rBucket = Math.floor((r / 255) * (BUCKET_LEVELS - 1));
    const gBucket = Math.floor((g / 255) * (BUCKET_LEVELS - 1));
    const bBucket = Math.floor((b / 255) * (BUCKET_LEVELS - 1));

    const bucketIndex = rBucket * BUCKET_LEVELS * BUCKET_LEVELS + gBucket * BUCKET_LEVELS + bBucket;

    const existing = bucketMap.get(bucketIndex);
    if (existing) {
      existing.count += 1;
      existing.totalR += r;
      existing.totalG += g;
      existing.totalB += b;
    } else {
      bucketMap.set(bucketIndex, {
        r: rBucket,
        g: gBucket,
        b: bBucket,
        count: 1,
        totalR: r,
        totalG: g,
        totalB: b,
      });
    }
  }

  // 按出现次数排序
  const sortedBuckets = Array.from(bucketMap.values()).sort((a, b) => b.count - a.count);

  if (sortedBuckets.length === 0) return [];

  // 从多到少选色，相似颜色合并
  const selected: DominantColor[] = [];
  const totalPixels = pixelCount;
  const mergeThreshold = 35; // 颜色距离阈值，小于此值视为同一色系

  for (const bucket of sortedBuckets) {
    const avgR = bucket.totalR / bucket.count;
    const avgG = bucket.totalG / bucket.count;
    const avgB = bucket.totalB / bucket.count;
    const weight = bucket.count / totalPixels;

    // 检查是否与已选颜色太相似
    let isDuplicate = false;
    for (const color of selected) {
      const hex = color.hex;
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      if (colorDistance(avgR, avgG, avgB, r, g, b) < mergeThreshold) {
        // 合并权重
        color.weight += weight;
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      selected.push({
        hex: rgbToHex(avgR, avgG, avgB),
        weight,
      });
    }

    if (selected.length >= count) break;
  }

  // 重新归一化权重
  const totalWeight = selected.reduce((sum, c) => sum + c.weight, 0);
  if (totalWeight > 0) {
    selected.forEach((c) => {
      c.weight = c.weight / totalWeight;
    });
  }

  return selected;
}
