import { Container, Typography } from '@mui/material';
import { Header } from '@/components/layout/Header';
import { PropertyWizard } from '@/features/properties/PropertyWizard';

export default function NewPropertyPage() {
  return (
    <>
      <Header />
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Typography variant="h2" fontSize={{ xs: 36, md: 52 }} mb={1}>Добавьте своё жильё</Typography>
        <Typography color="text.secondary" mb={4}>Черновик сохраняется в браузере, пока вы заполняете форму.</Typography>
        <PropertyWizard />
      </Container>
    </>
  );
}
