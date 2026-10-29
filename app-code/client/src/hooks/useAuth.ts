import { useState, useEffect, useCallback } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';

const TOKEN_KEY = 'xuanxin_token';
const USER_KEY = 'xuanxin_user';

export interface AuthUser {
  id: string;
  username: string;
  nickname?: string;
}

/**
 * 登录态 hook
 * - token / user 从 localStorage 读取
 * - login(token, user) 保存登录态
 * - logout() 清除登录态
 *
 * axios 请求拦截器由 @/api/auth 在模块加载时全局注册，
 * 本 hook 只负责状态管理与读写 localStorage。
 */
export function useAuth() {
  const [token, setTokenState] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  });

  const [user, setUserState] = useState<AuthUser | null>(() => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(USER_KEY);
    if (!stored) return null;
    try {
      return JSON.parse(stored) as AuthUser;
    } catch {
      return null;
    }
  });

  const login = useCallback((newToken: string, newUser: AuthUser) => {
    try {
      localStorage.setItem(TOKEN_KEY, newToken);
      localStorage.setItem(USER_KEY, JSON.stringify(newUser));
      setTokenState(newToken);
      setUserState(newUser);
    } catch (error) {
      logger.error('登录态保存失败', error);
    }
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      setTokenState(null);
      setUserState(null);
    } catch (error) {
      logger.error('登出失败', error);
    }
  }, []);

  // 监听 storage 事件（多标签同步）
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === TOKEN_KEY) {
        setTokenState(e.newValue);
      }
      if (e.key === USER_KEY) {
        if (e.newValue) {
          try {
            setUserState(JSON.parse(e.newValue) as AuthUser);
          } catch {
            setUserState(null);
          }
        } else {
          setUserState(null);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const isLoggedIn = !!token && !!user;

  return {
    token,
    user,
    isLoggedIn,
    login,
    logout,
  };
}
