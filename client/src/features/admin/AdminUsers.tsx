'use client';

import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Paper, Stack, Switch, TextField, Typography } from '@mui/material';
import { useAuth } from '@/features/auth/use-auth';
import { FormEvent, useEffect, useState } from 'react';
import { adminApi, AdminDeletionPreview, AdminUser, AdminUserUpdate } from './admin-api';

const empty = { email: '', displayName: '', password: '', role: 'USER' as AdminUser['role'], emailVerified: true };

export function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [items, setItems] = useState<AdminUser[]>([]);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState<AdminUserUpdate>({});
  const [deleting, setDeleting] = useState<{ item: AdminUser; preview: AdminDeletionPreview } | null>(null);
  const [confirmation, setConfirmation] = useState('');
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

  const openEdit = async (item: AdminUser) => {
    setBusy(true); setError(''); setMessage('');
    try {
      const details = await adminApi.userDetails(item.id);
      setEditing(details);
      setEditForm({
        email: details.email ?? '', phone: details.phone ?? '', displayName: details.profile?.displayName ?? '',
        surname: details.profile?.surname ?? '', patronymic: details.profile?.patronymic ?? '',
        city: details.profile?.city ?? '', description: details.profile?.description ?? '',
        adultsCount: details.profile?.adultsCount ?? 1, childrenCount: details.profile?.childrenCount ?? 0,
        hasPets: details.profile?.hasPets ?? false, interests: details.profile?.interests ?? [],
        travelPreferences: details.profile?.travelPreferences ?? [], role: details.role, status: details.status,
        trustLevel: details.trustLevel ?? 'NEW', emailVerified: details.emailVerified,
        phoneVerified: details.phoneVerified ?? false, password: '',
      });
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  };

  const saveEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const payload = { ...editForm };
      if (!payload.password) delete payload.password;
      await adminApi.updateUser(editing.id, payload);
      setEditing(null);
      await load(query);
      setMessage('Данные пользователя сохранены.');
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  };

  const openDelete = async (item: AdminUser) => {
    setBusy(true); setError(''); setMessage('');
    try {
      const preview = await adminApi.deletionPreview(item.id);
      setDeleting({ item, preview }); setConfirmation('');
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  };

  const removeUser = async () => {
    if (!deleting) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await adminApi.deleteUser(deleting.item.id, confirmation);
      setDeleting(null);
      await load(query);
      setMessage(result.storageCleanupFailed
        ? `Пользователь удалён, но не удалось очистить ${result.storageCleanupFailed} файлов в хранилище.`
        : 'Пользователь и связанные данные удалены.');
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  };

  const setField = <K extends keyof AdminUserUpdate>(key: K, value: AdminUserUpdate[K]) =>
    setEditForm((current) => ({ ...current, [key]: value }));

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
    {items.map((item) => <Paper key={item.id} variant="outlined" sx={{ p: 2 }}>
      <Typography fontWeight={700}>{item.profile?.displayName ?? 'Без имени'}</Typography>
      <Typography color="text.secondary">{item.email} · {item.role} · {item.status}{item.emailVerified ? ' · email подтверждён' : ''}</Typography>
      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
        <Button size="small" onClick={() => void openEdit(item)} disabled={busy}>Редактировать</Button>
        <Button size="small" color="error" onClick={() => void openDelete(item)} disabled={busy || item.id === currentUser?.id}>Удалить полностью</Button>
      </Stack>
    </Paper>)}
    <Dialog open={Boolean(editing)} onClose={() => !busy && setEditing(null)} fullWidth maxWidth="sm">
      <form onSubmit={saveEdit}>
        <DialogTitle>Редактировать пользователя</DialogTitle>
        <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField required type="email" label="Email" value={editForm.email ?? ''} onChange={(event) => setField('email', event.target.value)} />
          <TextField label="Телефон" value={editForm.phone ?? ''} onChange={(event) => setField('phone', event.target.value)} />
          <TextField required label="Имя" value={editForm.displayName ?? ''} onChange={(event) => setField('displayName', event.target.value)} />
          <TextField label="Фамилия" value={editForm.surname ?? ''} onChange={(event) => setField('surname', event.target.value)} />
          <TextField label="Отчество" value={editForm.patronymic ?? ''} onChange={(event) => setField('patronymic', event.target.value)} />
          <TextField label="Город" value={editForm.city ?? ''} onChange={(event) => setField('city', event.target.value)} />
          <TextField label="О себе" multiline minRows={3} value={editForm.description ?? ''} onChange={(event) => setField('description', event.target.value)} />
          <Stack direction="row" spacing={2}>
            <TextField fullWidth type="number" label="Взрослые" value={editForm.adultsCount ?? 1} onChange={(event) => setField('adultsCount', Number(event.target.value))} />
            <TextField fullWidth type="number" label="Дети" value={editForm.childrenCount ?? 0} onChange={(event) => setField('childrenCount', Number(event.target.value))} />
          </Stack>
          <FormControlLabel control={<Switch checked={editForm.hasPets ?? false} onChange={(event) => setField('hasPets', event.target.checked)} />} label="Есть питомцы" />
          <TextField label="Интересы (через запятую)" value={(editForm.interests ?? []).join(', ')} onChange={(event) => setField('interests', event.target.value.split(',').map((value) => value.trim()).filter(Boolean))} />
          <TextField label="Предпочтения в путешествиях (через запятую)" value={(editForm.travelPreferences ?? []).join(', ')} onChange={(event) => setField('travelPreferences', event.target.value.split(',').map((value) => value.trim()).filter(Boolean))} />
          <TextField select label="Роль" value={editForm.role ?? 'USER'} onChange={(event) => setField('role', event.target.value as AdminUser['role'])}>
            <MenuItem value="USER">Пользователь</MenuItem><MenuItem value="MODERATOR">Модератор</MenuItem><MenuItem value="ADMIN">Администратор</MenuItem>
          </TextField>
          <TextField select label="Статус" value={editForm.status ?? 'ACTIVE'} onChange={(event) => setField('status', event.target.value)}>
            <MenuItem value="ACTIVE">Активен</MenuItem><MenuItem value="RESTRICTED">Ограничен</MenuItem><MenuItem value="BLOCKED">Заблокирован</MenuItem>
          </TextField>
          <TextField select label="Уровень доверия" value={editForm.trustLevel ?? 'NEW'} onChange={(event) => setField('trustLevel', event.target.value as NonNullable<AdminUser['trustLevel']>)}>
            <MenuItem value="NEW">Новый</MenuItem><MenuItem value="EMAIL_VERIFIED">Email подтверждён</MenuItem>
            <MenuItem value="CONTACTS_VERIFIED">Контакты подтверждены</MenuItem><MenuItem value="VERIFIED_MEMBER">Проверенный участник</MenuItem>
            <MenuItem value="TRUSTED_MEMBER">Надёжный участник</MenuItem>
          </TextField>
          <FormControlLabel control={<Switch checked={editForm.emailVerified ?? false} onChange={(event) => setField('emailVerified', event.target.checked)} />} label="Email подтверждён" />
          <FormControlLabel control={<Switch checked={editForm.phoneVerified ?? false} onChange={(event) => setField('phoneVerified', event.target.checked)} />} label="Телефон подтверждён" />
          <TextField type="password" label="Новый пароль" value={editForm.password ?? ''} onChange={(event) => setField('password', event.target.value)} helperText="Оставьте пустым, чтобы не менять. При смене пароля сессии завершатся." />
        </Stack></DialogContent>
        <DialogActions><Button onClick={() => setEditing(null)} disabled={busy}>Отмена</Button><Button type="submit" variant="contained" disabled={busy}>Сохранить</Button></DialogActions>
      </form>
    </Dialog>
    <Dialog open={Boolean(deleting)} onClose={() => !busy && setDeleting(null)} fullWidth maxWidth="sm">
      <DialogTitle>Удалить пользователя безвозвратно?</DialogTitle>
      <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
        {error && <Alert severity="error">{error}</Alert>}
        <Alert severity="warning">Будут удалены профиль, аккаунт, баллы и история операций, {deleting?.preview.propertyCount ?? 0} домов с фото и {deleting?.preview.affectedRequestCount ?? 0} связанных заявок с чатами и отзывами. Часть заявок может принадлежать другим пользователям. Восстановить данные нельзя.</Alert>
        <Typography>Для подтверждения введите {deleting?.preview.email ? `email ${deleting.preview.email}` : `ID ${deleting?.item.id}`}:</Typography>
        <TextField autoFocus label="Подтверждение" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
      </Stack></DialogContent>
      <DialogActions><Button onClick={() => setDeleting(null)} disabled={busy}>Отмена</Button>
        <Button color="error" variant="contained" disabled={busy || confirmation !== (deleting?.preview.email || deleting?.item.id)} onClick={() => void removeUser()}>Удалить безвозвратно</Button>
      </DialogActions>
    </Dialog>
  </Stack>;
}
