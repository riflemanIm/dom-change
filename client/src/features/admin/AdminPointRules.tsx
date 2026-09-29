'use client';

import { Alert, Button, Chip, Paper, Stack, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { adminApi, AdminAmenity, PointRule } from './admin-api';

export function AdminPointRules() {
  const [items, setItems] = useState<PointRule[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [amenities, setAmenities] = useState<AdminAmenity[]>([]);
  const [amenityDrafts, setAmenityDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    void Promise.all([adminApi.pointRules(), adminApi.amenities()]).then(([rules, values]) => {
      setItems(rules);
      setDrafts(Object.fromEntries(rules.map((rule) => [rule.key, String(rule.amount)])));
      setAmenities(values);
      setAmenityDrafts(Object.fromEntries(values.map((amenity) => [amenity.id, String(amenity.nightlyPoints)])));
    }).catch((cause: Error) => setError(cause.message));
  }, []);

  const save = async (key: string) => {
    const amount = Number(drafts[key]);
    const min = key === 'recommendedNight' ? 10 : 0;
    const max = key === 'recommendedNight' ? 10000 : 100000;
    if (!Number.isInteger(amount) || amount < min || amount > max) { setError(`Введите целое число от ${min} до ${max}`); return; }
    setBusy(key); setError(''); setMessage('');
    try {
      const updated = await adminApi.updatePointRule(key, amount);
      setItems((current) => current.map((rule) => rule.key === key ? updated : rule));
      setMessage('Правило сохранено. Ранее начисленные ДомБаллы и действующие цены не изменились.');
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(''); }
  };

  const saveAmenity = async (amenity: AdminAmenity) => {
    const nightlyPoints = Number(amenityDrafts[amenity.id]);
    if (!Number.isInteger(nightlyPoints) || nightlyPoints < 0 || nightlyPoints > 100) {
      setError('Для удобства укажите целое число от 0 до 100');
      return;
    }
    setBusy(amenity.id); setError(''); setMessage('');
    try {
      const updated = await adminApi.updateAmenity(amenity.id, { nightlyPoints });
      setAmenities((current) => current.map((item) => item.id === amenity.id ? updated : item));
      setMessage(`Вес удобства «${updated.name}» сохранён.`);
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(''); }
  };

  const categories = [...new Set(amenities.map(({ category }) => category))];
  return <Stack spacing={3}>
    <Typography variant="h3">Правила ДомБаллов</Typography>
    <Typography color="text.secondary">Бонусы регистрации начисляются один раз. Сетка удобств используется только для рекомендации цены жилья за ночь; цена, указанная владельцем, и уже созданные периоды не меняются автоматически.</Typography>
    {error && <Alert severity="error">{error}</Alert>}{message && <Alert severity="success">{message}</Alert>}
    <Typography variant="h5">Общие правила</Typography>
    {items.map((rule) => <Paper key={rule.key} variant="outlined" sx={{ p: 2.5 }}><Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} spacing={2}>
      <Typography sx={{ flex: 1 }} fontWeight={700}>{rule.label}</Typography>
      <TextField label="ДомБаллы" type="number" size="small" value={drafts[rule.key] ?? ''} onChange={(event) => setDrafts({ ...drafts, [rule.key]: event.target.value })} slotProps={{ htmlInput: { min: rule.key === 'recommendedNight' ? 10 : 0, max: rule.key === 'recommendedNight' ? 10000 : 100000, step: 1 } }} sx={{ width: 150 }} />
      <Button variant="contained" disabled={Boolean(busy) || drafts[rule.key] === String(rule.amount)} onClick={() => void save(rule.key)}>Сохранить</Button>
    </Stack></Paper>)}
    <Typography variant="h5" sx={{ pt: 2 }}>Сетка удобств</Typography>
    <Typography color="text.secondary">Рекомендация = базовая цена за ночь + сумма весов выбранных активных удобств. Нулевой вес не влияет на расчёт.</Typography>
    {categories.map((category) => <Paper key={category} variant="outlined" sx={{ p: 2.5 }}><Stack spacing={2}>
      <Typography variant="h6">{category}</Typography>
      {amenities.filter((amenity) => amenity.category === category).map((amenity) => <Stack key={amenity.id} direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} spacing={2}>
        <Typography sx={{ flex: 1 }}>{amenity.name} {!amenity.isActive && <Chip size="small" label="Отключено" />}</Typography>
        <TextField label="Баллов за ночь" type="number" size="small" value={amenityDrafts[amenity.id] ?? ''} onChange={(event) => setAmenityDrafts({ ...amenityDrafts, [amenity.id]: event.target.value })} slotProps={{ htmlInput: { min: 0, max: 100, step: 1 } }} sx={{ width: 160 }} />
        <Button variant="outlined" disabled={Boolean(busy) || amenityDrafts[amenity.id] === String(amenity.nightlyPoints)} onClick={() => void saveAmenity(amenity)}>Сохранить</Button>
      </Stack>)}
    </Stack></Paper>)}
  </Stack>;
}
