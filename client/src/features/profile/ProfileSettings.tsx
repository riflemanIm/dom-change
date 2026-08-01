'use client';

import { Alert, Avatar, Button, Checkbox, CircularProgress, FormControlLabel, Paper, Stack, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { Profile, profileApi } from './profile-api';

export function ProfileSettings() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [interests, setInterests] = useState('');
  const [preferences, setPreferences] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    profileApi.get().then((value) => { setProfile(value); setInterests(value.interests.join(', ')); setPreferences(value.travelPreferences.join(', ')); }).catch((reason: Error) => setError(reason.message));
  }, []);

  if (error && !profile) return <Alert severity="error">{error}</Alert>;
  if (!profile) return <Stack alignItems="center" py={10}><CircularProgress /></Stack>;
  const set = <K extends keyof Profile>(key: K, value: Profile[K]) => setProfile((current) => current ? { ...current, [key]: value } : current);
  const parseList = (value: string) => [...new Set(value.split(',').map((item) => item.trim()).filter(Boolean))].slice(0, 20);

  const save = async () => {
    setPending(true); setError(''); setMessage('');
    try {
      const updated = await profileApi.update({
        displayName: profile.displayName, surname: profile.surname, patronymic: profile.patronymic,
        avatarUrl: profile.avatarUrl, city: profile.city, description: profile.description,
        adultsCount: profile.adultsCount, childrenCount: profile.childrenCount, hasPets: profile.hasPets,
        interests: parseList(interests), travelPreferences: parseList(preferences),
      });
      setProfile(updated); setInterests(updated.interests.join(', ')); setPreferences(updated.travelPreferences.join(', ')); setMessage('Профиль сохранён');
    } catch (reason) { setError((reason as Error).message); }
    finally { setPending(false); }
  };

  return <Stack spacing={3}>
    <div><Typography variant="h3" fontWeight={750}>Настройки профиля</Typography><Typography color="text.secondary" mt={1}>Эти данные помогают участникам понять, с кем они обмениваются домами.</Typography></div>
    {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}{message && <Alert severity="success">{message}</Alert>}
    <Paper sx={{ p: { xs: 2, md: 3 } }}><Stack spacing={2.5}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
        <Avatar src={profile.avatarUrl ?? undefined} sx={{ width: 88, height: 88, fontSize: 32 }}>{profile.displayName.slice(0, 1)}</Avatar>
        <TextField fullWidth label="HTTPS URL аватара" value={profile.avatarUrl ?? ''} onChange={(event) => set('avatarUrl', event.target.value || null)} helperText="Пока используйте постоянную HTTPS-ссылку; загрузку файла добавим через отдельное хранилище аватаров." />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><TextField required fullWidth label="Отображаемое имя" value={profile.displayName} onChange={(event) => set('displayName', event.target.value.slice(0, 60))} /><TextField fullWidth label="Фамилия" value={profile.surname ?? ''} onChange={(event) => set('surname', event.target.value || null)} /><TextField fullWidth label="Отчество" value={profile.patronymic ?? ''} onChange={(event) => set('patronymic', event.target.value || null)} /></Stack>
      <TextField fullWidth label="Город" value={profile.city ?? ''} onChange={(event) => set('city', event.target.value.slice(0, 120) || null)} />
      <TextField fullWidth multiline minRows={4} label="О себе и семье" value={profile.description ?? ''} onChange={(event) => set('description', event.target.value.slice(0, 2000) || null)} helperText={`${profile.description?.length ?? 0}/2000`} />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><TextField fullWidth type="number" label="Взрослых" value={profile.adultsCount} slotProps={{ htmlInput: { min: 1, max: 20 } }} onChange={(event) => set('adultsCount', Number(event.target.value))} /><TextField fullWidth type="number" label="Детей" value={profile.childrenCount} slotProps={{ htmlInput: { min: 0, max: 20 } }} onChange={(event) => set('childrenCount', Number(event.target.value))} /><FormControlLabel sx={{ minWidth: 180 }} control={<Checkbox checked={profile.hasPets} onChange={(event) => set('hasPets', event.target.checked)} />} label="Есть животные" /></Stack>
      <TextField fullWidth label="Интересы" value={interests} onChange={(event) => setInterests(event.target.value)} helperText="Через запятую, максимум 20" />
      <TextField fullWidth label="Предпочтения в путешествиях" value={preferences} onChange={(event) => setPreferences(event.target.value)} helperText="Например: море, горы, большие города" />
      <Stack direction="row" justifyContent="space-between" alignItems="center"><Typography color="text.secondary">Обменов: {profile.completedExchanges} · рейтинг хозяина: {profile.hostRating ?? '—'} · гостя: {profile.guestRating ?? '—'}</Typography><Button variant="contained" disabled={pending || profile.displayName.trim().length < 2} onClick={() => void save()}>Сохранить</Button></Stack>
    </Stack></Paper>
  </Stack>;
}
