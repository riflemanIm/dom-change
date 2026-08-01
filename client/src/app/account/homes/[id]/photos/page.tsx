import { Box, Typography } from '@mui/material';
import { PhotoManager } from '@/features/properties/PhotoManager';

export default async function PropertyPhotosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
      <Box sx={{ maxWidth: 900 }}>
        <Typography variant="h2" fontSize={{ xs: 36, md: 52 }} mb={1}>Фотографии жилья</Typography>
        <Typography color="text.secondary" mb={4}>Первое впечатление начинается с хороших и честных фотографий.</Typography>
        <PhotoManager propertyId={id} />
      </Box>
  );
}
