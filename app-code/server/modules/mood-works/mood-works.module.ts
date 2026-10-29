import { Module } from '@nestjs/common';
import { MoodWorksController } from './mood-works.controller';
import { MoodWorksService } from './mood-works.service';

@Module({
  controllers: [MoodWorksController],
  providers: [MoodWorksService],
  exports: [MoodWorksService],
})
export class MoodWorksModule {}
