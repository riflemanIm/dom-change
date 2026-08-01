'use client';

import CheckRounded from '@mui/icons-material/CheckRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import EditNoteRounded from '@mui/icons-material/EditNoteRounded';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { ModerationProperty, moderationApi } from './moderation-api';

type Action = 'APPROVE' | 'REQUEST_CHANGES' | 'REJECT';

export function ModerationQueue() {
  const [items, setItems] = useState<ModerationProperty[] | null>(null);
  const [total, setTotal] = useState(0);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [pendingId, setPendingId] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const result = await moderationApi.list();
      setItems(result.items);
      setTotal(result.total);
    } catch (reason) {
      setError((reason as Error).message);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const decide = async (property: ModerationProperty, action: Action) => {
    const comment = comments[property.id]?.trim();
    if (action !== 'APPROVE' && !comment) {
      setError('Для запроса исправлений или отказа укажите причину.');
      return;
    }
    setPendingId(property.id);
    setError('');
    try {
      await moderationApi.decide(property.id, action, comment);
      setItems((current) => current?.filter(({ id }) => id !== property.id) ?? []);
      setTotal((current) => Math.max(0, current - 1));
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setPendingId('');
    }
  };

  if (!items && !error) return <Stack alignItems="center" py={10}><CircularProgress /></Stack>;

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h3" fontWeight={750}>Модерация объявлений</Typography>
        <Typography color="text.secondary" mt={1}>В очереди: {total}</Typography>
      </Box>
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      {items?.length === 0 && <Alert severity="success">Очередь пуста — все объявления проверены.</Alert>}
      {items?.map((property) => {
        const address = property.address
          ? [property.address.city, property.address.street, property.address.houseNumber].filter(Boolean).join(', ')
          : 'Адрес не указан';
        const busy = pendingId === property.id;
        return (
          <Paper key={property.id} sx={{ p: { xs: 2, md: 3 } }}>
            <Stack spacing={2.5}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5}>
                {property.photos[0]?.url ? (
                  <Box component="img" src={property.photos[0].previewUrl ?? property.photos[0].url ?? ''} alt="" sx={{ width: { xs: '100%', md: 280 }, height: 190, objectFit: 'cover', borderRadius: 2 }} />
                ) : (
                  <Box sx={{ width: { xs: '100%', md: 280 }, height: 190, bgcolor: 'grey.100', borderRadius: 2, display: 'grid', placeItems: 'center' }}>
                    <Typography color="text.secondary">Нет готового фото</Typography>
                  </Box>
                )}
                <Stack spacing={1} flex={1}>
                  <Typography variant="h5" fontWeight={750}>{property.title}</Typography>
                  <Typography color="text.secondary">{address}, {property.address?.country}</Typography>
                  <Typography>{property.description}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {property.areaSqm} м² · {property.bedroomsCount} спален · до {property.maxGuests} гостей · {property.pointsPerNight} баллов/ночь
                  </Typography>
                  <Typography variant="body2">Владелец: {property.owner.profile?.displayName ?? property.owner.email} · email {property.owner.emailVerified ? 'подтверждён' : 'не подтверждён'}</Typography>
                </Stack>
              </Stack>
              <Divider />
              <TextField
                label="Комментарий владельцу"
                multiline
                minRows={2}
                value={comments[property.id] ?? ''}
                onChange={(event) => setComments((current) => ({ ...current, [property.id]: event.target.value }))}
                inputProps={{ maxLength: 2000 }}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button disabled={busy} variant="contained" color="success" startIcon={<CheckRounded />} onClick={() => void decide(property, 'APPROVE')}>Опубликовать</Button>
                <Button disabled={busy} variant="outlined" startIcon={<EditNoteRounded />} onClick={() => void decide(property, 'REQUEST_CHANGES')}>На исправление</Button>
                <Button disabled={busy} variant="outlined" color="error" startIcon={<CloseRounded />} onClick={() => void decide(property, 'REJECT')}>Отклонить</Button>
              </Stack>
            </Stack>
          </Paper>
        );
      })}
    </Stack>
  );
}
