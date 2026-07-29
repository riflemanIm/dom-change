import TuneRounded from '@mui/icons-material/TuneRounded';
import { Button, Chip, Container, Grid, Stack, Typography } from '@mui/material';
import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { PropertyCard } from '@/components/properties/PropertyCard';
import { featuredProperties } from '@/data/properties';

export const metadata: Metadata = { title: 'Каталог жилья' };

export default async function HomesPage({ searchParams }: { searchParams: Promise<{ city?: string }> }) {
  const { city } = await searchParams;
  const properties = city
    ? featuredProperties.filter((property) => property.city.toLocaleLowerCase('ru').includes(city.toLocaleLowerCase('ru')))
    : featuredProperties;

  return (
    <>
      <Header />
      <Container component="main" maxWidth="lg" sx={{ py: 6 }}>
        <Typography variant="h2" sx={{ fontSize: { xs: 36, md: 52 } }}>
          {city ? `Жильё: ${city}` : 'Найдите следующий дом'}
        </Typography>
        <Typography color="text.secondary" mt={1}>Точный адрес откроется только после подтверждения обмена.</Typography>
        <Stack direction="row" spacing={1} my={4} flexWrap="wrap" useFlexGap>
          <Button variant="outlined" startIcon={<TuneRounded />}>Все фильтры</Button>
          <Chip label="Даты" variant="outlined" />
          <Chip label="Гости" variant="outlined" />
          <Chip label="Тип обмена" variant="outlined" />
          <Chip label="Удобства" variant="outlined" />
        </Stack>
        {properties.length ? (
          <Grid container spacing={3}>
            {properties.map((property) => (
              <Grid key={property.id} size={{ xs: 12, sm: 6, lg: 4 }}>
                <PropertyCard property={property} />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Stack alignItems="center" py={12} spacing={2}>
            <Typography variant="h5">Пока ничего не нашли</Typography>
            <Typography color="text.secondary">Попробуйте другой город или уберите часть фильтров.</Typography>
          </Stack>
        )}
      </Container>
    </>
  );
}
