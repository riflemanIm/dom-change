'use client';

import FavoriteBorderRounded from '@mui/icons-material/FavoriteBorderRounded';
import { Alert, Button, CircularProgress, Grid, Stack, Typography } from '@mui/material';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PropertyCard, PropertySummary } from '@/components/properties/PropertyCard';
import type { CatalogProperty } from '@/features/catalog/catalog-api';
import { favoritesApi } from './favorites-api';

function toSummary(property: CatalogProperty): PropertySummary {
  const photo = property.photos.find(({ isPrimary }) => isPrimary) ?? property.photos[0];
  return {
    id: property.id,
    slug: property.slug,
    title: property.title,
    city: property.address?.city ?? 'Город не указан',
    district: property.address?.district ?? '',
    bedrooms: property.bedroomsCount,
    maxGuests: property.maxGuests,
    pointsPerNight: property.pointsPerNight,
    rating: property.owner?.profile?.hostRating == null ? undefined : Number(property.owner.profile.hostRating),
    ownerName: property.owner?.profile?.displayName,
    ownerAvatarUrl: property.owner?.profile?.avatarUrl ?? undefined,
    imageUrl: photo?.previewUrl ?? photo?.url,
  };
}

export function FavoritesList() {
  const [items, setItems] = useState<CatalogProperty[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    favoritesApi.list().then(setItems).catch((reason: Error) => setError(reason.message));
  }, []);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!items) return <Stack alignItems="center" py={10}><CircularProgress /></Stack>;

  return (
    <Stack spacing={3}>
      <div>
        <Typography variant="h3" fontWeight={750}>Избранное</Typography>
        <Typography color="text.secondary" mt={1}>Сохранённые варианты для будущих поездок.</Typography>
      </div>
      {!items.length ? (
        <Stack alignItems="center" py={10} spacing={2}>
          <FavoriteBorderRounded color="disabled" sx={{ fontSize: 52 }} />
          <Typography variant="h5">Здесь пока пусто</Typography>
          <Button component={Link} href="/homes" variant="contained">Перейти в каталог</Button>
        </Stack>
      ) : (
        <Grid container spacing={2.5}>
          {items.map((property) => (
            <Grid key={property.id} size={{ xs: 12, sm: 6, lg: 4 }}>
              <PropertyCard
                property={toSummary(property)}
                onFavoriteChange={(favorite) => { if (!favorite) setItems((current) => current?.filter(({ id }) => id !== property.id) ?? []); }}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Stack>
  );
}
