import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';

import { MoodWorksService } from './mood-works.service';
import { CreateMoodWorkDto } from './dto/create-mood-work.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/mood-works')
export class MoodWorksController {
  constructor(private readonly moodWorksService: MoodWorksService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Req() req: Request, @Body() dto: CreateMoodWorkDto) {
    const userId = req.user!.id;
    return this.moodWorksService.create(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async list(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const userId = req.user!.id;
    const pageNum = page ? parseInt(page, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 20;
    if (pageNum < 1 || pageSizeNum < 1 || pageSizeNum > 100) {
      throw new BadRequestException('分页参数不合法');
    }
    return this.moodWorksService.list(userId, pageNum, pageSizeNum);
  }

  @UseGuards(JwtAuthGuard)
  @Get('range')
  async range(
    @Req() req: Request,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const userId = req.user!.id;
    if (!startDate || !endDate) {
      throw new BadRequestException('startDate 和 endDate 必填');
    }
    return this.moodWorksService.getByDateRange(userId, startDate, endDate);
  }

  @UseGuards(JwtAuthGuard)
  @Get('year')
  async year(@Req() req: Request, @Query('year') year: string) {
    const userId = req.user!.id;
    const yearNum = parseInt(year, 10);
    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
      throw new BadRequestException('年份不合法');
    }
    return this.moodWorksService.getByYear(userId, yearNum);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Req() req: Request, @Param('id') id: string) {
    const userId = req.user!.id;
    await this.moodWorksService.remove(userId, id);
    return { success: true };
  }
}
