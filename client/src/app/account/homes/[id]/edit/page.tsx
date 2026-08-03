import { Box, Typography } from '@mui/material';
import { PropertyWizard } from '@/features/properties/PropertyWizard';

export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Box sx={{ maxWidth: 900 }}>
      <Typography variant="h2" fontSize={{ xs: 36, md: 52 }} mb={1}>Редактирование жилья</Typography>
      <Typography color="text.secondary" mb={4}>Проверьте данные, сохраните изменения и отправьте объявление на модерацию.</Typography>
      <PropertyWizard propertyId={id} />
    </Box>
  );
}
