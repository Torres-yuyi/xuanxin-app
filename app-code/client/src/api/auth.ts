import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { AxiosHeaders } from 'axios';
import type {
  AuthUser,
  AuthResponse,
} from '@shared/api.interface';

const TOKEN_KEY = 'xuanxin_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// 请求拦截：注入 token
axiosForBackend.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    const headers = AxiosHeaders.from(config.headers);
    headers.set('Authorization', `Bearer ${token}`);
    config.headers = headers;
  }
  return config;
});

// 响应拦截：401 时清除 token
axiosForBackend.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearToken();
    }
    return Promise.reject(error);
  },
);

export async function register(username: string, password: string, nickname?: string): Promise<AuthResponse> {
  const res = await axiosForBackend.post('/api/auth/register', { username, password, nickname });
  return res.data as AuthResponse;
}

export async function login(username: string, password: string): Promise<AuthResponse> {
  const res = await axiosForBackend.post('/api/auth/login', { username, password });
  return res.data as AuthResponse;
}

export async function getCurrentUser(): Promise<AuthUser> {
  const res = await axiosForBackend.get('/api/auth/me');
  return res.data as AuthUser;
}
