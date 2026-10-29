import { useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { login, register } from '@/api/auth';
import { useAuth, type AuthUser } from '@/hooks/useAuth';

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: 'login' | 'register';
  onSuccess?: (user: AuthUser) => void;
}

const loginSchema = z.object({
  username: z
    .string()
    .min(3, '用户名至少 3 位')
    .max(32, '用户名最多 32 位'),
  password: z.string().min(6, '密码至少 6 位'),
});

const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, '用户名至少 3 位')
      .max(32, '用户名最多 32 位'),
    password: z.string().min(6, '密码至少 6 位'),
    confirmPassword: z.string().min(6, '确认密码至少 6 位'),
    nickname: z.string().max(32, '昵称最多 32 位').optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '两次密码输入不一致',
    path: ['confirmPassword'],
  });

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthDialog({
  open,
  onOpenChange,
  defaultTab = 'login',
  onSuccess,
}: AuthDialogProps) {
  const { login: setAuthLogin } = useAuth();
  const [tab, setTab] = useState<'login' | 'register'>(defaultTab);
  const [submitting, setSubmitting] = useState(false);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      password: '',
      confirmPassword: '',
      nickname: '',
    },
  });

  const handleLoginSubmit = async (values: LoginFormValues) => {
    setSubmitting(true);
    try {
      const { token, user } = await login(values.username, values.password);
      setAuthLogin(token, user);
      toast.success('登录成功');
      onOpenChange(false);
      onSuccess?.(user);
      loginForm.reset();
    } catch (err: unknown) {
      logger.error('login submit failed', err);
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message || '登录失败，请稍后再试';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (values: RegisterFormValues) => {
    setSubmitting(true);
    try {
      const { token, user } = await register(
        values.username,
        values.password,
        values.nickname || undefined,
      );
      setAuthLogin(token, user);
      toast.success('注册成功');
      onOpenChange(false);
      onSuccess?.(user);
      registerForm.reset();
    } catch (err: unknown) {
      logger.error('register submit failed', err);
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message || '注册失败，请稍后再试';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-popover text-popover-foreground sm:max-w-md shadow-xl">
        <DialogHeader className="text-center">
          <DialogTitle className="font-serif text-xl text-mo-se">
            {tab === 'login' ? '欢迎回来' : '加入渲心'}
          </DialogTitle>
          <DialogDescription>
            {tab === 'login'
              ? '登录后保存你的心情画卷'
              : '注册账号，开启丹青心情之旅'}
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={tab}
          onValueChange={(v: string) => setTab(v as 'login' | 'register')}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">登录</TabsTrigger>
            <TabsTrigger value="register">注册</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="pt-4">
            <Form {...loginForm}>
              <form
                onSubmit={loginForm.handleSubmit(handleLoginSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={loginForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>用户名</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="请输入用户名"
                          autoComplete="username"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>密码</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="请输入密码"
                          autoComplete="current-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full bg-zhu-sha hover:bg-zhu-sha/90"
                  disabled={submitting}
                >
                  {submitting ? '登录中…' : '登录'}
                </Button>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="register" className="pt-4">
            <Form {...registerForm}>
              <form
                onSubmit={registerForm.handleSubmit(handleRegisterSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={registerForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>用户名</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="3-32 位字符"
                          autoComplete="username"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={registerForm.control}
                  name="nickname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>昵称（选填）</FormLabel>
                      <FormControl>
                        <Input placeholder="给自己取个名字" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={registerForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>密码</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="至少 6 位"
                          autoComplete="new-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={registerForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>确认密码</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="再次输入密码"
                          autoComplete="new-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full bg-shi-qing hover:bg-shi-qing/90"
                  disabled={submitting}
                >
                  {submitting ? '注册中…' : '注册'}
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
