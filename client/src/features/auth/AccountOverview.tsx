'use client';

import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import { Alert, Box, Button, CircularProgress, Paper, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import Link from 'next/link';
import { authApi } from './auth-api';
import { useAuth } from './use-auth';

export function AccountOverview() {
  const { user, isLoading, error: authError, refreshUser } = useAuth();
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sendingCode, setSendingCode] = useState(false);

  if (isLoading) return <Stack alignItems="center" py={10}><CircularProgress /></Stack>;
  if (!user && authError) return <Alert severity="error">{authError.message}</Alert>;
  if (!user) return null;

  const resendCode = async () => {
    setSendingCode(true);
    setError('');
    setMessage('');
    try {
      await authApi.resendEmailCode();
      setCode('');
      setMessage('Новый код отправлен');
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setSendingCode(false);
    }
  };

  const verify = async () => {
    setError('');
    setMessage('');
    try {
      const result = await authApi.verifyEmail(code);
      setMessage(`Email подтверждён. Начислено ${result.bonusAwarded} ДомБаллов.`);
      await refreshUser();
    } catch (reason) {
      setError((reason as Error).message);
    }
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h3" fontWeight={750}>Здравствуйте, {user.profile.displayName}</Typography>
        <Typography color="text.secondary" mt={1}>Управляйте профилем, жильём и поездками в одном месте.</Typography>
      </Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <Paper sx={{ p: 3, flex: 1 }}>
          <Typography color="text.secondary">Доступно</Typography>
          <Typography variant="h4" fontWeight={800}>{user.points.available} ДомБаллов</Typography>
        </Paper>
        <Paper sx={{ p: 3, flex: 1 }}>
          <Typography color="text.secondary">Уровень доверия</Typography>
          <Typography variant="h5" fontWeight={750}>{user.trustLevel}</Typography>
        </Paper>
      </Stack>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" fontWeight={750}>Ваше жильё</Typography>
        <Typography color="text.secondary" mt={1} mb={2}>Создайте объявление, чтобы принимать гостей и получать ДомБаллы.</Typography>
        <Stack direction="row" spacing={1}>
          <Button component={Link} href="/account/homes" variant="outlined">Мои объявления</Button>
          <Button component={Link} href="/account/homes/new" variant="contained">Добавить жильё</Button>
        </Stack>
      </Paper>
      {(user.role === 'ADMIN' || user.role === 'MODERATOR') && (
        <Paper id="email-verification" sx={{ p: 3, scrollMarginTop: 24 }}>
          <Typography variant="h5" fontWeight={750}>Модерация</Typography>
          <Typography color="text.secondary" mt={1} mb={2}>Проверьте новые объявления перед публикацией в каталоге.</Typography>
          <Button component={Link} href="/admin/moderation" variant="contained">Открыть очередь</Button>
        </Paper>
      )}
      {!user.emailVerified ? (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" fontWeight={750}>Подтвердите email</Typography>
          <Typography color="text.secondary" mt={1} mb={2}>
            Код отправлен на {user.email}. В локальной разработке его также можно увидеть в Mailpit.
          </Typography>
          {error && (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              action={error === 'Код неверен или истёк' ? (
                <Button color="inherit" size="small" disabled={sendingCode} onClick={() => void resendCode()}>
                  Отправить новый код
                </Button>
              ) : undefined}
            >
              {error}
            </Alert>
          )}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField label="Код из 6 цифр" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} />
            <Button variant="contained" disabled={code.length !== 6} onClick={verify}>Подтвердить</Button>
            <Button disabled={sendingCode} onClick={() => void resendCode()}>{sendingCode ? 'Отправляем…' : 'Отправить ещё раз'}</Button>
          </Stack>
        </Paper>
      ) : (
        <Alert severity="success" icon={<CheckCircleRounded />}>Email подтверждён</Alert>
      )}
      {message && <Alert severity="success">{message}</Alert>}
    </Stack>
  );
}
