'use client';

import { Alert, Button, FormControlLabel, MenuItem, Paper, Stack, Switch, TextField, Typography } from '@mui/material';
import { FormEvent, useEffect, useState } from 'react';
import { adminApi, AdminUser } from './admin-api';

const empty = { email: '', displayName: '', password: '', role: 'USER' as AdminUser['role'], emailVerified: true };

export function AdminUsers() {
  const [items, setItems] = useState<AdminUser[]>([]);
  const [form, setForm] = useState(empty);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const load = async (search = '') => {
    setBusy(true);
    try { setItems(await adminApi.users(search)); setError(''); }
    catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  };
  useEffect(() => { void load(); }, []);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      const created = await adminApi.createUser(form);
      setItems((current) => [created, ...current]);
      setMessage(`Пользователь ${created.email} создан. Передайте пароль ему безопасным способом.`);
      setForm(empty);
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  };

  return <Stack spacing={3}>
    <Typography variant="h3">Пользователи</Typography>
    <Typography color="text.secondary">Создавайте аккаунты с нужной ролью. Пароль отображается только при вводе и не возвращается API.</Typography>
    {error && <Alert severity="error">{error}</Alert>}
    {message && <Alert severity="success">{message}</Alert>}
    <Paper component="form" onSubmit={create} variant="outlined" sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Typography variant="h6">Новый пользователь</Typography>
        <TextField required type="email" label="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        <TextField required label="Имя" value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} inputProps={{ minLength: 2, maxLength: 60 }} />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <TextField required fullWidth type={showPassword ? 'text' : 'password'} label="Пароль" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} inputProps={{ minLength: 10, maxLength: 128 }} helperText="10–128 символов, буква и цифра" />
          <Button onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Скрыть' : 'Показать'}</Button>
        </Stack>
        <TextField select label="Роль" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as AdminUser['role'] })}>
          <MenuItem value="USER">Пользователь</MenuItem><MenuItem value="MODERATOR">Модератор</MenuItem><MenuItem value="ADMIN">Администратор</MenuItem>
        </TextField>
        <FormControlLabel control={<Switch checked={form.emailVerified} onChange={(event) => setForm({ ...form, emailVerified: event.target.checked })} />} label="Email подтверждён администратором" />
        <Button type="submit" variant="contained" disabled={busy}>Создать пользователя</Button>
      </Stack>
    </Paper>
    <Paper component="form" onSubmit={(event: FormEvent) => { event.preventDefault(); void load(query); }} variant="outlined" sx={{ p: 2 }}>
      <Stack direction="row" spacing={1}><TextField fullWidth label="Поиск по email или имени" value={query} onChange={(event) => setQuery(event.target.value)} /><Button type="submit" disabled={busy}>Найти</Button></Stack>
    </Paper>
    {items.map((item) => <Paper key={item.id} variant="outlined" sx={{ p: 2 }}><Typography fontWeight={700}>{item.profile?.displayName ?? 'Без имени'}</Typography><Typography color="text.secondary">{item.email} · {item.role} · {item.status}{item.emailVerified ? ' · email подтверждён' : ''}</Typography></Paper>)}
  </Stack>;
}
