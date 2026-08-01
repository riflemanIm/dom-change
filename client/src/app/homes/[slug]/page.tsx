import CalendarMonthRounded from '@mui/icons-material/CalendarMonthRounded';
import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded';
import GroupRounded from '@mui/icons-material/GroupRounded';
import HotelRounded from '@mui/icons-material/HotelRounded';
import { Alert, Box, Button, Chip, Container, Divider, Grid, Paper, Stack, Typography } from '@mui/material';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { getProperty } from '@/features/catalog/catalog-api';
import { FavoriteButton } from '@/features/favorites/FavoriteButton';

export const dynamic = 'force-dynamic';

const availabilityLabels: Record<string, string> = {
  POINTS: 'За баллы',
  DIRECT: 'Прямой обмен',
  BOTH: 'Баллы или прямой обмен',
  ON_REQUEST: 'По запросу',
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const property = await getProperty(slug).catch(() => null);
  return { title: property?.title ?? 'Жильё' };
}

export default async function PropertyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const property = await getProperty(slug);
  if (!property) notFound();
  const location = [property.address?.city, property.address?.district].filter(Boolean).join(', ');
  const today = new Date().toISOString().slice(0, 10);
  const availablePeriods = property.availability.filter(
    ({ endsOn, type }) => type !== 'UNAVAILABLE' && endsOn.slice(0, 10) >= today,
  );

  return (
    <><Header /><Container component="main" maxWidth="lg" sx={{ py: 5 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
        <Typography variant="h2" sx={{ fontSize: { xs: 36, md: 52 } }}>{property.title}</Typography>
        <FavoriteButton propertyId={property.id} />
      </Stack>
      <Typography color="text.secondary" mt={1} mb={4}>{location}</Typography>

      {property.photos.length ? (
        <Grid container spacing={1} mb={5}>
          {property.photos.slice(0, 5).map((photo, index) => <Grid key={photo.id} size={{ xs: 12, md: index === 0 ? 8 : 4 }}><Box sx={{ position: 'relative', height: index === 0 ? { xs: 280, md: 500 } : 246, borderRadius: 3, overflow: 'hidden' }}><Image src={photo.url} alt={`${property.title}, фото ${index + 1}`} fill unoptimized sizes="(max-width: 900px) 100vw, 66vw" style={{ objectFit: 'cover' }} /></Box></Grid>)}
        </Grid>
      ) : <Alert severity="info" sx={{ mb: 5 }}>Фотографии пока не добавлены.</Alert>}

      <Grid container spacing={5}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Stack direction="row" spacing={3} mb={3} flexWrap="wrap" useFlexGap>
            <Stack direction="row" spacing={1}><GroupRounded color="primary" /><Typography>До {property.maxGuests} гостей</Typography></Stack>
            <Stack direction="row" spacing={1}><HotelRounded color="primary" /><Typography>{property.bedroomsCount} спален · {property.bedsCount} кроватей</Typography></Stack>
            {property.areaSqm && <Typography>{property.areaSqm} м²</Typography>}
          </Stack>
          <Divider />
          <Typography variant="h4" mt={4} mb={2}>О жилье</Typography>
          <Typography sx={{ whiteSpace: 'pre-line', lineHeight: 1.8 }}>{property.description}</Typography>

          <Typography variant="h4" mt={5} mb={2}>Удобства</Typography>
          <Stack direction="row" gap={1} flexWrap="wrap">
            {property.amenities.map(({ amenity }) => <Chip key={amenity.id} icon={<CheckCircleOutlineRounded />} label={amenity.name} variant="outlined" />)}
            {!property.amenities.length && <Typography color="text.secondary">Не указаны</Typography>}
          </Stack>

          <Typography variant="h4" mt={5} mb={2}>Доступные даты</Typography>
          <Stack spacing={1.5}>
            {availablePeriods.map((period) => <Paper key={period.id} variant="outlined" sx={{ p: 2 }}><Stack direction="row" spacing={2} alignItems="center"><CalendarMonthRounded color="primary" /><Box><Typography fontWeight={700}>{period.startsOn.slice(0, 10)} — {period.endsOn.slice(0, 10)}</Typography><Typography color="text.secondary">{availabilityLabels[period.type] ?? period.type} · от {period.minNights} ночей · до {period.maxGuests} гостей</Typography></Box></Stack></Paper>)}
            {!availablePeriods.length && <Typography color="text.secondary">Свободные даты пока не указаны.</Typography>}
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper variant="outlined" sx={{ p: 3, position: { md: 'sticky' }, top: 24 }}>
            <Typography variant="h5">{property.pointsPerNight} ДомБаллов <Typography component="span" color="text.secondary">за ночь</Typography></Typography>
            <Typography color="text.secondary" mt={1}>От {property.minNights}{property.maxNights ? ` до ${property.maxNights}` : ''} ночей</Typography>
            <Stack direction="row" gap={1} my={2} flexWrap="wrap">
              {property.acceptsPoints && <Chip label="За баллы" color="primary" />}
              {property.acceptsDirect && <Chip label="Прямой обмен" />}
            </Stack>
            <Button component={Link} href="/login" fullWidth size="large" variant="contained">Предложить обмен</Button>
            <Divider sx={{ my: 3 }} />
            <Typography fontWeight={750}>{property.owner.profile?.displayName ?? 'Участник сообщества'}</Typography>
            <Typography color="text.secondary" mt={0.5}>Обменов: {property.owner.profile?.completedExchanges ?? 0} · рейтинг {property.owner.profile?.hostRating ?? 0}</Typography>
            {property.owner.emailVerified && <Typography color="success.main" mt={1}>Email подтверждён</Typography>}
          </Paper>
        </Grid>
      </Grid>
    </Container></>
  );
}
