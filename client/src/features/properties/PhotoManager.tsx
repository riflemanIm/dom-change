'use client';

import ArrowDownwardRounded from '@mui/icons-material/ArrowDownwardRounded';
import ArrowUpwardRounded from '@mui/icons-material/ArrowUpwardRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import StarRounded from '@mui/icons-material/StarRounded';
import { Alert, Box, Button, CircularProgress, IconButton, Paper, Stack, Typography } from '@mui/material';
import Image from 'next/image';
import { ChangeEvent, useEffect, useState } from 'react';
import { propertyApi, PropertyPhoto } from './property-api';

export function PhotoManager({ propertyId, onPhotosChange }: { propertyId: string; onPhotosChange?: (photos: PropertyPhoto[]) => void }) {
  const [photos, setPhotos] = useState<PropertyPhoto[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const reload = () => propertyApi.photos(propertyId).then((items) => {
    setPhotos(items);
    onPhotosChange?.(items);
    return items;
  });

  useEffect(() => {
    reload().catch((reason: Error) => setError(reason.message));
  }, [propertyId]);

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    setBusy(true);
    setError('');
    try {
      for (const file of files) await propertyApi.uploadPhoto(propertyId, file);
      await reload();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    if (!photos) return;
    const target = index + direction;
    if (target < 0 || target >= photos.length) return;
    const next = [...photos];
    [next[index], next[target]] = [next[target], next[index]];
    setPhotos(next);
    try {
      setPhotos(await propertyApi.reorderPhotos(propertyId, next.map(({ id }) => id)));
    } catch (reason) {
      setError((reason as Error).message);
      await reload();
    }
  };

  const runPhotoAction = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      await action();
      await reload();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!photos) return <Stack alignItems="center" py={8}><CircularProgress /></Stack>;

  return (
    <Stack spacing={3}>
      {error && <Alert severity="error">{error}</Alert>}
      <Paper variant="outlined" sx={{ p: 3, borderStyle: 'dashed', textAlign: 'center' }}>
        <Typography variant="h6">JPEG, PNG или WebP — до 10 МБ</Typography>
        <Typography color="text.secondary" mb={2}>Можно загрузить до 20 фотографий.</Typography>
        <Button component="label" variant="contained" disabled={busy || photos.length >= 20}>
          {busy ? 'Обработка…' : 'Выбрать фотографии'}
          <input hidden multiple type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} />
        </Button>
      </Paper>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
        {photos.map((photo, index) => (
          <Paper key={photo.id} sx={{ overflow: 'hidden' }}>
            <Box sx={{ position: 'relative', height: 230, bgcolor: 'grey.100' }}>
              {photo.previewUrl ? (
                <Image src={photo.previewUrl} alt={`Фото жилья ${index + 1}`} fill unoptimized style={{ objectFit: 'cover' }} />
              ) : (
                <Stack height="100%" alignItems="center" justifyContent="center"><CircularProgress size={28} /></Stack>
              )}
              {photo.isPrimary && <Typography sx={{ position: 'absolute', top: 10, left: 10, bgcolor: 'primary.main', color: 'white', px: 1.5, py: .5, borderRadius: 5 }}>Главное</Typography>}
            </Box>
            <Stack direction="row" alignItems="center" p={1}>
              <IconButton aria-label="Переместить выше" disabled={busy || index === 0} onClick={() => move(index, -1)}><ArrowUpwardRounded /></IconButton>
              <IconButton aria-label="Переместить ниже" disabled={busy || index === photos.length - 1} onClick={() => move(index, 1)}><ArrowDownwardRounded /></IconButton>
              <Box flex={1} />
              <IconButton aria-label="Сделать главным" disabled={busy} color={photo.isPrimary ? 'primary' : 'default'} onClick={() => runPhotoAction(() => propertyApi.setPrimaryPhoto(propertyId, photo.id))}><StarRounded /></IconButton>
              <IconButton aria-label="Удалить" disabled={busy} color="error" onClick={() => runPhotoAction(() => propertyApi.removePhoto(propertyId, photo.id))}><DeleteOutlineRounded /></IconButton>
            </Stack>
          </Paper>
        ))}
      </Box>
      {!photos.length && <Alert severity="info">Загрузите хотя бы одно фото перед публикацией объявления.</Alert>}
    </Stack>
  );
}
