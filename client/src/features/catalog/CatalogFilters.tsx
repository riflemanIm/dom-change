'use client';

import SearchRounded from '@mui/icons-material/SearchRounded';
import TuneRounded from '@mui/icons-material/TuneRounded';
import { Button, MenuItem, Paper, Stack, TextField } from '@mui/material';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

export type CatalogSearch = {
  city?: string;
  startsOn?: string;
  endsOn?: string;
  guests?: string;
  exchange?: string;
  minPoints?: string;
  maxPoints?: string;
};

export function CatalogFilters({ initial }: { initial: CatalogSearch }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(Boolean(initial.minPoints || initial.maxPoints));
  const [values, setValues] = useState<CatalogSearch>({
    city: initial.city,
    startsOn: initial.startsOn,
    endsOn: initial.endsOn,
    guests: initial.guests,
    exchange: initial.exchange,
    minPoints: initial.minPoints,
    maxPoints: initial.maxPoints,
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams();
    Object.entries(values).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    router.push(`/homes?${params}`);
  };

  return (
    <Paper component="form" onSubmit={submit} sx={{ p: { xs: 2, md: 2.5 }, my: 4, border: '1px solid', borderColor: 'divider', boxShadow: '0 12px 36px rgba(31,50,45,.08)' }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
        <TextField fullWidth label="Куда" placeholder="Город или регион" value={values.city ?? ''} onChange={(event) => setValues({ ...values, city: event.target.value })} />
        <TextField type="date" label="Заезд" value={values.startsOn ?? ''} slotProps={{ inputLabel: { shrink: true } }} onChange={(event) => setValues({ ...values, startsOn: event.target.value })} />
        <TextField type="date" label="Выезд" value={values.endsOn ?? ''} slotProps={{ inputLabel: { shrink: true } }} onChange={(event) => setValues({ ...values, endsOn: event.target.value })} />
        <TextField type="number" label="Гости" value={values.guests ?? ''} slotProps={{ htmlInput: { min: 1, max: 50 } }} onChange={(event) => setValues({ ...values, guests: event.target.value })} sx={{ minWidth: 110 }} />
        <TextField select label="Обмен" value={values.exchange ?? ''} onChange={(event) => setValues({ ...values, exchange: event.target.value })} sx={{ minWidth: 190 }}>
          <MenuItem value="">Любой</MenuItem>
          <MenuItem value="POINTS">За баллы</MenuItem>
          <MenuItem value="DIRECT">Прямой</MenuItem>
        </TextField>
        <Button type="submit" variant="contained" startIcon={<SearchRounded />} sx={{ minWidth: 125 }}>Найти</Button>
      </Stack>
      <Stack direction="row" mt={1.5} spacing={1}>
        <Button size="small" startIcon={<TuneRounded />} onClick={() => setExpanded((value) => !value)}>{expanded ? 'Скрыть фильтры' : 'Все фильтры'}</Button>
        <Button size="small" color="inherit" onClick={() => router.push('/homes')}>Сбросить</Button>
      </Stack>
      {expanded && <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mt={1.5} maxWidth={500}>
        <TextField fullWidth type="number" label="Баллов от" value={values.minPoints ?? ''} slotProps={{ htmlInput: { min: 0 } }} onChange={(event) => setValues({ ...values, minPoints: event.target.value })} />
        <TextField fullWidth type="number" label="Баллов до" value={values.maxPoints ?? ''} slotProps={{ htmlInput: { min: 0 } }} onChange={(event) => setValues({ ...values, maxPoints: event.target.value })} />
      </Stack>}
    </Paper>
  );
}
