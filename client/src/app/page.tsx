import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import HandshakeRounded from '@mui/icons-material/HandshakeRounded';
import ShieldRounded from '@mui/icons-material/ShieldRounded';
import StarsRounded from '@mui/icons-material/StarsRounded';
import { Box, Button, Container, Grid, Stack, Typography } from '@mui/material';
import Link from 'next/link';
import { SearchPanel } from '@/components/home/SearchPanel';
import { Header } from '@/components/layout/Header';
import { PropertyCard } from '@/components/properties/PropertyCard';
import { featuredProperties } from '@/data/properties';

const benefits = [
  { icon: <HandshakeRounded />, title: 'Принимайте гостей', text: 'Открывайте свой дом участникам сообщества в удобные даты.' },
  { icon: <StarsRounded />, title: 'Получайте ДомБаллы', text: 'Баллы начисляются за гостеприимство и остаются внутри сервиса.' },
  { icon: <ShieldRounded />, title: 'Путешествуйте спокойно', text: 'Отзывы, подтверждённые контакты и внутренний чат помогают доверять.' },
];

export default function HomePage() {
  return (
    <>
      <Header />
      <Box component="main">
        <Container maxWidth="lg">
          <Box sx={{ py: { xs: 7, md: 12 }, textAlign: 'center' }}>
            <Typography component="h1" variant="h1" sx={{ fontSize: { xs: 44, md: 72 }, maxWidth: 900, mx: 'auto' }}>
              Мир ближе, когда в нём есть свой дом
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 690, mx: 'auto', mt: 3, mb: 5, lineHeight: 1.6 }}>
              Обменивайтесь жильём напрямую или принимайте гостей, получайте ДомБаллы и путешествуйте по России.
            </Typography>
            <SearchPanel />
          </Box>

          <Grid container spacing={3} sx={{ pb: 10 }}>
            {benefits.map((benefit) => (
              <Grid key={benefit.title} size={{ xs: 12, md: 4 }}>
                <Stack spacing={2} sx={{ p: 3 }}>
                  <Box sx={{ color: 'primary.main' }}>{benefit.icon}</Box>
                  <Typography variant="h5" fontWeight={750}>{benefit.title}</Typography>
                  <Typography color="text.secondary">{benefit.text}</Typography>
                </Stack>
              </Grid>
            ))}
          </Grid>

          <Stack direction="row" justifyContent="space-between" alignItems="end" mb={4}>
            <Box>
              <Typography variant="overline" color="primary" fontWeight={800}>Вдохновение для поездки</Typography>
              <Typography variant="h2" sx={{ fontSize: { xs: 34, md: 46 } }}>Дома, где вас уже ждут</Typography>
            </Box>
            <Button component={Link} href="/homes" endIcon={<ArrowForwardRounded />} sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>Весь каталог</Button>
          </Stack>
          <Grid container spacing={3} sx={{ pb: 12 }}>
            {featuredProperties.map((property) => (
              <Grid key={property.id} size={{ xs: 12, md: 4 }}>
                <PropertyCard property={property} />
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
    </>
  );
}
