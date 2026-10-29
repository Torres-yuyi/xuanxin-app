import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = 'xuanxin-secret-key';

export interface JwtPayload {
  id: string;
  username: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

function extractAndVerify(req: Request): JwtPayload | null {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice(7);
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const payload = extractAndVerify(req);
    if (!payload) {
      throw new UnauthorizedException('未登录或登录已过期');
    }
    req.user = payload;
    return true;
  }
}

/**
 * 可选登录：token 有效时挂载 user，无效/缺失时也放行
 * 用于广场列表等公共接口，登录态可返回 isLiked 等个性化信息
 */
@Injectable()
export class JwtOptionalAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const payload = extractAndVerify(req);
    if (payload) {
      req.user = payload;
    }
    return true;
  }
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}
