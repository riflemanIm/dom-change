'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import VisibilityOffRounded from '@mui/icons-material/VisibilityOffRounded';
import VisibilityRounded from '@mui/icons-material/VisibilityRounded';
import { Alert, Button, IconButton, InputAdornment, Link, Stack, TextField, Typography } from '@mui/material';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuth } from './use-auth';
import { startRouteLoading } from '@/components/navigation/RouteLoadingBar';

const formSchema = z.object({
  email: z.email('Введите корректный email'),
  displayName: z.string().min(2, 'Минимум 2 символа').max(60).optional(),
  password: z.string().min(10, 'Минимум 10 символов').regex(/[a-zа-яё]/i, 'Добавьте букву').regex(/\d/, 'Добавьте цифру'),
});

type FormValues = z.infer<typeof formSchema>;

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const { login, registerUser } = useAuth();
  const [serverError, setServerError] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) });

  const onSubmit = async (values: FormValues) => {
    setServerError('');
    try {
      if (mode === 'register') {
        if (!values.displayName) {
          setServerError('Укажите, как к вам обращаться');
          return;
        }
        await registerUser({ ...values, displayName: values.displayName });
      } else {
        await login(values);
      }
      startRouteLoading();
      router.push('/account');
    } catch (error) {
      setServerError((error as Error).message);
    }
  };

  return (
    <Stack component="form" onSubmit={handleSubmit(onSubmit)} spacing={2.5}>
      {serverError && <Alert severity="error">{serverError}</Alert>}
      {mode === 'register' && (
        <TextField
          label="Как к вам обращаться"
          autoComplete="name"
          error={Boolean(errors.displayName)}
          helperText={errors.displayName?.message}
          {...register('displayName')}
        />
      )}
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        error={Boolean(errors.email)}
        helperText={errors.email?.message}
        {...register('email')}
      />
      <TextField
        label="Пароль"
        type={passwordVisible ? 'text' : 'password'}
        autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
        error={Boolean(errors.password)}
        helperText={errors.password?.message ?? (mode === 'register' ? 'Не менее 10 символов, буква и цифра' : undefined)}
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  type="button"
                  edge="end"
                  aria-label={passwordVisible ? 'Скрыть пароль' : 'Показать пароль'}
                  aria-pressed={passwordVisible}
                  onClick={() => setPasswordVisible((visible) => !visible)}
                >
                  {passwordVisible ? <VisibilityOffRounded /> : <VisibilityRounded />}
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
        {...register('password')}
      />
      {mode === 'login' && <Link component={NextLink} href="/forgot-password" sx={{ alignSelf: 'flex-end' }}>Забыли пароль?</Link>}
      <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>
        {isSubmitting ? 'Подождите…' : mode === 'register' ? 'Создать аккаунт' : 'Войти'}
      </Button>
      {mode === 'register' && (
        <Typography variant="caption" color="text.secondary">
          Создавая аккаунт, вы соглашаетесь с правилами сервиса и политикой конфиденциальности.
        </Typography>
      )}
    </Stack>
  );
}
