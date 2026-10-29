// ---- plugin:mood_painting_danqing_style_1 ----
// ============================================================
// 插件 mood_painting_danqing_style_1 (渲心心情画-丹青风格抽象画生成) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export type MoodPaintingDanqingStyleOneInput = {
  /** 用户的心情描述文本 */
  mood_description: string;
};

/**
 * const input: MoodPaintingDanqingStyleOneInput = { mood_description };
 * capabilityClient.load('mood_painting_danqing_style_1').call<MoodPaintingDanqingStyleOneOutput>('textToImage', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { images } = result;
 * 返回值形如：
 *   {"images":["示例文本"]}
 */
export type MoodPaintingDanqingStyleOneOutput = {
  images: string[];
};
// ---- end:mood_painting_danqing_style_1 ----