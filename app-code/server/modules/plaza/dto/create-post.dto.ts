import { IsString, IsOptional, MaxLength, IsIn } from 'class-validator';
import type { PlazaPostCreateRequest, EmotionCategory } from '@shared/api.interface';

const EMOTION_CATEGORIES: EmotionCategory[] = [
  'joy', 'sad', 'longing', 'anxious', 'tired', 'calm', 'productive', 'warm',
];

export class CreatePostDto implements PlazaPostCreateRequest {
  @IsOptional()
  @IsString()
  workId?: string;

  @IsString()
  imageUrl!: string;

  @IsString()
  @MaxLength(200, { message: '配文最多 200 字' })
  caption!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: '补充文字最多 1000 字' })
  supplementText?: string;

  // eslint-disable-next-line @darraghor/nestjs-typed/validated-non-primitive-property-needs-type-decorator
  @IsString()
  @IsIn(EMOTION_CATEGORIES)
  emotionCategory!: EmotionCategory;
}

export class CreateCommentDto {
  @IsString()
  @MaxLength(500, { message: '评论最多 500 字' })
  content!: string;
}
