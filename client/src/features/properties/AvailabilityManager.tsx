'use client';

import 'dayjs/locale/ru';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import EditRounded from '@mui/icons-material/EditRounded';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { PickersDay, PickersDayProps } from '@mui/x-date-pickers/PickersDay';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { AvailabilityInput, AvailabilityPeriod, propertyApi } from './property-api';

const typeLabels: Record<AvailabilityPeriod['type'], string> = {
  UNAVAILABLE: 'Недоступно',
  POINTS: 'За баллы',
  DIRECT: 'Прямой обмен',
  BOTH: 'Баллы или прямой обмен',
  ON_REQUEST: 'По запросу',
};

const createInitialForm = (pointsPerNight = 100, maxGuests = 2): AvailabilityInput => ({
  startsOn: '',
  endsOn: '',
  type: 'BOTH',
  minNights: 2,
  pointsPerNight,
  maxGuests,
  isFlexible: false,
});

type AvailabilityManagerProps = {
  propertyId: string;
  initialPointsPerNight?: number;
  initialMaxGuests?: number;
  onPeriodsChange?: (periods: AvailabilityPeriod[]) => void;
};

export function AvailabilityManager({ propertyId, initialPointsPerNight, initialMaxGuests, onPeriodsChange }: AvailabilityManagerProps) {
  const [periods, setPeriods] = useState<AvailabilityPeriod[] | null>(null);
  const [form, setForm] = useState(() => createInitialForm(initialPointsPerNight, initialMaxGuests));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editingPeriodId, setEditingPeriodId] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  const selectRangeDay = (value: Dayjs | null) => {
    if (!value) return;
    const selected = value.format('YYYY-MM-DD');
    if (!form.startsOn || form.endsOn || selected <= form.startsOn) {
      setForm({ ...form, startsOn: selected, endsOn: '' });
    } else {
      setForm({ ...form, endsOn: selected });
    }
  };

  const RangeDay = (props: PickersDayProps) => {
    const date = props.day as Dayjs;
    const value = date.format('YYYY-MM-DD');
    const selectionStart = value === form.startsOn;
    const selectionEnd = value === form.endsOn;
    const insideSelection = Boolean(form.startsOn && form.endsOn && value > form.startsOn && value < form.endsOn);
    const existing = periods?.find((period) => value >= period.startsOn.slice(0, 10) && value <= period.endsOn.slice(0, 10));
    const existingColor = existing?.type === 'UNAVAILABLE' ? 'error.light' : 'success.light';
    return (
      <PickersDay
        {...props}
        selected={selectionStart || selectionEnd}
        sx={{
          ...(existing && !insideSelection && !selectionStart && !selectionEnd ? { bgcolor: existingColor } : {}),
          ...(insideSelection ? { bgcolor: 'primary.light', borderRadius: 0 } : {}),
          ...((selectionStart || selectionEnd) ? { bgcolor: 'primary.main', color: 'primary.contrastText', '&:hover': { bgcolor: 'primary.dark' } } : {}),
        }}
      />
    );
  };

  const reload = () => propertyApi.availability(propertyId).then((items) => {
    setPeriods(items);
    onPeriodsChange?.(items);
    return items;
  });

  useEffect(() => {
    reload().catch((reason: Error) => setError(reason.message));
  }, [propertyId]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (editingPeriodId) {
        await propertyApi.updateAvailability(propertyId, editingPeriodId, {
          ...form,
          maxNights: form.maxNights ?? null,
          comment: form.comment?.trim() || null,
        });
      } else {
        await propertyApi.createAvailability(propertyId, form);
      }
      setForm(createInitialForm(initialPointsPerNight, initialMaxGuests));
      setEditingPeriodId(null);
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
      if (editingPeriodId === periodId) {
        setEditingPeriodId(null);
        setForm(createInitialForm(initialPointsPerNight, initialMaxGuests));
      }
      await reload();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const edit = (period: AvailabilityPeriod) => {
    setEditingPeriodId(period.id);
    setError('');
    setForm({
      startsOn: period.startsOn.slice(0, 10),
      endsOn: period.endsOn.slice(0, 10),
      type: period.type,
      minNights: period.minNights,
      maxNights: period.maxNights ?? undefined,
      pointsPerNight: period.pointsPerNight,
      maxGuests: period.maxGuests,
      isFlexible: period.isFlexible,
      comment: period.comment ?? undefined,
    });
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const cancelEdit = () => {
    setEditingPeriodId(null);
    setForm(createInitialForm(initialPointsPerNight, initialMaxGuests));
    setError('');
  };

  if (!periods) return <Stack alignItems="center" py={8}><CircularProgress /></Stack>;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ru">
    <Stack spacing={3}>
      {error && <Alert severity="error">{error}</Alert>}
      <Paper ref={formRef} component="form" variant="outlined" onSubmit={submit} sx={{ p: 3, scrollMarginTop: 96 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5">{editingPeriodId ? 'Редактированиие периода' : 'Новый период'}</Typography>
          {editingPeriodId && <Chip color="primary" size="small" label="Режим редактирования" />}
        </Stack>
        <Stack spacing={2}>
          <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} divider={<Box sx={{ width: { sm: '1px' }, height: { xs: '1px', sm: 'auto' }, bgcolor: 'divider' }} />}>
              <Box flex={1} p={2}><Typography variant="caption" color="text.secondary">Начало</Typography><Typography fontWeight={750}>{form.startsOn ? dayjs(form.startsOn).format('D MMMM YYYY') : 'Выберите дату'}</Typography></Box>
              <Box flex={1} p={2}><Typography variant="caption" color="text.secondary">Окончание</Typography><Typography fontWeight={750}>{form.endsOn ? dayjs(form.endsOn).format('D MMMM YYYY') : 'Выберите дату'}</Typography></Box>
            </Stack>
            <Box sx={{ borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'center' }}>
              <DateCalendar
                value={form.endsOn ? dayjs(form.endsOn) : form.startsOn ? dayjs(form.startsOn) : null}
                minDate={dayjs(today)}
                onChange={(value) => selectRangeDay(value as Dayjs | null)}
                slots={{ day: RangeDay }}
                showDaysOutsideCurrentMonth
                sx={{ width: '100%', maxWidth: 420 }}
              />
            </Box>
            <Stack direction="row" spacing={2} px={2} pb={2} alignItems="center" flexWrap="wrap" useFlexGap>
              <Stack direction="row" spacing={0.75} alignItems="center"><Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: 'success.light' }} /><Typography variant="caption">Доступно</Typography></Stack>
              <Stack direction="row" spacing={0.75} alignItems="center"><Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: 'error.light' }} /><Typography variant="caption">Недоступно</Typography></Stack>
              {(form.startsOn || form.endsOn) && <Button size="small" sx={{ ml: 'auto' }} onClick={() => setForm({ ...form, startsOn: '', endsOn: '' })}>Сбросить даты</Button>}
            </Stack>
          </Paper>
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
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button type="submit" variant="contained" disabled={busy || !form.startsOn || !form.endsOn}>{editingPeriodId ? 'Сохранить изменения' : 'Добавить период'}</Button>
            {editingPeriodId && <Button disabled={busy} onClick={cancelEdit}>Отменить редактирование</Button>}
          </Stack>
        </Stack>
      </Paper>

      <Typography variant="h5">Добавленные периоды</Typography>
      {!periods.length && <Alert severity="info">Периодов пока нет.</Alert>}
      {periods.map((period) => (
        <Paper key={period.id} variant="outlined" sx={{ p: 2.5, borderColor: editingPeriodId === period.id ? 'primary.main' : undefined }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2}>
            <div>
              <Typography fontWeight={750}>{period.startsOn.slice(0, 10)} — {period.endsOn.slice(0, 10)}</Typography>
              <Typography color="text.secondary">
                {typeLabels[period.type]} · {period.minNights}{period.maxNights ? `–${period.maxNights}` : '+'} ночей · до {period.maxGuests} гостей
              </Typography>
            </div>
            <Stack direction="row" sx={{ ml: { sm: 'auto' } }}>
              <Button disabled={busy} startIcon={<EditRounded />} onClick={() => edit(period)}>Изменить</Button>
              <Button color="error" disabled={busy} startIcon={<DeleteOutlineRounded />} onClick={() => remove(period.id)}>Удалить</Button>
            </Stack>
          </Stack>
        </Paper>
      ))}
    </Stack>
    </LocalizationProvider>
  );
}
