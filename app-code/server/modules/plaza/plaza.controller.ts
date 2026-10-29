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

import { PlazaService } from './plaza.service';
import { CreatePostDto, CreateCommentDto } from './dto/create-post.dto';
import { JwtAuthGuard, JwtOptionalAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/plaza')
export class PlazaController {
  constructor(private readonly plazaService: PlazaService) {}

  @UseGuards(JwtOptionalAuthGuard)
  @Get('posts')
  async listPosts(
    @Req() req: Request,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 12;
    if (limitNum < 1 || limitNum > 50) {
      throw new BadRequestException('limit 参数不合法');
    }
    const userId = req.user?.id;
    return this.plazaService.listPosts(cursor, limitNum, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my/posts')
  async listMyPosts(
    @Req() req: Request,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    if (limitNum < 1 || limitNum > 100) {
      throw new BadRequestException('limit 参数不合法');
    }
    const userId = req.user!.id;
    return this.plazaService.listMyPosts(userId, limitNum);
  }

  @UseGuards(JwtAuthGuard)
  @Post('posts')
  async createPost(@Req() req: Request, @Body() dto: CreatePostDto) {
    const userId = req.user!.id;
    return this.plazaService.createPost(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('posts/:id/like')
  async toggleLike(@Req() req: Request, @Param('id') postId: string) {
    const userId = req.user!.id;
    return this.plazaService.toggleLike(postId, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('posts/:id')
  async deletePost(@Req() req: Request, @Param('id') postId: string) {
    const userId = req.user!.id;
    await this.plazaService.deletePost(postId, userId);
    return { success: true };
  }

  @Get('posts/:id/comments')
  async listComments(@Param('id') postId: string) {
    return this.plazaService.listComments(postId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('posts/:id/comments')
  async createComment(
    @Req() req: Request,
    @Param('id') postId: string,
    @Body() dto: CreateCommentDto,
  ) {
    const userId = req.user!.id;
    return this.plazaService.createComment(postId, userId, dto.content);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('comments/:id')
  async deleteComment(@Req() req: Request, @Param('id') commentId: string) {
    const userId = req.user!.id;
    await this.plazaService.deleteComment(commentId, userId);
    return { success: true };
  }
}
