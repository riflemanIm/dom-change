'use client';

import { Alert, Button, FormControlLabel, Paper, Stack, Switch, TextField, Typography } from '@mui/material';
import { FormEvent, useEffect, useState } from 'react';
import { adminApi, AdminAmenity } from './admin-api';

const empty = { code: '', name: '', category: '', sortOrder: 0, isActive: true };

export function AdminAmenities() {
  const [items, setItems] = useState<AdminAmenity[]>([]);
  const [drafts, setDrafts] = useState<Record<string, AdminAmenity>>({});
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => { void adminApi.amenities().then((amenities) => {
    setItems(amenities); setDrafts(Object.fromEntries(amenities.map((item) => [item.id, item])));
  }).catch((cause: Error) => setError(cause.message)); }, []);

  const create = async (event: FormEvent) => {
    event.preventDefault(); setBusy('create'); setError(''); setMessage('');
    try { const item = await adminApi.createAmenity(form); setItems((current) => [...current, item]); setDrafts((current) => ({ ...current, [item.id]: item })); setForm(empty); setMessage('Удобство создано.'); }
    catch (cause) { setError((cause as Error).message); }
    finally { setBusy(''); }
  };

  const save = async (item: AdminAmenity) => {
    const draft = drafts[item.id];
    setBusy(item.id); setError(''); setMessage('');
    try { const updated = await adminApi.updateAmenity(item.id, { name: draft.name, category: draft.category, sortOrder: Number(draft.sortOrder), isActive: draft.isActive }); setItems((current) => current.map((entry) => entry.id === item.id ? updated : entry)); setMessage(`«${updated.name}» сохранено.`); }
    catch (cause) { setError((cause as Error).message); }
    finally { setBusy(''); }
  };

  return <Stack spacing={3}>
    <Typography variant="h3">Удобства</Typography>
    <Typography color="text.secondary">Отключённое удобство исчезает из выбора при редактировании жилья, но остаётся в уже сохранённых объявлениях.</Typography>
    {error && <Alert severity="error">{error}</Alert>}{message && <Alert severity="success">{message}</Alert>}
    <Paper component="form" onSubmit={create} variant="outlined" sx={{ p: 2.5 }}><Stack spacing={2}>
      <Typography variant="h6">Новое удобство</Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
        <TextField required label="Код" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toLowerCase() })} helperText="Латиница, цифры, _" inputProps={{ pattern: '[a-z][a-z0-9_]*', minLength: 2, maxLength: 50 }} />
        <TextField required label="Название" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        <TextField required label="Категория" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} />
        <TextField label="Порядок" type="number" value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: Number(event.target.value) })} inputProps={{ min: 0, max: 10000 }} sx={{ width: 120 }} />
      </Stack><Button type="submit" variant="contained" disabled={Boolean(busy)}>Добавить</Button>
    </Stack></Paper>
    {items.map((item) => { const draft = drafts[item.id] ?? item; return <Paper key={item.id} variant="outlined" sx={{ p: 2.5 }}><Stack spacing={1.5}>
      <Typography variant="caption" color="text.secondary">{item.code}</Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
        <TextField label="Название" value={draft.name} onChange={(event) => setDrafts({ ...drafts, [item.id]: { ...draft, name: event.target.value } })} />
        <TextField label="Категория" value={draft.category} onChange={(event) => setDrafts({ ...drafts, [item.id]: { ...draft, category: event.target.value } })} />
        <TextField label="Порядок" type="number" value={draft.sortOrder} onChange={(event) => setDrafts({ ...drafts, [item.id]: { ...draft, sortOrder: Number(event.target.value) } })} inputProps={{ min: 0, max: 10000 }} sx={{ width: 120 }} />
        <FormControlLabel control={<Switch checked={draft.isActive} onChange={(event) => setDrafts({ ...drafts, [item.id]: { ...draft, isActive: event.target.checked } })} />} label="Активно" />
        <Button variant="outlined" disabled={Boolean(busy) || JSON.stringify(draft) === JSON.stringify(item)} onClick={() => void save(item)}>Сохранить</Button>
      </Stack>
    </Stack></Paper>; })}
  </Stack>;
}
