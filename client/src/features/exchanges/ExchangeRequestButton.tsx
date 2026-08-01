'use client';

import 'dayjs/locale/ru';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { propertyApi, OwnedPropertySummary } from '@/features/properties/property-api';
import { ExchangeApiError, exchangesApi } from './exchanges-api';

export function ExchangeRequestButton({ propertyId, acceptsPoints, acceptsDirect, maxGuests, pointsPerNight }: { propertyId: string; acceptsPoints: boolean; acceptsDirect: boolean; maxGuests: number; pointsPerNight: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<'POINTS' | 'DIRECT'>(acceptsPoints ? 'POINTS' : 'DIRECT');
  const [startsOn, setStartsOn] = useState<Dayjs | null>(null);
  const [endsOn, setEndsOn] = useState<Dayjs | null>(null);
  const [guests, setGuests] = useState(1);
  const [message, setMessage] = useState('');
  const [offeredPropertyId, setOfferedPropertyId] = useState('');
  const [myHomes, setMyHomes] = useState<OwnedPropertySummary[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const show = async () => {
    const hadToken = Boolean(sessionStorage.getItem('accessToken'));
    try {
      const homes = await propertyApi.listMine();
      setMyHomes(homes.filter(({ status }) => status === 'PUBLISHED'));
      setOpen(true);
    } catch {
      if (!hadToken) router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      else setError('Не удалось загрузить ваши объявления');
    }
  };

  const nights = startsOn && endsOn ? endsOn.diff(startsOn, 'day') : 0;
  const submit = async () => {
    if (!startsOn || !endsOn || nights < 1) return;
    setPending(true);
    setError('');
    try {
      await exchangesApi.create({
        targetPropertyId: propertyId,
        type,
        offeredPropertyId: type === 'DIRECT' ? offeredPropertyId : undefined,
        startsOn: startsOn.format('YYYY-MM-DD'),
        endsOn: endsOn.format('YYYY-MM-DD'),
        guests,
        message: message.trim() || undefined,
      });
      setOpen(false);
      router.push('/account/exchanges?direction=outgoing');
    } catch (reason) {
      if (reason instanceof ExchangeApiError && reason.status === 401) router.push('/login');
      else setError((reason as Error).message);
    } finally { setPending(false); }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ru">
      <Button fullWidth size="large" variant="contained" onClick={() => void show()}>Предложить обмен</Button>
      <Dialog open={open} onClose={() => !pending && setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Предложить обмен</DialogTitle>
        <DialogContent>
          <Stack spacing={2} pt={1}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField select label="Тип обмена" value={type} onChange={(event) => setType(event.target.value as 'POINTS' | 'DIRECT')}>
              {acceptsPoints && <MenuItem value="POINTS">За ДомБаллы</MenuItem>}
              {acceptsDirect && <MenuItem value="DIRECT">Прямой обмен</MenuItem>}
            </TextField>
            {type === 'DIRECT' && <TextField select required label="Ваше жильё для обмена" value={offeredPropertyId} onChange={(event) => setOfferedPropertyId(event.target.value)}>
              {myHomes.map((home) => <MenuItem key={home.id} value={home.id}>{home.title}</MenuItem>)}
              {!myHomes.length && <MenuItem disabled value="">Нет опубликованного жилья</MenuItem>}
            </TextField>}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <DatePicker label="Заезд" value={startsOn} minDate={dayjs().startOf('day')} onChange={(value) => { setStartsOn(value); if (value && endsOn && !endsOn.isAfter(value, 'day')) setEndsOn(null); }} slotProps={{ textField: { fullWidth: true } }} />
              <DatePicker label="Выезд" value={endsOn} minDate={startsOn?.add(1, 'day') ?? dayjs().add(1, 'day')} onChange={setEndsOn} slotProps={{ textField: { fullWidth: true } }} />
            </Stack>
            <TextField select label="Гости" value={guests} onChange={(event) => setGuests(Number(event.target.value))}>{Array.from({ length: Math.min(10, maxGuests) }, (_, index) => index + 1).map((count) => <MenuItem key={count} value={count}>{count}</MenuItem>)}</TextField>
            <TextField multiline minRows={3} label="Сообщение хозяину" value={message} onChange={(event) => setMessage(event.target.value.slice(0, 2000))} />
            {type === 'POINTS' && nights > 0 && <Typography fontWeight={700}>Итого: {nights * pointsPerNight} ДомБаллов за {nights} ноч.</Typography>}
          </Stack>
        </DialogContent>
        <DialogActions><Button disabled={pending} onClick={() => setOpen(false)}>Отмена</Button><Button variant="contained" disabled={pending || nights < 1 || (type === 'DIRECT' && !offeredPropertyId)} onClick={() => void submit()}>Отправить заявку</Button></DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
}
