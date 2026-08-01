'use client';

import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Rating, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { ExchangeReview, exchangesApi } from './exchanges-api';

export function ExchangeReviewDialog({ requestId, open, onClose, onCreated }: { requestId: string; open: boolean; onClose: () => void; onCreated: (review: ExchangeReview) => void }) {
  const [rating, setRating] = useState(5);
  const [cleanlinessRating, setCleanlinessRating] = useState(5);
  const [communicationRating, setCommunicationRating] = useState(5);
  const [comment, setComment] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setPending(true);
    setError('');
    try {
      const review = await exchangesApi.createReview(requestId, { rating, cleanlinessRating, communicationRating, comment: comment.trim() });
      onCreated(review);
      onClose();
    } catch (reason) { setError((reason as Error).message); }
    finally { setPending(false); }
  };

  const score = (label: string, value: number, setValue: (value: number) => void) => <Stack direction="row" justifyContent="space-between" alignItems="center"><Typography>{label}</Typography><Rating value={value} onChange={(_, next) => setValue(next ?? 1)} /></Stack>;
  return <Dialog open={open} onClose={() => !pending && onClose()} fullWidth maxWidth="sm"><DialogTitle>Оставить отзыв</DialogTitle><DialogContent><Stack spacing={2} pt={1}>{error && <Alert severity="error">{error}</Alert>}{score('Общее впечатление', rating, setRating)}{score('Чистота', cleanlinessRating, setCleanlinessRating)}{score('Общение', communicationRating, setCommunicationRating)}<TextField required multiline minRows={4} label="Расскажите об обмене" value={comment} onChange={(event) => setComment(event.target.value.slice(0, 2000))} helperText={`${comment.trim().length}/2000, минимум 10 символов`} /></Stack></DialogContent><DialogActions><Button disabled={pending} onClick={onClose}>Отмена</Button><Button disabled={pending || comment.trim().length < 10} variant="contained" onClick={() => void submit()}>Опубликовать</Button></DialogActions></Dialog>;
}
