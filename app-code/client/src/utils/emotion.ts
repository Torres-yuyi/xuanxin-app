import type { EmotionCategory } from '@shared/api.interface';

/** 情绪分类中文名映射 */
export const EMOTION_LABELS: Record<EmotionCategory, string> = {
  joy: '喜悦',
  sad: '悲伤',
  longing: '思念',
  anxious: '紧张',
  tired: '疲惫',
  calm: '平静',
  productive: '高效',
  warm: '温暖',
};

/** 情绪分类对应丹青主色（hex，用于图表/色块） */
export const EMOTION_COLORS: Record<EmotionCategory, string> = {
  joy: '#C0392B',
  sad: '#2F6B7A',
  longing: '#5B7FA3',
  anxious: '#C0392B',
  tired: '#1E2B33',
  calm: '#C9A227',
  productive: '#2F6B7A',
  warm: '#3E8E7E',
};

/** 所有情绪分类列表 */
export const EMOTION_CATEGORIES: EmotionCategory[] = [
  'joy',
  'sad',
  'longing',
  'anxious',
  'tired',
  'calm',
  'productive',
  'warm',
];

/** 情绪关键词词典 */
const EMOTION_KEYWORDS: Record<EmotionCategory, string[]> = {
  joy: ['开心', '高兴', '快乐', '喜悦', '幸福', '兴奋', '激动', '太棒了', '好开心', '哈哈', '爽', '欢喜', '愉快', '愉悦', '笑', '乐'],
  sad: ['难过', '伤心', '悲伤', '哭', '失落', '沮丧', '痛苦', '绝望', '心碎', '好难过', '哭了', '委屈', '难受'],
  longing: ['想念', '思念', '想你', '怀念', '牵挂', '回忆', '念念不忘', '舍不得', '想家', '故人', '离别', '分开'],
  anxious: ['紧张', '焦虑', '着急', '慌', '担心', '害怕', '恐惧', '忐忑', '不安', '压力山大', '焦虑不安', '怕'],
  tired: ['累', '疲惫', '好累', '累瘫', '身心俱疲', '筋疲力尽', '好累啊', '撑不住', '疲惫不堪', '困', '乏'],
  calm: ['平静', '安静', '放松', '舒服', '惬意', '悠然', '自在', '平和', '宁静', '安心', '恬淡', '闲适'],
  productive: ['充实', '高效', '有成就感', '完成', '搞定', '收获满满', '成就感', '干劲满满', '效率', '产出', '成果'],
  warm: ['温暖', '治愈', '感动', '温馨', '美好', '温柔', '柔软', '暖心', '治愈系', '被治愈', '甜'],
};

/**
 * 根据文本关键词判断情绪分类
 */
export function detectEmotion(text: string): EmotionCategory {
  const scores: Record<EmotionCategory, number> = {
    joy: 0, sad: 0, longing: 0, anxious: 0,
    tired: 0, calm: 0, productive: 0, warm: 0,
  };

  for (const emotion of EMOTION_CATEGORIES) {
    const keywords = EMOTION_KEYWORDS[emotion];
    for (const kw of keywords) {
      if (text.includes(kw)) {
        scores[emotion] += 1;
      }
    }
  }

  let maxEmotion: EmotionCategory = 'calm';
  let maxScore = 0;
  for (const emotion of EMOTION_CATEGORIES) {
    if (scores[emotion] > maxScore) {
      maxScore = scores[emotion];
      maxEmotion = emotion;
    }
  }

  return maxEmotion;
}

/** 情绪丹青风格配置 */
const EMOTION_STYLES: Record<EmotionCategory, { primary: string; secondary: string; accent: string; composition: string }> = {
  joy: {
    primary: '朱砂红 #C0392B',
    secondary: '鎏金 #C9A227',
    accent: '亮金色高光',
    composition: '放射绽放状构图，从中心向外层层扩散，充满能量感和跃动感',
  },
  sad: {
    primary: '青墨冷沉 #2F6B7A',
    secondary: '灰蓝色调',
    accent: '大面积留白',
    composition: '低沉下坠的构图，上部大量留白，色块缓慢下沉，忧伤而沉静',
  },
  longing: {
    primary: '青蓝雾感 #5B7FA3',
    secondary: '淡紫色晕染',
    accent: '暖金色微光点缀',
    composition: '流动上升的构图，色块如云雾般轻柔向上飘浮，朦胧而悠远',
  },
  anxious: {
    primary: '朱砂红 #C0392B 与 鎏金 #C9A227 交织',
    secondary: '深墨色 #1E2B33',
    accent: '亮红色焦点',
    composition: '快速交错的线条构图，动感强烈，色块碰撞交织，充满张力',
  },
  tired: {
    primary: '深墨色 #1E2B33 与 石绿 #3E8E7E',
    secondary: '灰蓝色调',
    accent: '暗沉色块',
    composition: '下坠厚重的构图，色块堆积下沉，质感厚重而缓慢',
  },
  calm: {
    primary: '暖金淡赭色 #C9A227',
    secondary: '石绿 #3E8E7E',
    accent: '柔和光晕',
    composition: '舒展留白的构图，色块平缓分布，宁静而开阔，呼吸感十足',
  },
  productive: {
    primary: '石青 #2F6B7A',
    secondary: '鎏金 #C9A227',
    accent: '清晰块面结构',
    composition: '稳静有序的构图，几何块面清晰分明，秩序感和稳定感强',
  },
  warm: {
    primary: '石绿 #3E8E7E 与 暖金 #C9A227',
    secondary: '朱砂淡红色',
    accent: '圆润柔光',
    composition: '包裹流动的构图，圆润的色块相互环绕包裹，温暖柔和',
  },
};

/**
 * 构建丹青风格生图 prompt
 */
export function buildDanqingPrompt(moodText: string, emotion: EmotionCategory): string {
  const style = EMOTION_STYLES[emotion];
  return `
纯抽象艺术作品，100% 抽象，禁止出现任何具象物体（山水、花鸟、人物、动物、建筑、树木、文字、五官、咖啡杯、家具等），只能有流体、色块、纹理、光晕、墨点、笔触、云雾。

中国传统丹青水墨风格，宣纸暖米色底色，整体清透明净，不脏不糊，留白充足。

色彩基调：主色调为${style.primary}，辅助色为${style.secondary}，焦点色为${style.accent}。

构图动势：${style.composition}。

质感层次：
- 70% 水彩/水墨流体渐变，云雾交融，丝滑流动，边缘柔和晕染
- 15% 局部刮刀厚涂肌理，有凸出感和笔触质感
- 15% 细微颗粒金粉光泽与一丝霓虹微光点缀

创作灵感来源于用户的心情描述："${moodText}"。

2048x2048 正方形画幅，超高画质，博物馆级艺术品质感。
  `.trim();
}

// 兼容导出别名
export const emotionLabels = EMOTION_LABELS;
export const emotionColorMap = EMOTION_COLORS;
