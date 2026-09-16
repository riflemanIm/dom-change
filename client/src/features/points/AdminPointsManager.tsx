'use client';

import AddRounded from '@mui/icons-material/AddRounded';
import RemoveRounded from '@mui/icons-material/RemoveRounded';
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/use-auth';
import { AdminPointsUser, adminPointsApi } from './admin-points-api';

type Operation = 'credit' | 'debit';

export function AdminPointsManager() {
  const { user, isLoading: authLoading } = useAuth();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<AdminPointsUser[] | null>(null);
  const [selected, setSelected] = useState<AdminPointsUser | null>(null);
  const [operation, setOperation] = useState<Operation>('credit');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async (search = query) => {
    setBusy(true);
    setError('');
    try {
      setItems(await adminPointsApi.users(search));
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'ADMIN') void load('');
    // Initial list is loaded only after the role is known.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  if (authLoading) return <Stack alignItems="center" py={10}><CircularProgress /></Stack>;
  if (!user || user.role !== 'ADMIN') return <Alert severity="error">Раздел доступен только администратору.</Alert>;

  const openAdjustment = (target: AdminPointsUser) => {
    setSelected(target);
    setOperation('credit');
    setAmount('');
    setReason('');
    setError('');
    setMessage('');
  };

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    void load();
  };

  const submitAdjustment = async () => {
    if (!selected) return;
    const value = Number(amount);
    if (!Number.isInteger(value) || value < 1) return;
    setBusy(true);
    setError('');
    try {
      const updated = await adminPointsApi.adjust(selected.id, operation === 'credit' ? value : -value, reason.trim());
      setItems((current) => current?.map((item) => item.id === updated.id ? updated : item) ?? []);
      setSelected(null);
      setMessage(`${operation === 'credit' ? 'Начислено' : 'Списано'} ${value} ДомБаллов пользователю ${updated.profile?.displayName ?? updated.email}.`);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h3" fontWeight={700}>Управление ДомБаллами</Typography>
        <Typography color="text.secondary" mt={1}>Ручные начисления и списания с обязательной записью в историю операций.</Typography>
      </Box>
      <Paper component="form" onSubmit={submitSearch} sx={{ p: 2.5 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField fullWidth label="Email или имя пользователя" value={query} onChange={(event) => setQuery(event.target.value)} />
          <Button type="submit" variant="contained" disabled={busy} sx={{ minWidth: 120 }}>Найти</Button>
        </Stack>
      </Paper>
      {message && <Alert severity="success" onClose={() => setMessage('')}>{message}</Alert>}
      {error && !selected && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      {!items && busy && <Stack alignItems="center" py={6}><CircularProgress /></Stack>}
      {items?.length === 0 && <Alert severity="info">Пользователи не найдены.</Alert>}
      {items?.map((item) => (
        <Paper key={item.id} variant="outlined" sx={{ p: 2.5 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={2}>
            <Stack direction="row" alignItems="center" spacing={2} minWidth={0}>
              <Avatar src={item.profile?.avatarUrl ?? undefined}>{item.profile?.displayName?.slice(0, 1) ?? '?'}</Avatar>
              <Box minWidth={0}>
                <Typography fontWeight={750} noWrap>{item.profile?.displayName ?? 'Без имени'}</Typography>
                <Typography color="text.secondary" variant="body2" noWrap>{item.email ?? 'Email не указан'} · {item.role}</Typography>
              </Box>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box textAlign={{ sm: 'right' }}>
                <Typography fontWeight={800}>{item.pointAccount?.available ?? '0'} ДомБаллов</Typography>
                {item.pointAccount && item.pointAccount.reserved !== '0' && <Typography variant="caption" color="text.secondary">В резерве: {item.pointAccount.reserved}</Typography>}
              </Box>
              <Button variant="outlined" disabled={!item.pointAccount} onClick={() => openAdjustment(item)}>Изменить</Button>
            </Stack>
          </Stack>
        </Paper>
      ))}

      <Dialog open={Boolean(selected)} onClose={() => !busy && setSelected(null)} fullWidth maxWidth="sm">
        <DialogTitle>Изменить баланс</DialogTitle>
        <DialogContent>
          <Typography fontWeight={750}>{selected?.profile?.displayName ?? selected?.email}</Typography>
          <Typography color="text.secondary" mb={2}>Доступно: {selected?.pointAccount?.available ?? '0'} ДомБаллов</Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <ToggleButtonGroup exclusive fullWidth value={operation} onChange={(_, value: Operation | null) => value && setOperation(value)} sx={{ mb: 2 }}>
            <ToggleButton value="credit" color="success"><AddRounded sx={{ mr: 1 }} />Начислить</ToggleButton>
            <ToggleButton value="debit" color="error"><RemoveRounded sx={{ mr: 1 }} />Списать</ToggleButton>
          </ToggleButtonGroup>
          <Stack spacing={2}>
            <TextField
              autoFocus
              label="Количество"
              type="number"
              value={amount}
              onChange={(event) => setAmount(event.target.value.replace(/[^\d]/g, '').slice(0, 7))}
              inputProps={{ min: 1, max: 1_000_000, step: 1 }}
              InputProps={{ endAdornment: <InputAdornment position="end">ДомБаллов</InputAdornment> }}
            />
            <TextField multiline minRows={3} label="Причина" value={reason} onChange={(event) => setReason(event.target.value.slice(0, 300))} helperText={`${reason.trim().length}/300 · минимум 5 символов`} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={() => setSelected(null)}>Отмена</Button>
          <Button color={operation === 'credit' ? 'success' : 'error'} variant="contained" disabled={busy || !amount || reason.trim().length < 5} onClick={() => void submitAdjustment()}>
            {busy ? 'Сохраняем…' : operation === 'credit' ? 'Начислить' : 'Списать'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
