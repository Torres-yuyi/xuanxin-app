import { IsString, IsArray, IsNumber, MaxLength, IsOptional, IsIn, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import type { MoodWorkCreateRequest, EmotionCategory, DominantColor } from '@shared/api.interface';

const EMOTION_CATEGORIES: EmotionCategory[] = [
  'joy', 'sad', 'longing', 'anxious', 'tired', 'calm', 'productive', 'warm',
];

export class DominantColorDto implements DominantColor {
  @IsString()
  hex!: string;

  @IsNumber()
  weight!: number;
}

export class CreateMoodWorkDto implements MoodWorkCreateRequest {
  @IsString()
  @MaxLength(500)
  moodText!: string;

  @IsString()
  imageUrl!: string;

  // eslint-disable-next-line @darraghor/nestjs-typed/validated-non-primitive-property-needs-type-decorator
  @IsString()
  @IsIn(EMOTION_CATEGORIES)
  emotionCategory!: EmotionCategory;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DominantColorDto)
  dominantColors!: DominantColor[];
}
