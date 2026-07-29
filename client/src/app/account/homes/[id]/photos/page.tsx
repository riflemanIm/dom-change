import { Container, Typography } from '@mui/material';
import { Header } from '@/components/layout/Header';
import { PhotoManager } from '@/features/properties/PhotoManager';

export default async function PropertyPhotosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <Header />
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Typography variant="h2" fontSize={{ xs: 36, md: 52 }} mb={1}>Фотографии жилья</Typography>
        <Typography color="text.secondary" mb={4}>Первое впечатление начинается с хороших и честных фотографий.</Typography>
        <PhotoManager propertyId={id} />
      </Container>
    </>
  );
}
