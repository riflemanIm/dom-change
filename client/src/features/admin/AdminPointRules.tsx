'use client';

import { Alert, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { adminApi, PointRule } from './admin-api';

export function AdminPointRules() {
  const [items, setItems] = useState<PointRule[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    void adminApi.pointRules().then((rules) => {
      setItems(rules);
      setDrafts(Object.fromEntries(rules.map((rule) => [rule.key, String(rule.amount)])));
    }).catch((cause: Error) => setError(cause.message));
  }, []);

  const save = async (key: string) => {
    const amount = Number(drafts[key]);
    if (!Number.isInteger(amount) || amount < 0 || amount > 100000) { setError('Введите целое число от 0 до 100000'); return; }
    setBusy(key); setError(''); setMessage('');
    try {
      const updated = await adminApi.updatePointRule(key, amount);
      setItems((current) => current.map((rule) => rule.key === key ? updated : rule));
      setMessage('Правило сохранено. Новая сумма действует для будущих начислений.');
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(''); }
  };

  return <Stack spacing={3}>
    <Typography variant="h3">Правила ДомБаллов</Typography>
    <Typography color="text.secondary">Здесь редактируются действующие автоматические бонусы. Уже начисленные ДомБаллы не пересчитываются; цены ночей задаются владельцами жилья отдельно.</Typography>
    {error && <Alert severity="error">{error}</Alert>}{message && <Alert severity="success">{message}</Alert>}
    {items.map((rule) => <Paper key={rule.key} variant="outlined" sx={{ p: 2.5 }}><Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} spacing={2}>
      <Typography sx={{ flex: 1 }} fontWeight={700}>{rule.label}</Typography>
      <TextField label="ДомБаллы" type="number" value={drafts[rule.key] ?? ''} onChange={(event) => setDrafts({ ...drafts, [rule.key]: event.target.value })} inputProps={{ min: 0, max: 100000, step: 1 }} sx={{ width: 160 }} />
      <Button variant="contained" disabled={Boolean(busy) || drafts[rule.key] === String(rule.amount)} onClick={() => void save(rule.key)}>Сохранить</Button>
    </Stack></Paper>)}
  </Stack>;
}
