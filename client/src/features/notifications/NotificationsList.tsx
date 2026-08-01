'use client';

import { Alert, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { NotificationItem, notificationsApi } from './notifications-api';

export function NotificationsList() {
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { notificationsApi.list().then((result) => setItems(result.items)).catch((reason: Error) => setError(reason.message)); }, []);
  const read = async (item: NotificationItem) => {
    if (!item.readAt) await notificationsApi.read(item.id);
    setItems((current) => current?.map((entry) => entry.id === item.id ? { ...entry, readAt: entry.readAt ?? new Date().toISOString() } : entry) ?? []);
  };
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!items) return <Stack alignItems="center" py={10}><CircularProgress /></Stack>;
  return <Stack spacing={2}><Stack direction="row" justifyContent="space-between"><div><Typography variant="h3" fontWeight={750}>Уведомления</Typography><Typography color="text.secondary" mt={1}>Сообщения и изменения ваших заявок.</Typography></div>{items.some(({ readAt }) => !readAt) && <Button onClick={() => notificationsApi.readAll().then(() => setItems((current) => current?.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })) ?? []))}>Прочитать все</Button>}</Stack>{!items.length && <Paper sx={{ p: 5 }}><Typography color="text.secondary">Новых событий пока нет.</Typography></Paper>}{items.map((item) => <Paper key={item.id} variant={item.readAt ? 'outlined' : 'elevation'} sx={{ p: 2.5, bgcolor: item.readAt ? undefined : 'primary.50' }}><Typography fontWeight={800}>{item.title}</Typography><Typography mt={0.5}>{item.body}</Typography><Stack direction="row" justifyContent="space-between" mt={1}><Typography variant="caption" color="text.secondary">{new Date(item.createdAt).toLocaleString('ru')}</Typography>{item.link && <Button component={Link} href={item.link} size="small" onClick={() => void read(item)}>Открыть</Button>}</Stack></Paper>)}</Stack>;
}
