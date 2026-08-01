import { Alert, Button, Container, Grid, Stack, Typography } from '@mui/material';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { PropertyCard, PropertySummary } from '@/components/properties/PropertyCard';
import { CatalogFilters, CatalogSearch } from '@/features/catalog/CatalogFilters';
import { getCatalog } from '@/features/catalog/catalog-api';

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
  try {
    result = await getCatalog(params);
  } catch (reason) {
    return (
      <><Header /><Container component="main" maxWidth="lg" sx={{ py: 6 }}><Typography variant="h2">Каталог жилья</Typography><CatalogFilters initial={search} /><Alert severity="error">{(reason as Error).message}</Alert></Container></>
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
    imageUrl: (property.photos.find(({ isPrimary }) => isPrimary) ?? property.photos[0])?.previewUrl ?? undefined,
  }));

  const pageLink = (page: number) => {
    const next = new URLSearchParams(params);
    next.set('page', String(page));
    return `/homes?${next}`;
  };

  return (
    <><Header /><Container component="main" maxWidth="lg" sx={{ py: 6 }}>
      <Typography variant="h2" sx={{ fontSize: { xs: 36, md: 52 } }}>{search.city ? `Жильё: ${search.city}` : 'Найдите следующий дом'}</Typography>
      <Typography color="text.secondary" mt={1}>Точный адрес откроется только после подтверждения обмена.</Typography>
      <CatalogFilters initial={search} />
      <Typography color="text.secondary" mb={3}>Найдено: {result.total}</Typography>
      {properties.length ? <Grid container spacing={3}>{properties.map((property) => <Grid key={property.id} size={{ xs: 12, sm: 6, lg: 4 }}><PropertyCard property={property} /></Grid>)}</Grid> : <Stack alignItems="center" py={12} spacing={2}><Typography variant="h5">Пока ничего не нашли</Typography><Typography color="text.secondary">Попробуйте другой город или уберите часть фильтров.</Typography></Stack>}
      {result.pages > 1 && <Stack direction="row" justifyContent="center" spacing={2} mt={5}><Button component={Link} href={pageLink(result.page - 1)} disabled={result.page <= 1}>Назад</Button><Typography alignSelf="center">{result.page} из {result.pages}</Typography><Button component={Link} href={pageLink(result.page + 1)} disabled={result.page >= result.pages}>Дальше</Button></Stack>}
    </Container></>
  );
}
