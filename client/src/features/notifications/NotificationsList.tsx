'use client';

import { Alert, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { NotificationItem, notificationsApi } from './notifications-api';
import { connectRealtime } from '@/features/realtime/realtime-client';

export function NotificationsList() {
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const refresh = () => notificationsApi.list().then((result) => { if (active) setItems(result.items); }).catch((reason: Error) => { if (active) setError(reason.message); });
    const add = (notification: NotificationItem) => setItems((current) => current?.some(({ id }) => id === notification.id) ? current : [notification, ...(current ?? [])]);
    const markRead = ({ id }: { id: string }) => setItems((current) => current?.map((item) => item.id === id ? { ...item, readAt: item.readAt ?? new Date().toISOString() } : item) ?? []);
    const markAllRead = ({ readAt }: { readAt: string }) => setItems((current) => current?.map((item) => ({ ...item, readAt: item.readAt ?? readAt })) ?? []);
    void refresh();
    let cleanup: () => void = () => undefined;
    connectRealtime().then((socket) => {
      if (!active) return;
      socket.on('notification:new', add);
      socket.on('notification:read', markRead);
      socket.on('notifications:read-all', markAllRead);
      socket.on('notifications:refresh', refresh);
      socket.on('connect', refresh);
      cleanup = () => {
        socket.off('notification:new', add);
        socket.off('notification:read', markRead);
        socket.off('notifications:read-all', markAllRead);
        socket.off('notifications:refresh', refresh);
        socket.off('connect', refresh);
      };
    }).catch((reason: Error) => { if (active) setError(reason.message); });
    return () => { active = false; cleanup(); };
  }, []);
  const read = async (item: NotificationItem) => {
    if (!item.readAt) await notificationsApi.read(item.id);
    setItems((current) => current?.map((entry) => entry.id === item.id ? { ...entry, readAt: entry.readAt ?? new Date().toISOString() } : entry) ?? []);
  };
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!items) return <Stack alignItems="center" py={10}><CircularProgress /></Stack>;
  return <Stack spacing={2}><Stack direction="row" justifyContent="space-between"><div><Typography variant="h3" fontWeight={750}>Уведомления</Typography><Typography color="text.secondary" mt={1}>Сообщения и изменения ваших заявок.</Typography></div>{items.some(({ readAt }) => !readAt) && <Button onClick={() => notificationsApi.readAll().then(() => setItems((current) => current?.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })) ?? []))}>Прочитать все</Button>}</Stack>{!items.length && <Paper sx={{ p: 5 }}><Typography color="text.secondary">Новых событий пока нет.</Typography></Paper>}{items.map((item) => <Paper key={item.id} variant={item.readAt ? 'outlined' : 'elevation'} sx={{ p: 2.5, bgcolor: item.readAt ? undefined : 'primary.50' }}><Typography fontWeight={800}>{item.title}</Typography><Typography mt={0.5}>{item.body}</Typography><Stack direction="row" justifyContent="space-between" mt={1}><Typography variant="caption" color="text.secondary">{new Date(item.createdAt).toLocaleString('ru')}</Typography>{item.link && <Button component={Link} href={item.link} size="small" onClick={() => void read(item)}>Открыть</Button>}</Stack></Paper>)}</Stack>;
}
