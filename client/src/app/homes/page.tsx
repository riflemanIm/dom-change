import { Alert, Box, Button, Container, Grid, Stack, Typography } from '@mui/material';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { PropertyCard, PropertySummary } from '@/components/properties/PropertyCard';
import { CatalogFilters, CatalogSearch } from '@/features/catalog/CatalogFilters';
import { CatalogAmenity, getCatalog, getCatalogAmenities, getCatalogLocations } from '@/features/catalog/catalog-api';

export const metadata: Metadata = { title: 'Каталог жилья' };
export const dynamic = 'force-dynamic';

type SearchParams = CatalogSearch & { page?: string };

export default async function HomesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const search = await searchParams;
  const params = new URLSearchParams();
  Object.entries(search).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });

  let result;
  let amenities: CatalogAmenity[] = [];
  let locations: string[] = [];
  try {
    [result, amenities, locations] = await Promise.all([getCatalog(params), getCatalogAmenities(), getCatalogLocations()]);
  } catch (reason) {
    return (
      <><Header /><Box component="main" sx={{ bgcolor: '#f8faf8', minHeight: '70vh' }}><Container maxWidth="xl" sx={{ py: 6 }}><Typography variant="h2">Каталог жилья</Typography><CatalogFilters initial={search} amenities={[]} locations={[]} /><Alert severity="error">{(reason as Error).message}</Alert></Container></Box><Footer /></>
    );
  }

  const properties: PropertySummary[] = result.items.map((property) => ({
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
    imageUrl: (() => {
      const photo = property.photos.find(({ isPrimary }) => isPrimary) ?? property.photos[0];
      return photo?.previewUrl ?? photo?.url;
    })(),
  }));

  const pageLink = (page: number) => {
    const next = new URLSearchParams(params);
    next.set('page', String(page));
    return `/homes?${next}`;
  };

  return (
    <><Header /><Box component="main" sx={{ bgcolor: '#f8faf8', minHeight: '70vh', py: { xs: 4, md: 6 } }}><Container maxWidth="xl">
      <Typography variant="h2" sx={{ fontSize: { xs: 34, md: 48 } }}>{search.city ? `Жильё: ${search.city}` : 'Найдите дом для следующего путешествия'}</Typography>
      <Typography color="text.secondary" mt={1}>Проверенные участники, безопасный обмен и точный адрес после подтверждения поездки.</Typography>
      <CatalogFilters key={params.toString()} initial={search} amenities={amenities} locations={locations} />
      <Typography color="text.secondary" mb={3}>Найдено: {result.total}</Typography>
      {properties.length ? <Grid container spacing={2.5}>{properties.map((property) => <Grid key={property.id} size={{ xs: 12, sm: 6, lg: 4, xl: 3 }}><PropertyCard property={property} /></Grid>)}</Grid> : <Stack alignItems="center" py={12} spacing={2}><Typography variant="h5">Пока ничего не нашли</Typography><Typography color="text.secondary">Попробуйте другой город или уберите часть фильтров.</Typography></Stack>}
      {result.pages > 1 && <Stack direction="row" justifyContent="center" spacing={2} mt={5}><Button component={Link} href={pageLink(result.page - 1)} disabled={result.page <= 1}>Назад</Button><Typography alignSelf="center">{result.page} из {result.pages}</Typography><Button component={Link} href={pageLink(result.page + 1)} disabled={result.page >= result.pages}>Дальше</Button></Stack>}
    </Container></Box><Footer /></>
  );
}
