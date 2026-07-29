'use client';

import CalendarMonthRounded from '@mui/icons-material/CalendarMonthRounded';
import LocationOnRounded from '@mui/icons-material/LocationOnRounded';
import PeopleAltRounded from '@mui/icons-material/PeopleAltRounded';
import SearchRounded from '@mui/icons-material/SearchRounded';
import { Button, Paper, Stack, TextField } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function SearchPanel() {
  const router = useRouter();
  const [city, setCity] = useState('');

  return (
    <Paper component="form" onSubmit={(event) => { event.preventDefault(); router.push(`/homes?city=${encodeURIComponent(city)}`); }} sx={{ p: 1.5, borderRadius: 5 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
        <TextField fullWidth label="Куда хотите поехать?" value={city} onChange={(event) => setCity(event.target.value)} slotProps={{ input: { startAdornment: <LocationOnRounded color="primary" sx={{ mr: 1 }} /> } }} />
        <TextField fullWidth label="Даты" placeholder="Выберите даты" slotProps={{ input: { startAdornment: <CalendarMonthRounded color="primary" sx={{ mr: 1 }} /> } }} />
        <TextField fullWidth label="Гости" placeholder="2 взрослых" slotProps={{ input: { startAdornment: <PeopleAltRounded color="primary" sx={{ mr: 1 }} /> } }} />
        <Button type="submit" variant="contained" size="large" startIcon={<SearchRounded />} sx={{ minWidth: 150 }}>Найти</Button>
      </Stack>
    </Paper>
  );
}
