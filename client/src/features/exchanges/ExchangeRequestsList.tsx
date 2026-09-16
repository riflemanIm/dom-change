'use client';

import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Rating, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ExchangeRequest, exchangesApi } from './exchanges-api';
import { ExchangeChatDialog } from './ExchangeChatDialog';
import { ExchangeReviewDialog } from './ExchangeReviewDialog';

const statusLabels: Record<string, string> = {
  PENDING: 'Ожидает ответа хозяина', PREAPPROVED: 'Предварительно одобрена', CONFIRMED: 'Обмен подтверждён',
  REJECTED: 'Отклонена', CANCELLED: 'Отменена',
  COMPLETED: 'Обмен завершён',
};

const requestDateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
});

function formatRequestDate(value: string) {
  return requestDateFormatter.format(new Date(value));
}

export function ExchangeRequestsList() {
  const searchParams = useSearchParams();
  const direction = searchParams.get('direction') === 'outgoing' ? 'outgoing' : 'incoming';
  const [items, setItems] = useState<ExchangeRequest[] | null>(null);
  const [error, setError] = useState('');
  const [pendingId, setPendingId] = useState('');
  const [cancelling, setCancelling] = useState<ExchangeRequest | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [chatRequest, setChatRequest] = useState<ExchangeRequest | null>(null);
  const [reviewRequest, setReviewRequest] = useState<ExchangeRequest | null>(null);

  useEffect(() => {
    setItems(null);
    exchangesApi.list(direction).then(setItems).catch((reason: Error) => setError(reason.message));
  }, [direction]);

  useEffect(() => {
    const chatId = searchParams.get('chat');
    const request = items?.find(({ id }) => id === chatId);
    if (request) setChatRequest(request);
  }, [items, searchParams]);

  const act = async (request: ExchangeRequest, action: 'preapprove' | 'confirm' | 'reject' | 'cancel' | 'complete') => {
    setPendingId(request.id);
    setError('');
    try {
      const updated = await exchangesApi.action(request.id, action);
      setItems((current) => current?.map((item) => item.id === updated.id ? updated : item) ?? []);
    } catch (reason) { setError((reason as Error).message); }
    finally { setPendingId(''); }
  };

  const cancelConfirmed = async () => {
    if (!cancelling || cancellationReason.trim().length < 5) return;
    setPendingId(cancelling.id);
    setError('');
    try {
      const updated = await exchangesApi.cancelConfirmed(cancelling.id, cancellationReason.trim());
      setItems((current) => current?.map((item) => item.id === updated.id ? updated : item) ?? []);
      setCancelling(null);
      setCancellationReason('');
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
        const ownUserId = direction === 'incoming' ? request.host.id : request.requester.id;
        const busy = pendingId === request.id;
        return (
          <Paper key={request.id} sx={{ p: 3 }}>
            <Stack spacing={1.5}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
                <div><Typography component={Link} href={`/homes/${request.targetProperty.slug}`} variant="h6" fontWeight={750} color="text.primary" sx={{ textDecoration: 'none' }}>{request.targetProperty.title}</Typography><Typography color="text.secondary">{request.targetProperty.address?.city} · {formatRequestDate(request.startsOn)} — {formatRequestDate(request.endsOn)} · {request.guests} гост.</Typography></div>
                <Typography color={request.status === 'CONFIRMED' || request.status === 'COMPLETED' ? 'success.main' : request.status === 'REJECTED' || request.status === 'CANCELLED' ? 'text.secondary' : 'primary.main'} fontWeight={750}>{statusLabels[request.status]}</Typography>
              </Stack>
              <Typography>{direction === 'incoming' ? 'Гость' : 'Хозяин'}: {person.profile?.displayName ?? 'Участник сообщества'}</Typography>
              <Typography>{request.type === 'POINTS' ? `${request.totalPoints} ДомБаллов` : `Прямой обмен${request.offeredProperty ? ` — ${request.offeredProperty.title}` : ''}`}</Typography>
              {request.message && <Typography sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>{request.message}</Typography>}
              {request.cancellationReason && <Alert severity="warning">Причина отмены: {request.cancellationReason}</Alert>}
              {request.reviews.map((review) => <Paper key={review.id} variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}><Stack direction="row" justifyContent="space-between"><Typography fontWeight={750}>Отзыв: {review.author.profile?.displayName ?? 'Участник'}</Typography><Rating value={review.rating} readOnly size="small" /></Stack><Typography mt={1}>{review.comment}</Typography><Typography variant="caption" color="text.secondary">Чистота: {review.cleanlinessRating}/5 · Общение: {review.communicationRating}/5</Typography></Paper>)}
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" onClick={() => setChatRequest(request)}>Чат</Button>
                {direction === 'incoming' && request.status === 'PENDING' && <><Button disabled={busy} variant="contained" onClick={() => void act(request, 'preapprove')}>Предварительно одобрить</Button><Button disabled={busy} color="error" onClick={() => void act(request, 'reject')}>Отклонить</Button></>}
                {direction === 'outgoing' && request.status === 'PREAPPROVED' && <Button disabled={busy} variant="contained" color="success" onClick={() => void act(request, 'confirm')}>Подтвердить обмен</Button>}
                {direction === 'outgoing' && (request.status === 'PENDING' || request.status === 'PREAPPROVED') && <Button disabled={busy} color="error" onClick={() => void act(request, 'cancel')}>Отменить</Button>}
                {request.status === 'CONFIRMED' && <Button disabled={busy} color="error" onClick={() => { setCancellationReason(''); setCancelling(request); }}>Отменить поездку</Button>}
                {request.status === 'CONFIRMED' && request.endsOn.slice(0, 10) <= new Date().toISOString().slice(0, 10) && <Button disabled={busy} variant="contained" color="success" onClick={() => void act(request, 'complete')}>Завершить обмен</Button>}
                {request.status === 'COMPLETED' && !request.reviews.some(({ authorId }) => authorId === ownUserId) && <Button variant="contained" onClick={() => setReviewRequest(request)}>Оставить отзыв</Button>}
              </Stack>
            </Stack>
          </Paper>
        );
      })}
      <Dialog open={Boolean(cancelling)} onClose={() => !pendingId && setCancelling(null)} fullWidth maxWidth="sm">
        <DialogTitle>Отменить подтверждённую поездку?</DialogTitle>
        <DialogContent><Alert severity="warning" sx={{ mb: 2 }}>Зарезервированные ДомБаллы будут возвращены гостю. Причина сохранится в заявке.</Alert><TextField autoFocus fullWidth multiline minRows={3} label="Причина отмены" value={cancellationReason} onChange={(event) => setCancellationReason(event.target.value.slice(0, 1000))} /></DialogContent>
        <DialogActions><Button disabled={Boolean(pendingId)} onClick={() => setCancelling(null)}>Назад</Button><Button disabled={Boolean(pendingId) || cancellationReason.trim().length < 5} color="error" variant="contained" onClick={() => void cancelConfirmed()}>Отменить поездку</Button></DialogActions>
      </Dialog>
      {chatRequest && <ExchangeChatDialog requestId={chatRequest.id} ownUserId={direction === 'incoming' ? chatRequest.host.id : chatRequest.requester.id} open onClose={() => setChatRequest(null)} />}
      {reviewRequest && <ExchangeReviewDialog requestId={reviewRequest.id} open onClose={() => setReviewRequest(null)} onCreated={(review) => { setItems((current) => current?.map((item) => item.id === reviewRequest.id ? { ...item, reviews: [...item.reviews, review] } : item) ?? []); }} />}
    </Stack>
  );
}
