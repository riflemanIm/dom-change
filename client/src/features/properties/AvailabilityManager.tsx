'use client';

import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import {
  Alert,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { FormEvent, useEffect, useState } from 'react';
import { AvailabilityInput, AvailabilityPeriod, propertyApi } from './property-api';

const typeLabels: Record<AvailabilityPeriod['type'], string> = {
  UNAVAILABLE: 'Недоступно',
  POINTS: 'За баллы',
  DIRECT: 'Прямой обмен',
  BOTH: 'Баллы или прямой обмен',
  ON_REQUEST: 'По запросу',
};

const initialForm: AvailabilityInput = {
  startsOn: '',
  endsOn: '',
  type: 'BOTH',
  minNights: 2,
  pointsPerNight: 1000,
  maxGuests: 2,
  isFlexible: false,
};

export function AvailabilityManager({ propertyId }: { propertyId: string }) {
  const [periods, setPeriods] = useState<AvailabilityPeriod[] | null>(null);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const reload = () => propertyApi.availability(propertyId).then(setPeriods);

  useEffect(() => {
    reload().catch((reason: Error) => setError(reason.message));
  }, [propertyId]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await propertyApi.createAvailability(propertyId, form);
      setForm(initialForm);
      await reload();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (periodId: string) => {
    setBusy(true);
    setError('');
    try {
      await propertyApi.removeAvailability(propertyId, periodId);
      await reload();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!periods) return <Stack alignItems="center" py={8}><CircularProgress /></Stack>;

  return (
    <Stack spacing={3}>
      {error && <Alert severity="error">{error}</Alert>}
      <Paper component="form" variant="outlined" onSubmit={submit} sx={{ p: 3 }}>
        <Typography variant="h5" mb={2}>Новый период</Typography>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField required fullWidth type="date" label="С" value={form.startsOn} slotProps={{ inputLabel: { shrink: true } }} onChange={(event) => setForm({ ...form, startsOn: event.target.value })} />
            <TextField required fullWidth type="date" label="По" value={form.endsOn} slotProps={{ inputLabel: { shrink: true } }} onChange={(event) => setForm({ ...form, endsOn: event.target.value })} />
          </Stack>
          <TextField select label="Тип доступности" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as AvailabilityPeriod['type'] })}>
            {Object.entries(typeLabels).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
          </TextField>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField required fullWidth type="number" label="Минимум ночей" value={form.minNights} slotProps={{ htmlInput: { min: 1, max: 365 } }} onChange={(event) => setForm({ ...form, minNights: Number(event.target.value) })} />
            <TextField fullWidth type="number" label="Максимум ночей" value={form.maxNights ?? ''} slotProps={{ htmlInput: { min: 1, max: 365 } }} onChange={(event) => setForm({ ...form, maxNights: event.target.value ? Number(event.target.value) : undefined })} />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField required fullWidth type="number" label="Баллов за ночь" value={form.pointsPerNight} slotProps={{ htmlInput: { min: 0 } }} onChange={(event) => setForm({ ...form, pointsPerNight: Number(event.target.value) })} />
            <TextField required fullWidth type="number" label="Максимум гостей" value={form.maxGuests} slotProps={{ htmlInput: { min: 1, max: 50 } }} onChange={(event) => setForm({ ...form, maxGuests: Number(event.target.value) })} />
          </Stack>
          <TextField label="Комментарий" value={form.comment ?? ''} onChange={(event) => setForm({ ...form, comment: event.target.value })} />
          <FormControlLabel control={<Checkbox checked={form.isFlexible} onChange={(event) => setForm({ ...form, isFlexible: event.target.checked })} />} label="Даты можно немного сдвинуть" />
          <Button type="submit" variant="contained" disabled={busy}>Добавить период</Button>
        </Stack>
      </Paper>

      <Typography variant="h5">Добавленные периоды</Typography>
      {!periods.length && <Alert severity="info">Периодов пока нет.</Alert>}
      {periods.map((period) => (
        <Paper key={period.id} variant="outlined" sx={{ p: 2.5 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <div>
              <Typography fontWeight={750}>{period.startsOn.slice(0, 10)} — {period.endsOn.slice(0, 10)}</Typography>
              <Typography color="text.secondary">
                {typeLabels[period.type]} · {period.minNights}{period.maxNights ? `–${period.maxNights}` : '+'} ночей · до {period.maxGuests} гостей
              </Typography>
            </div>
            <Button sx={{ ml: 'auto' }} color="error" disabled={busy} startIcon={<DeleteOutlineRounded />} onClick={() => remove(period.id)}>Удалить</Button>
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}
