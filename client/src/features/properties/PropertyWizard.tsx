'use client';

import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormGroup,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Controller, useForm } from 'react-hook-form';
import { Amenity, propertyApi, PropertyDraftInput } from './property-api';

const steps = ['Тип жилья', 'Расположение', 'Характеристики', 'Удобства', 'Правила', 'Описание', 'ДомБаллы', 'Предпросмотр'];

const defaults: PropertyDraftInput = {
  title: '',
  description: '',
  type: 'APARTMENT',
  areaSqm: 50,
  roomsCount: 2,
  bedroomsCount: 1,
  bedsCount: 2,
  maxGuests: 3,
  hasElevator: false,
  allowsChildren: true,
  allowsPets: false,
  acceptsPoints: true,
  acceptsDirect: false,
  pointsPerNight: 100,
  minNights: 2,
  maxNights: 14,
  address: { country: 'Россия', region: '', city: '', district: '', street: '', houseNumber: '' },
  rule: { smokingAllowed: false, eventsAllowed: false, additionalRules: '' },
  amenityIds: [],
};

type PropertyWizardProps = {
  propertyId?: string;
};

export function PropertyWizard({ propertyId }: PropertyWizardProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(Boolean(propertyId));
  const [loadedStatus, setLoadedStatus] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ id: string; status: string } | null>(null);
  const { register, control, watch, handleSubmit, reset, formState: { isDirty, isSubmitting } } = useForm<PropertyDraftInput>({
    defaultValues: defaults,
  });
  const values = watch();

  useEffect(() => {
    propertyApi.amenities().then(setAmenities).catch((reason: Error) => setError(reason.message));
  }, []);

  useEffect(() => {
    if (propertyId) {
      propertyApi.getMine(propertyId)
        .then((property) => {
          setLoadedStatus(property.status);
          reset({
            title: property.title,
            description: property.description,
            type: property.type,
            areaSqm: property.areaSqm ?? defaults.areaSqm,
            roomsCount: property.roomsCount ?? defaults.roomsCount,
            bedroomsCount: property.bedroomsCount,
            bedsCount: property.bedsCount,
            maxGuests: property.maxGuests,
            hasElevator: property.hasElevator,
            allowsChildren: property.allowsChildren,
            allowsPets: property.allowsPets,
            acceptsPoints: property.acceptsPoints,
            acceptsDirect: property.acceptsDirect,
            pointsPerNight: property.pointsPerNight,
            minNights: property.minNights,
            maxNights: property.maxNights ?? defaults.maxNights,
            address: property.address ? {
              country: property.address.country,
              region: property.address.region ?? '',
              city: property.address.city,
              district: property.address.district ?? '',
              street: property.address.street ?? '',
              houseNumber: property.address.houseNumber ?? '',
            } : defaults.address,
            rule: property.rule ? {
              smokingAllowed: property.rule.smokingAllowed,
              eventsAllowed: property.rule.eventsAllowed,
              additionalRules: property.rule.additionalRules ?? '',
            } : defaults.rule,
            amenityIds: property.amenities.map(({ amenityId }) => amenityId),
          });
        })
        .catch((reason: Error) => setError(reason.message))
        .finally(() => setIsLoading(false));
      return;
    }
    const value = localStorage.getItem('propertyWizardDraft');
    if (value) {
      try {
        reset({ ...defaults, ...JSON.parse(value) });
      } catch {
        localStorage.removeItem('propertyWizardDraft');
      }
    }
    setIsLoading(false);
  }, [propertyId, reset]);

  useEffect(() => {
    if (propertyId || isLoading) return;
    const timer = window.setTimeout(() => localStorage.setItem('propertyWizardDraft', JSON.stringify(values)), 400);
    return () => window.clearTimeout(timer);
  }, [isLoading, propertyId, values]);

  useEffect(() => {
    const warnAboutUnsavedChanges = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warnAboutUnsavedChanges);
    return () => window.removeEventListener('beforeunload', warnAboutUnsavedChanges);
  }, [isDirty]);

  const finish = async (input: PropertyDraftInput, submit: boolean) => {
    setError('');
    try {
      const existingId = propertyId ?? saved?.id;
      const property = existingId
        ? await propertyApi.update(existingId, input)
        : await propertyApi.create(input);
      const result = submit ? await propertyApi.submit(property.id) : property;
      setSaved(result);
      setLoadedStatus(result.status);
      reset(input);
      localStorage.removeItem('propertyWizardDraft');
    } catch (reason) {
      setError((reason as Error).message);
    }
  };

  const numberField = (name: keyof PropertyDraftInput, label: string) => (
    <TextField label={label} type="number" {...register(name, { valueAsNumber: true })} />
  );

  if (isLoading) return <Stack alignItems="center" py={10}><CircularProgress /></Stack>;
  if (propertyId && loadedStatus === 'PENDING_MODERATION') {
    return <Alert severity="info">Объявление находится на модерации. Редактирование временно недоступно. <Button component={Link} href="/account/homes">Вернуться к объявлениям</Button></Alert>;
  }

  return (
    <Paper sx={{ p: { xs: 2.5, md: 5 } }}>
      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 5, display: { xs: 'none', md: 'flex' } }}>
        {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
      </Stepper>
      <Typography variant="overline" color="primary">Шаг {activeStep + 1} из {steps.length}</Typography>
      <Typography variant="h4" fontWeight={750} mb={3}>{steps[activeStep]}</Typography>
      {propertyId && loadedStatus === 'PUBLISHED' && (
        <Alert severity="warning" sx={{ mb: 3 }}>После сохранения объявление будет снято с публикации и потребует повторной модерации.</Alert>
      )}
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {saved && <Alert severity="success" sx={{ mb: 3 }}>Объявление сохранено. Статус: {saved.status}. <Button component={Link} href={`/account/homes/${saved.id}/photos`} size="small">Добавить фотографии</Button></Alert>}

      <Box component="form" onSubmit={handleSubmit((input) => finish(input, false))}>
        {activeStep === 0 && (
          <FormControl fullWidth>
            <InputLabel>Тип жилья</InputLabel>
            <Controller name="type" control={control} render={({ field }) => (
              <Select {...field} label="Тип жилья">
                <MenuItem value="APARTMENT">Квартира</MenuItem>
                <MenuItem value="HOUSE">Дом</MenuItem>
                <MenuItem value="STUDIO">Студия</MenuItem>
                <MenuItem value="TOWNHOUSE">Таунхаус</MenuItem>
                <MenuItem value="COTTAGE">Коттедж</MenuItem>
                <MenuItem value="OTHER">Другое</MenuItem>
              </Select>
            )} />
          </FormControl>
        )}

        {activeStep === 1 && (
          <Stack spacing={2}>
            <TextField label="Страна" {...register('address.country', { required: true })} />
            <TextField label="Регион" {...register('address.region')} />
            <TextField label="Город" required {...register('address.city', { required: true })} />
            <TextField label="Район" {...register('address.district')} />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField fullWidth label="Улица — не показывается публично" {...register('address.street')} />
              <TextField label="Дом" {...register('address.houseNumber')} />
            </Stack>
            <Alert severity="info">Точный адрес будет доступен только участникам подтверждённого обмена.</Alert>
          </Stack>
        )}

        {activeStep === 2 && (
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>{numberField('areaSqm', 'Площадь, м²')}{numberField('roomsCount', 'Комнат')}</Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>{numberField('bedroomsCount', 'Спален')}{numberField('bedsCount', 'Спальных мест')}{numberField('maxGuests', 'Максимум гостей')}</Stack>
            <Controller name="hasElevator" control={control} render={({ field }) => <FormControlLabel control={<Checkbox checked={field.value} onChange={field.onChange} />} label="В доме есть лифт" />} />
          </Stack>
        )}

        {activeStep === 3 && (
          <Controller name="amenityIds" control={control} render={({ field }) => (
            <Stack direction="row" gap={1} flexWrap="wrap">
              {amenities.map((amenity) => {
                const selected = field.value.includes(amenity.id);
                return <Chip key={amenity.id} label={amenity.name} color={selected ? 'primary' : 'default'} variant={selected ? 'filled' : 'outlined'} onClick={() => field.onChange(selected ? field.value.filter((id) => id !== amenity.id) : [...field.value, amenity.id])} />;
              })}
            </Stack>
          )} />
        )}

        {activeStep === 4 && (
          <FormGroup>
            {([
              ['allowsChildren', 'Можно с детьми'],
              ['allowsPets', 'Можно с животными'],
              ['rule.smokingAllowed', 'Можно курить'],
              ['rule.eventsAllowed', 'Можно проводить мероприятия'],
            ] as const).map(([name, label]) => (
              <Controller key={name} name={name} control={control} render={({ field }) => <FormControlLabel control={<Checkbox checked={Boolean(field.value)} onChange={field.onChange} />} label={label} />} />
            ))}
            <TextField label="Дополнительные правила" multiline minRows={4} sx={{ mt: 2 }} {...register('rule.additionalRules')} />
          </FormGroup>
        )}

        {activeStep === 5 && (
          <Stack spacing={2}>
            <TextField label="Название объявления" required {...register('title', { required: true })} />
            <TextField label="Расскажите о жилье и районе" required multiline minRows={8} helperText={`${values.description.length}/5000 · для модерации нужно минимум 50 символов`} {...register('description', { required: true })} />
          </Stack>
        )}

        {activeStep === 6 && (
          <Stack spacing={2}>
            <FormGroup row>
              <Controller name="acceptsPoints" control={control} render={({ field }) => <FormControlLabel control={<Checkbox checked={field.value} onChange={field.onChange} />} label="Обмен за ДомБаллы" />} />
              <Controller name="acceptsDirect" control={control} render={({ field }) => <FormControlLabel control={<Checkbox checked={field.value} onChange={field.onChange} />} label="Прямой обмен" />} />
            </FormGroup>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>{numberField('pointsPerNight', 'ДомБаллов за ночь')}{numberField('minNights', 'Минимум ночей')}{numberField('maxNights', 'Максимум ночей')}</Stack>
          </Stack>
        )}

        {activeStep === 7 && (
          <Stack spacing={2}>
            <Typography variant="h4" fontWeight={750}>{values.title || 'Новое жильё'}</Typography>
            <Typography color="text.secondary">{values.address.city || 'Город не указан'} · до {values.maxGuests} гостей · {values.pointsPerNight} ДомБаллов за ночь</Typography>
            <Typography>{values.description || 'Добавьте описание жилья.'}</Typography>
            <Typography fontWeight={700}>Выбрано удобств: {values.amenityIds.length}</Typography>
            <Alert severity="info">Фотографии и календарь доступности добавим на следующем этапе.</Alert>
          </Stack>
        )}

        <Stack direction="row" justifyContent="space-between" mt={5}>
          <Button disabled={activeStep === 0 || isSubmitting} onClick={() => setActiveStep((step) => step - 1)}>Назад</Button>
          <Stack direction="row" spacing={1}>
            {activeStep === steps.length - 1 ? (
              <>
                <Button type="submit" variant="outlined" disabled={isSubmitting}>{propertyId ? 'Сохранить изменения' : 'Сохранить черновик'}</Button>
                <Button variant="contained" disabled={isSubmitting || saved?.status === 'PENDING_MODERATION'} onClick={handleSubmit((input) => finish(input, true))}>Отправить на модерацию</Button>
              </>
            ) : (
              <Button variant="contained" onClick={() => setActiveStep((step) => step + 1)}>Продолжить</Button>
            )}
          </Stack>
        </Stack>
      </Box>
    </Paper>
  );
}
