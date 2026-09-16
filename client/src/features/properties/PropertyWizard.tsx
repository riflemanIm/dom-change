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
  LinearProgress,
  Link as MuiLink,
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
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Controller, useForm } from 'react-hook-form';
import { Amenity, propertyApi, PropertyDraftInput } from './property-api';
import { PhotoManager } from './PhotoManager';
import { AvailabilityManager } from './AvailabilityManager';

const steps = ['Тип жилья', 'Расположение', 'Характеристики', 'Удобства', 'Правила', 'Описание', 'ДомБаллы', 'Фотографии', 'Доступность', 'Проверка'];

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
  initialStep?: number;
};

export function PropertyWizard({ propertyId, initialStep = 0 }: PropertyWizardProps) {
  const [activeStep, setActiveStep] = useState(Math.min(steps.length - 1, Math.max(0, initialStep)));
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(Boolean(propertyId));
  const [loadedStatus, setLoadedStatus] = useState<string | null>(null);
  const [readyPhotoCount, setReadyPhotoCount] = useState(0);
  const [availablePeriodCount, setAvailablePeriodCount] = useState(0);
  const [saved, setSaved] = useState<{ id: string; status: string } | null>(null);
  const [autosaveState, setAutosaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const autosaveTimer = useRef<number | null>(null);
  const autosaveController = useRef<AbortController | null>(null);
  const { register, control, watch, getValues, handleSubmit, reset, formState: { isDirty, isSubmitting } } = useForm<PropertyDraftInput>({
    defaultValues: defaults,
  });
  const values = watch();
  const draftId = propertyId ?? saved?.id;

  useEffect(() => {
    propertyApi.amenities().then(setAmenities).catch((reason: Error) => setError(reason.message));
  }, []);

  useEffect(() => {
    if (propertyId) {
      propertyApi.getMine(propertyId)
        .then((property) => {
          setLoadedStatus(property.status);
          setReadyPhotoCount(property.photos.filter(({ processingStatus }) => processingStatus === 'READY').length);
          setAvailablePeriodCount(property.availability.filter(isSearchablePeriod).length);
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
    if (propertyId || saved?.id || isLoading) return;
    const timer = window.setTimeout(() => localStorage.setItem('propertyWizardDraft', JSON.stringify(values)), 400);
    return () => window.clearTimeout(timer);
  }, [isLoading, propertyId, saved?.id, values]);

  useEffect(() => {
    const warnAboutUnsavedChanges = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warnAboutUnsavedChanges);
    return () => window.removeEventListener('beforeunload', warnAboutUnsavedChanges);
  }, [isDirty]);

  useEffect(() => {
    if (!draftId || !isDirty || isLoading || loadedStatus === 'PENDING_MODERATION') return;
    if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    autosaveTimer.current = window.setTimeout(async () => {
      const snapshot = getValues();
      const controller = new AbortController();
      autosaveController.current?.abort();
      autosaveController.current = controller;
      setError('');
      setAutosaveState('saving');
      try {
        const property = await propertyApi.update(draftId, snapshot, controller.signal);
        if (controller.signal.aborted) return;
        setSaved(property);
        setLoadedStatus(property.status);
        if (JSON.stringify(getValues()) === JSON.stringify(snapshot)) reset(snapshot);
        setAutosaveState('saved');
      } catch (reason) {
        if ((reason as Error).name === 'AbortError') return;
        setAutosaveState('error');
        setError((reason as Error).message);
      }
    }, 1200);
    return () => {
      if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    };
  }, [draftId, getValues, isDirty, isLoading, loadedStatus, reset, values]);

  useEffect(() => () => autosaveController.current?.abort(), []);

  const finish = async (input: PropertyDraftInput, submit: boolean) => {
    setError('');
    try {
      const property = await persist(input);
      const result = submit ? await propertyApi.submit(property.id) : property;
      setSaved(result);
      setLoadedStatus(result.status);
      reset(input);
      localStorage.removeItem('propertyWizardDraft');
    } catch (reason) {
      setError((reason as Error).message);
    }
  };

  const persist = async (input: PropertyDraftInput) => {
    if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    autosaveController.current?.abort();
    setAutosaveState('saving');
    const existingId = propertyId ?? saved?.id;
    try {
      const property = existingId
        ? await propertyApi.update(existingId, input)
        : await propertyApi.create(input);
      setSaved(property);
      setLoadedStatus(property.status);
      setAutosaveState('saved');
      reset(input);
      localStorage.removeItem('propertyWizardDraft');
      return property;
    } catch (reason) {
      setAutosaveState('error');
      throw reason;
    }
  };

  const continueToNextStep = activeStep === 6
    ? handleSubmit(async (input) => {
        setError('');
        try {
          await persist(input);
          setActiveStep(7);
        } catch (reason) {
          setError((reason as Error).message);
        }
      })
    : () => setActiveStep((step) => step + 1);

  const requirements = [
    { label: 'Название не короче 5 символов', ready: values.title.trim().length >= 5 },
    { label: 'Описание не короче 50 символов', ready: values.description.trim().length >= 50 },
    { label: 'Указаны страна и город', ready: Boolean(values.address.country.trim() && values.address.city.trim()) },
    { label: 'Выбран хотя бы один тип обмена', ready: values.acceptsPoints || values.acceptsDirect },
    { label: 'Загружена хотя бы одна фотография', ready: readyPhotoCount > 0 },
    { label: 'Добавлен хотя бы один доступный период', ready: availablePeriodCount > 0 },
  ];
  const completedRequirements = requirements.filter(({ ready }) => ready).length;
  const completion = Math.round((completedRequirements / requirements.length) * 100);
  const numberField = (name: keyof PropertyDraftInput, label: string) => (
    <TextField label={label} type="number" {...register(name, { valueAsNumber: true })} />
  );

  if (isLoading) return <Stack alignItems="center" py={10}><CircularProgress /></Stack>;
  if (loadedStatus === 'PENDING_MODERATION') {
    return <Alert severity="success">Объявление отправлено на модерацию. Редактирование временно недоступно. <Button component={Link} href="/account/homes">Вернуться к объявлениям</Button></Alert>;
  }

  return (
    <Paper sx={{ p: { xs: 2.5, md: 5 } }}>
      <Stepper activeStep={activeStep} sx={{ mb: 5, display: { xs: 'none', md: 'flex' } }}>
        {steps.map((label) => <Step key={label}><StepLabel aria-label={label} /></Step>)}
      </Stepper>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="overline" color="primary">Шаг {activeStep + 1} из {steps.length}</Typography>
        {draftId && autosaveState !== 'idle' && (
          <Chip
            size="small"
            color={autosaveState === 'error' ? 'error' : autosaveState === 'saved' ? 'success' : 'default'}
            icon={autosaveState === 'saving' ? <CircularProgress size={14} color="inherit" /> : undefined}
            label={autosaveState === 'saving' ? 'Сохранение…' : autosaveState === 'saved' ? 'Сохранено' : 'Ошибка сохранения'}
          />
        )}
      </Stack>
      <Typography variant="h4" fontWeight={750} mb={3}>{steps[activeStep]}</Typography>
      {propertyId && loadedStatus === 'PUBLISHED' && (
        <Alert severity="warning" sx={{ mb: 3 }}>После сохранения объявление будет снято с публикации и потребует повторной модерации.</Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error === 'Сначала подтвердите email' ? (
            <MuiLink component={Link} href="/account#email-verification" color="inherit" fontWeight={700}>
              Сначала подтвердите email
            </MuiLink>
          ) : error}
        </Alert>
      )}
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" mb={0.75}><Typography variant="body2" fontWeight={700}>Готовность к публикации</Typography><Typography variant="body2" color="text.secondary">{completion}%</Typography></Stack>
        <LinearProgress variant="determinate" value={completion} sx={{ height: 8, borderRadius: 4 }} />
      </Box>

      <Box>
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
          draftId ? (
            <PhotoManager propertyId={draftId} onPhotosChange={(photos) => setReadyPhotoCount(photos.filter(({ processingStatus }) => processingStatus === 'READY').length)} />
          ) : <Alert severity="warning">Сначала сохраните черновик.</Alert>
        )}

        {activeStep === 8 && (
          draftId ? (
            <Stack spacing={2}>
              <Alert severity="info">Без доступного периода жильё не попадёт в результаты поиска по датам.</Alert>
              <AvailabilityManager
                propertyId={draftId}
                initialPointsPerNight={values.pointsPerNight}
                initialMaxGuests={values.maxGuests}
                onPeriodsChange={(periods) => setAvailablePeriodCount(periods.filter(isSearchablePeriod).length)}
              />
            </Stack>
          ) : <Alert severity="warning">Сначала сохраните черновик.</Alert>
        )}

        {activeStep === 9 && (
          <Stack spacing={2}>
            <Typography variant="h4" fontWeight={750}>{values.title || 'Новое жильё'}</Typography>
            <Typography color="text.secondary">{values.address.city || 'Город не указан'} · до {values.maxGuests} гостей · {values.pointsPerNight} ДомБаллов за ночь</Typography>
            <Typography>{values.description || 'Добавьте описание жилья.'}</Typography>
            <Typography fontWeight={700}>Выбрано удобств: {values.amenityIds.length}</Typography>
            <Paper variant="outlined" sx={{ p: 2.5 }}>
              <Typography fontWeight={750} mb={1.5}>Проверка перед отправкой</Typography>
              <Stack spacing={1}>{requirements.map((requirement) => <Stack key={requirement.label} direction="row" spacing={1} alignItems="center"><Chip size="small" color={requirement.ready ? 'success' : 'default'} label={requirement.ready ? 'Готово' : 'Нужно'} /><Typography variant="body2">{requirement.label}</Typography></Stack>)}</Stack>
            </Paper>
            {completion < 100 && <Alert severity="warning">Заполните отмеченные пункты, чтобы модератор мог опубликовать жильё.</Alert>}
          </Stack>
        )}

        <Stack direction="row" justifyContent="space-between" mt={5}>
          <Button disabled={activeStep === 0 || isSubmitting} onClick={() => setActiveStep((step) => step - 1)}>Назад</Button>
          <Stack direction="row" spacing={1}>
            {activeStep === steps.length - 1 ? (
              <>
                <Button variant="outlined" disabled={isSubmitting} onClick={handleSubmit((input) => finish(input, false))}>{propertyId ? 'Сохранить изменения' : 'Сохранить черновик'}</Button>
                <Button variant="contained" disabled={isSubmitting || completion < 100 || saved?.status === 'PENDING_MODERATION'} onClick={handleSubmit((input) => finish(input, true))}>Отправить на модерацию</Button>
              </>
            ) : (
              <Button variant="contained" disabled={isSubmitting} onClick={continueToNextStep}>{isSubmitting ? 'Сохранение…' : 'Продолжить'}</Button>
            )}
          </Stack>
        </Stack>
      </Box>
    </Paper>
  );
}

function isSearchablePeriod(period: { type: string; endsOn: string }) {
  return period.type !== 'UNAVAILABLE' && period.endsOn.slice(0, 10) >= new Date().toISOString().slice(0, 10);
}
