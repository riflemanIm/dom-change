'use client';

import { Alert, Button, CircularProgress, Paper, Stack, Tab, Tabs, Typography } from '@mui/material';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ExchangeRequest, exchangesApi } from './exchanges-api';

const statusLabels: Record<string, string> = {
  PENDING: 'Ожидает ответа хозяина', PREAPPROVED: 'Предварительно одобрена', CONFIRMED: 'Обмен подтверждён',
  REJECTED: 'Отклонена', CANCELLED: 'Отменена',
};

export function ExchangeRequestsList() {
  const searchParams = useSearchParams();
  const direction = searchParams.get('direction') === 'outgoing' ? 'outgoing' : 'incoming';
  const [items, setItems] = useState<ExchangeRequest[] | null>(null);
  const [error, setError] = useState('');
  const [pendingId, setPendingId] = useState('');

  useEffect(() => {
    setItems(null);
    exchangesApi.list(direction).then(setItems).catch((reason: Error) => setError(reason.message));
  }, [direction]);

  const act = async (request: ExchangeRequest, action: 'preapprove' | 'confirm' | 'reject' | 'cancel') => {
    setPendingId(request.id);
    setError('');
    try {
      const updated = await exchangesApi.action(request.id, action);
      setItems((current) => current?.map((item) => item.id === updated.id ? updated : item) ?? []);
    } catch (reason) { setError((reason as Error).message); }
    finally { setPendingId(''); }
  };

  return (
    <Stack spacing={3}>
      <div><Typography variant="h3" fontWeight={750}>Заявки на обмен</Typography><Typography color="text.secondary" mt={1}>Согласуйте поездку в два шага и подтвердите финальные даты.</Typography></div>
      <Tabs value={direction}>
        <Tab component={Link} href="/account/exchanges" value="incoming" label="Входящие" />
        <Tab component={Link} href="/account/exchanges?direction=outgoing" value="outgoing" label="Исходящие" />
      </Tabs>
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      {!items && <Stack alignItems="center" py={8}><CircularProgress /></Stack>}
      {items?.length === 0 && <Paper sx={{ p: 5, textAlign: 'center' }}><Typography variant="h5">Заявок пока нет</Typography><Button component={Link} href="/homes" variant="contained" sx={{ mt: 2 }}>Найти жильё</Button></Paper>}
      {items?.map((request) => {
        const person = direction === 'incoming' ? request.requester : request.host;
        const busy = pendingId === request.id;
        return (
          <Paper key={request.id} sx={{ p: 3 }}>
            <Stack spacing={1.5}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
                <div><Typography component={Link} href={`/homes/${request.targetProperty.slug}`} variant="h6" fontWeight={750} color="text.primary" sx={{ textDecoration: 'none' }}>{request.targetProperty.title}</Typography><Typography color="text.secondary">{request.targetProperty.address?.city} · {request.startsOn.slice(0, 10)} — {request.endsOn.slice(0, 10)} · {request.guests} гост.</Typography></div>
                <Typography color={request.status === 'CONFIRMED' ? 'success.main' : request.status === 'REJECTED' || request.status === 'CANCELLED' ? 'text.secondary' : 'primary.main'} fontWeight={750}>{statusLabels[request.status]}</Typography>
              </Stack>
              <Typography>{direction === 'incoming' ? 'Гость' : 'Хозяин'}: {person.profile?.displayName ?? 'Участник сообщества'}</Typography>
              <Typography>{request.type === 'POINTS' ? `${request.totalPoints} ДомБаллов` : `Прямой обмен${request.offeredProperty ? ` — ${request.offeredProperty.title}` : ''}`}</Typography>
              {request.message && <Typography sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>{request.message}</Typography>}
              <Stack direction="row" spacing={1}>
                {direction === 'incoming' && request.status === 'PENDING' && <><Button disabled={busy} variant="contained" onClick={() => void act(request, 'preapprove')}>Предварительно одобрить</Button><Button disabled={busy} color="error" onClick={() => void act(request, 'reject')}>Отклонить</Button></>}
                {direction === 'outgoing' && request.status === 'PREAPPROVED' && <Button disabled={busy} variant="contained" color="success" onClick={() => void act(request, 'confirm')}>Подтвердить обмен</Button>}
                {direction === 'outgoing' && (request.status === 'PENDING' || request.status === 'PREAPPROVED') && <Button disabled={busy} color="error" onClick={() => void act(request, 'cancel')}>Отменить</Button>}
              </Stack>
            </Stack>
          </Paper>
        );
      })}
    </Stack>
  );
}
