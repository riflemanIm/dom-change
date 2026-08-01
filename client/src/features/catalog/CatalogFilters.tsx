'use client';

import SearchRounded from '@mui/icons-material/SearchRounded';
import { Button, MenuItem, Paper, Stack, TextField } from '@mui/material';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

export type CatalogSearch = {
  city?: string;
  startsOn?: string;
  endsOn?: string;
  guests?: string;
  exchange?: string;
};

export function CatalogFilters({ initial }: { initial: CatalogSearch }) {
  const router = useRouter();
  const [values, setValues] = useState<CatalogSearch>({
    city: initial.city,
    startsOn: initial.startsOn,
    endsOn: initial.endsOn,
    guests: initial.guests,
    exchange: initial.exchange,
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
    <Paper component="form" variant="outlined" onSubmit={submit} sx={{ p: 2.5, my: 4 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <TextField label="Город" value={values.city ?? ''} onChange={(event) => setValues({ ...values, city: event.target.value })} />
        <TextField type="date" label="Заезд" value={values.startsOn ?? ''} slotProps={{ inputLabel: { shrink: true } }} onChange={(event) => setValues({ ...values, startsOn: event.target.value })} />
        <TextField type="date" label="Выезд" value={values.endsOn ?? ''} slotProps={{ inputLabel: { shrink: true } }} onChange={(event) => setValues({ ...values, endsOn: event.target.value })} />
        <TextField type="number" label="Гости" value={values.guests ?? ''} slotProps={{ htmlInput: { min: 1, max: 50 } }} onChange={(event) => setValues({ ...values, guests: event.target.value })} sx={{ minWidth: 110 }} />
        <TextField select label="Обмен" value={values.exchange ?? ''} onChange={(event) => setValues({ ...values, exchange: event.target.value })} sx={{ minWidth: 190 }}>
          <MenuItem value="">Любой</MenuItem>
          <MenuItem value="POINTS">За баллы</MenuItem>
          <MenuItem value="DIRECT">Прямой</MenuItem>
        </TextField>
        <Button type="submit" variant="contained" startIcon={<SearchRounded />}>Найти</Button>
      </Stack>
    </Paper>
  );
}
