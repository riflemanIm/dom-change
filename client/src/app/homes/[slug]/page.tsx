import CalendarMonthRounded from '@mui/icons-material/CalendarMonthRounded';
import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded';
import GroupRounded from '@mui/icons-material/GroupRounded';
import HotelRounded from '@mui/icons-material/HotelRounded';
import { Alert, Box, Chip, Container, Divider, Grid, Paper, Stack, Typography } from '@mui/material';
import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { getProperty } from '@/features/catalog/catalog-api';
import { FavoriteButton } from '@/features/favorites/FavoriteButton';
import { ExchangeRequestButton } from '@/features/exchanges/ExchangeRequestButton';
import { formatRuDate } from '@/utils/date-format';

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
            {availablePeriods.map((period) => {
              const occupied = period.occupancy !== 'AVAILABLE';
              const fullyBooked = period.occupancy === 'BOOKED';
              return (
                <Paper
                  key={period.id}
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderColor: fullyBooked ? 'error.light' : occupied ? 'warning.light' : 'divider',
                    bgcolor: fullyBooked ? 'rgba(211, 47, 47, .035)' : occupied ? 'rgba(237, 108, 2, .045)' : 'background.paper',
                  }}
                >
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <CalendarMonthRounded color={fullyBooked ? 'error' : occupied ? 'warning' : 'primary'} sx={{ mt: 0.25 }} />
                    <Box flex={1}>
                      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1}>
                        <Typography fontWeight={700}>{formatRuDate(period.startsOn)} — {formatRuDate(period.endsOn)}</Typography>
                        {occupied && <Chip size="small" color={fullyBooked ? 'error' : 'warning'} label={fullyBooked ? 'Период занят' : 'Частично занят'} />}
                      </Stack>
                      <Typography color="text.secondary">{availabilityLabels[period.type] ?? period.type} · от {period.minNights} ночей · до {period.maxGuests} гостей</Typography>
                      {period.bookedRanges.length > 0 && (
                        <Stack spacing={0.25} mt={1}>
                          {period.bookedRanges.map((range) => (
                            <Typography key={`${range.startsOn}-${range.endsOn}`} variant="body2" color={fullyBooked ? 'error.main' : 'warning.dark'}>
                              Подтверждённый обмен: {formatRuDate(range.startsOn)} — {formatRuDate(range.endsOn)}
                            </Typography>
                          ))}
                        </Stack>
                      )}
                    </Box>
                  </Stack>
                </Paper>
              );
            })}
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
            <ExchangeRequestButton propertyId={property.id} acceptsPoints={property.acceptsPoints} acceptsDirect={property.acceptsDirect} maxGuests={property.maxGuests} pointsPerNight={property.pointsPerNight} />
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
