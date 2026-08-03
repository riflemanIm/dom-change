'use client';

import AddHomeRounded from '@mui/icons-material/AddHomeRounded';
import EditRounded from '@mui/icons-material/EditRounded';
import { Alert, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { OwnedPropertySummary, propertyApi } from './property-api';

type Item = OwnedPropertySummary;

const statusLabels: Record<string, string> = {
  DRAFT: 'Черновик',
  PENDING_MODERATION: 'На модерации',
  PUBLISHED: 'Опубликовано',
  CHANGES_REQUESTED: 'Нужны исправления',
  REJECTED: 'Отклонено',
  HIDDEN: 'Скрыто',
  ARCHIVED: 'В архиве',
};

export function MyProperties() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    propertyApi.listMine().then(setItems).catch((reason: Error) => setError(reason.message));
  }, []);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!items) return <Stack alignItems="center" py={10}><CircularProgress /></Stack>;

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h3" fontWeight={750}>Моё жильё</Typography>
        <Button component={Link} href="/account/homes/new" variant="contained" startIcon={<AddHomeRounded />}>Добавить</Button>
      </Stack>
      {!items.length ? (
        <Paper sx={{ p: 5, textAlign: 'center' }}>
          <Typography variant="h5">У вас пока нет объявлений</Typography>
          <Typography color="text.secondary" mt={1}>Добавьте жильё и укажите, когда готовы принять гостей.</Typography>
        </Paper>
      ) : items.map((property) => (
        <Paper key={property.id} sx={{ p: 3 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
            <div>
              <Typography variant="h6" fontWeight={750}>{property.title}</Typography>
              <Typography color="text.secondary">Обновлено {new Date(property.updatedAt).toLocaleDateString('ru')}</Typography>
              {property.moderationHistory[0]?.comment && (
                <Alert severity={property.status === 'REJECTED' ? 'error' : 'warning'} sx={{ mt: 2 }}>
                  Комментарий модератора: {property.moderationHistory[0].comment}
                </Alert>
              )}
            </div>
            <Stack alignItems={{ xs: 'flex-start', sm: 'flex-end' }} spacing={1}>
              <Typography color="primary" fontWeight={700}>{statusLabels[property.status] ?? property.status}</Typography>
              <Stack direction="row">
                {property.status === 'PENDING_MODERATION' ? (
                  <Button size="small" startIcon={<EditRounded />} disabled>На модерации</Button>
                ) : (
                  <Button component={Link} href={`/account/homes/${property.id}/edit`} size="small" startIcon={<EditRounded />}>Редактировать</Button>
                )}
                <Button component={Link} href={`/account/homes/${property.id}/photos`} size="small">Фотографии</Button>
                <Button component={Link} href={`/account/homes/${property.id}/availability`} size="small">Календарь</Button>
              </Stack>
            </Stack>
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}
