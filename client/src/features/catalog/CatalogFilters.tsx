'use client';

import 'dayjs/locale/ru';
import SearchRounded from '@mui/icons-material/SearchRounded';
import TuneRounded from '@mui/icons-material/TuneRounded';
import { Autocomplete, Box, Button, Checkbox, Chip, CircularProgress, Divider, FormControlLabel, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { CatalogAmenity, getCatalogLocations } from './catalog-api';
import { SaveSearchButton } from '@/features/saved-searches/SaveSearchButton';

export type CatalogSearch = {
  city?: string;
  startsOn?: string;
  endsOn?: string;
  guests?: string;
  exchange?: string;
  minPoints?: string;
  maxPoints?: string;
  propertyType?: string;
  bedrooms?: string;
  allowsChildren?: string;
  allowsPets?: string;
  amenities?: string;
  sort?: string;
};

export function CatalogFilters({ initial, amenities }: { initial: CatalogSearch; amenities: CatalogAmenity[] }) {
  const router = useRouter();
  const [locationOptions, setLocationOptions] = useState<string[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [locationInput, setLocationInput] = useState(initial.city ?? '');
  const [locationError, setLocationError] = useState('');
  const [expanded, setExpanded] = useState(Boolean(initial.minPoints || initial.maxPoints || initial.propertyType || initial.bedrooms || initial.allowsChildren || initial.allowsPets || initial.amenities || initial.sort));
  const [values, setValues] = useState<CatalogSearch>({
    city: initial.city,
    startsOn: initial.startsOn,
    endsOn: initial.endsOn,
    guests: initial.guests,
    exchange: initial.exchange,
    minPoints: initial.minPoints,
    maxPoints: initial.maxPoints,
    propertyType: initial.propertyType,
    bedrooms: initial.bedrooms,
    allowsChildren: initial.allowsChildren,
    allowsPets: initial.allowsPets,
    amenities: initial.amenities,
    sort: initial.sort,
  });
  const selectedAmenities = values.amenities?.split(',').filter(Boolean) ?? [];
  const advancedCount = [values.minPoints, values.maxPoints, values.propertyType, values.bedrooms, values.allowsChildren, values.allowsPets, values.amenities, values.sort].filter(Boolean).length;
  const searchParams = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => { if (value) searchParams.set(key, value); });
  const meaningfulFilters = [...searchParams.keys()].some((key) => key !== 'sort');
  const defaultSearchName = values.city ? `Поездка: ${values.city}` : 'Мой поиск жилья';

  const toggleAmenity = (id: string) => {
    const next = selectedAmenities.includes(id)
      ? selectedAmenities.filter((selected) => selected !== id)
      : [...selectedAmenities, id];
    setValues({ ...values, amenities: next.join(',') || undefined });
  };

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLocationsLoading(true);
      setLocationError('');
      try {
        setLocationOptions(await getCatalogLocations(locationInput, controller.signal));
      } catch (reason) {
        if ((reason as Error).name !== 'AbortError') {
          setLocationOptions([]);
          setLocationError((reason as Error).message);
        }
      } finally {
        if (!controller.signal.aborted) setLocationsLoading(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [locationInput]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    router.push(`/homes?${searchParams}`);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ru">
    <Paper component="form" onSubmit={submit} sx={{ p: { xs: 2, md: 2.5 }, my: 4, border: '1px solid', borderColor: 'divider', boxShadow: '0 12px 36px rgba(31,50,45,.08)' }}>
      <Box
        sx={{
          display: { xs: 'flex', lg: 'grid' },
          flexDirection: { xs: 'column' },
          gap: 1.5,
          gridTemplateColumns: { lg: 'minmax(230px, 1fr) minmax(360px, 1.35fr) 100px 155px 130px' },
          alignItems: { lg: 'start' },
        }}
      >
        <Autocomplete freeSolo options={locationOptions} loading={locationsLoading} loadingText="Ищем места…" noOptionsText="Ничего не найдено" inputValue={locationInput} onChange={(_, value) => { const next = value ?? ''; setLocationInput(next); setValues({ ...values, city: next || undefined }); }} onInputChange={(_, value, reason) => { if (reason === 'input' || reason === 'clear') { setLocationInput(value); setValues({ ...values, city: value || undefined }); } }} renderInput={(params) => <TextField {...params} fullWidth label="Куда" placeholder="Город, страна или регион" error={Boolean(locationError)} helperText={locationError || undefined} InputProps={{ ...params.InputProps, endAdornment: <>{locationsLoading && <CircularProgress color="inherit" size={18} />}{params.InputProps.endAdornment}</> }} />} sx={{ flex: 1.5, minWidth: { md: 260 } }} />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ minWidth: 0 }}>
          <DatePicker label="Заезд" value={values.startsOn ? dayjs(values.startsOn) : null} minDate={dayjs().startOf('day')} onChange={(value) => setValues({ ...values, startsOn: value?.isValid() ? value.format('YYYY-MM-DD') : undefined, endsOn: value && values.endsOn && !dayjs(values.endsOn).isAfter(value, 'day') ? undefined : values.endsOn })} slotProps={{ textField: { fullWidth: true } }} />
          <DatePicker label="Выезд" value={values.endsOn ? dayjs(values.endsOn) : null} minDate={values.startsOn ? dayjs(values.startsOn).add(1, 'day') : dayjs().add(1, 'day').startOf('day')} onChange={(value) => setValues({ ...values, endsOn: value?.isValid() ? value.format('YYYY-MM-DD') : undefined })} slotProps={{ textField: { fullWidth: true } }} />
        </Stack>
        <TextField select label="Гости" value={values.guests ?? ''} onChange={(event) => setValues({ ...values, guests: event.target.value })} sx={{ minWidth: 115 }}><MenuItem value="">Любое</MenuItem>{Array.from({ length: 10 }, (_, index) => index + 1).map((count) => <MenuItem key={count} value={String(count)}>{count}</MenuItem>)}</TextField>
        <TextField select label="Обмен" value={values.exchange ?? ''} onChange={(event) => setValues({ ...values, exchange: event.target.value })} sx={{ minWidth: 190 }}>
          <MenuItem value="">Любой</MenuItem>
          <MenuItem value="POINTS">За баллы</MenuItem>
          <MenuItem value="DIRECT">Прямой</MenuItem>
        </TextField>
        <Button type="submit" variant="contained" startIcon={<SearchRounded />} sx={{ minWidth: 130, height: 56 }}>Найти</Button>
      </Box>
      <Stack direction="row" mt={1.5} spacing={1}>
        <Button size="small" startIcon={<TuneRounded />} onClick={() => setExpanded((value) => !value)}>Все фильтры {advancedCount > 0 && <Chip size="small" label={advancedCount} sx={{ ml: 1 }} />}</Button>
        <Button size="small" color="inherit" onClick={() => { setLocationInput(''); setValues({}); router.push('/homes'); }}>Сбросить</Button>
        <SaveSearchButton query={searchParams.toString()} defaultName={defaultSearchName} disabled={!meaningfulFilters} />
      </Stack>
      {expanded && <Box mt={2.5} pt={2.5} borderTop="1px solid" borderColor="divider">
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
          <TextField fullWidth select label="Тип жилья" value={values.propertyType ?? ''} onChange={(event) => setValues({ ...values, propertyType: event.target.value })}>
            <MenuItem value="">Любой</MenuItem><MenuItem value="APARTMENT">Квартира</MenuItem><MenuItem value="HOUSE">Дом</MenuItem><MenuItem value="STUDIO">Студия</MenuItem><MenuItem value="TOWNHOUSE">Таунхаус</MenuItem><MenuItem value="COTTAGE">Коттедж</MenuItem><MenuItem value="OTHER">Другое</MenuItem>
          </TextField>
          <TextField fullWidth type="number" label="Спален от" value={values.bedrooms ?? ''} slotProps={{ htmlInput: { min: 0, max: 20 } }} onChange={(event) => setValues({ ...values, bedrooms: event.target.value })} />
          <TextField fullWidth type="number" label="Баллов от" value={values.minPoints ?? ''} slotProps={{ htmlInput: { min: 0 } }} onChange={(event) => setValues({ ...values, minPoints: event.target.value })} />
          <TextField fullWidth type="number" label="Баллов до" value={values.maxPoints ?? ''} slotProps={{ htmlInput: { min: 0 } }} onChange={(event) => setValues({ ...values, maxPoints: event.target.value })} />
          <TextField fullWidth select label="Сортировка" value={values.sort ?? 'NEWEST'} onChange={(event) => setValues({ ...values, sort: event.target.value })}>
            <MenuItem value="NEWEST">Сначала новые</MenuItem><MenuItem value="PRICE_ASC">Сначала дешевле</MenuItem><MenuItem value="PRICE_DESC">Сначала дороже</MenuItem>
          </TextField>
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} mt={1.5}>
          <FormControlLabel control={<Checkbox checked={values.allowsChildren === 'true'} onChange={(event) => setValues({ ...values, allowsChildren: event.target.checked ? 'true' : undefined })} />} label="Можно с детьми" />
          <FormControlLabel control={<Checkbox checked={values.allowsPets === 'true'} onChange={(event) => setValues({ ...values, allowsPets: event.target.checked ? 'true' : undefined })} />} label="Можно с животными" />
        </Stack>
        <Divider sx={{ my: 2 }} />
        <Typography fontWeight={750} mb={1.5}>Удобства</Typography>
        <Stack direction="row" gap={1} flexWrap="wrap">{amenities.map((amenity) => <Chip key={amenity.id} label={amenity.name} clickable color={selectedAmenities.includes(amenity.id) ? 'primary' : 'default'} variant={selectedAmenities.includes(amenity.id) ? 'filled' : 'outlined'} onClick={() => toggleAmenity(amenity.id)} />)}</Stack>
      </Box>}
    </Paper>
    </LocalizationProvider>
  );
}
