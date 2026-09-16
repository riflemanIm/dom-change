'use client';

import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import SearchRounded from '@mui/icons-material/SearchRounded';
import { Alert, Button, CircularProgress, IconButton, Paper, Stack, Typography } from '@mui/material';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { SavedSearch, savedSearchesApi } from './saved-searches-api';
import { formatRuDate } from '@/utils/date-format';

const labels: Record<string, string> = {
  city: 'Место', startsOn: 'Заезд', endsOn: 'Выезд', guests: 'Гостей', exchange: 'Обмен',
  minPoints: 'Баллов от', maxPoints: 'Баллов до', propertyType: 'Тип', bedrooms: 'Спален от',
  allowsChildren: 'С детьми', allowsPets: 'С животными', amenities: 'Удобства', sort: 'Сортировка',
};

function describe(query: string) {
  return [...new URLSearchParams(query)]
    .map(([key, value]) => `${labels[key] ?? key}: ${key === 'startsOn' || key === 'endsOn' ? formatRuDate(value) : value}`)
    .join(' · ');
}

export function SavedSearchesList() {
  const [items, setItems] = useState<SavedSearch[] | null>(null);
  const [error, setError] = useState('');
  const [pendingId, setPendingId] = useState('');

  useEffect(() => { savedSearchesApi.list().then(setItems).catch((reason: Error) => setError(reason.message)); }, []);

  const remove = async (id: string) => {
    setPendingId(id);
    setError('');
    try {
      await savedSearchesApi.remove(id);
      setItems((current) => current?.filter((item) => item.id !== id) ?? []);
    } catch (reason) { setError((reason as Error).message); }
    finally { setPendingId(''); }
  };

  if (error && !items) return <Alert severity="error">{error}</Alert>;
  if (!items) return <Stack alignItems="center" py={10}><CircularProgress /></Stack>;

  return (
    <Stack spacing={3}>
      <div><Typography variant="h3" fontWeight={750}>Сохранённые поиски</Typography><Typography color="text.secondary" mt={1}>Быстро возвращайтесь к подходящим параметрам каталога.</Typography></div>
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      {!items.length ? <Paper sx={{ p: 5, textAlign: 'center' }}><Typography variant="h5">Поисков пока нет</Typography><Button component={Link} href="/homes" variant="contained" sx={{ mt: 2 }}>Настроить поиск</Button></Paper> : items.map((item) => (
        <Paper key={item.id} sx={{ p: 3 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
            <div><Typography variant="h6" fontWeight={750}>{item.name}</Typography><Typography color="text.secondary" mt={0.5}>{describe(item.query)}</Typography></div>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Button component={Link} href={`/homes?${item.query}`} variant="outlined" startIcon={<SearchRounded />}>Открыть</Button>
              <IconButton aria-label="Удалить поиск" disabled={pendingId === item.id} onClick={() => void remove(item.id)}><DeleteOutlineRounded /></IconButton>
            </Stack>
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}
