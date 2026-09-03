'use client';

import { Alert, Button, Stack, TextField, Typography } from '@mui/material';
import NextLink from 'next/link';
import { FormEvent, useState } from 'react';
import { disconnectRealtime } from '@/features/realtime/realtime-client';
import { authApi } from './auth-api';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      await authApi.requestPasswordReset(email);
      setSent(true);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setPending(false);
    }
  };

  if (sent) return <Alert severity="success">Если аккаунт с таким email существует, мы отправили ссылку для восстановления. Проверьте входящие и папку «Спам».</Alert>;
  return (
    <Stack component="form" spacing={2.5} onSubmit={submit}>
      {error && <Alert severity="error">{error}</Alert>}
      <TextField required type="email" label="Email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      <Button type="submit" size="large" variant="contained" disabled={pending}>{pending ? 'Отправляем…' : 'Отправить ссылку'}</Button>
    </Stack>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (password !== confirmation) return setError('Пароли не совпадают');
    if (password.length < 10 || !/[a-zа-яё]/i.test(password) || !/\d/.test(password)) return setError('Пароль должен содержать минимум 10 символов, букву и цифру');
    setPending(true);
    try {
      await authApi.resetPassword(token, password);
      disconnectRealtime();
      setDone(true);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setPending(false);
    }
  };

  if (!token) return <Alert severity="error">В ссылке отсутствует token восстановления. Запросите новое письмо.</Alert>;
  if (done) return <Stack spacing={2}><Alert severity="success">Пароль изменён. Все ранее открытые сессии завершены.</Alert><Button component={NextLink} href="/login" variant="contained">Войти с новым паролем</Button></Stack>;
  return (
    <Stack component="form" spacing={2.5} onSubmit={submit}>
      {error && <Alert severity="error">{error}</Alert>}
      <TextField required type="password" label="Новый пароль" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} helperText="Не менее 10 символов, буква и цифра" />
      <TextField required type="password" label="Повторите пароль" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
      <Button type="submit" size="large" variant="contained" disabled={pending}>{pending ? 'Сохраняем…' : 'Установить новый пароль'}</Button>
      <Typography variant="caption" color="text.secondary">После смены пароля потребуется заново войти на всех устройствах.</Typography>
    </Stack>
  );
}
