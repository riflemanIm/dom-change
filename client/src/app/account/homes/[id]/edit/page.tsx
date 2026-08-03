import { Box, Typography } from '@mui/material';
import { PropertyWizard } from '@/features/properties/PropertyWizard';

export default async function EditPropertyPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ step?: string }> }) {
  const { id } = await params;
  const { step } = await searchParams;
  const initialStep = Number.isInteger(Number(step)) ? Number(step) : 0;
  return (
    <Box sx={{ maxWidth: 900 }}>
      <Typography variant="h2" fontSize={{ xs: 36, md: 52 }} mb={1}>Редактирование жилья</Typography>
      <Typography color="text.secondary" mb={4}>Проверьте данные, сохраните изменения и отправьте объявление на модерацию.</Typography>
      <PropertyWizard propertyId={id} initialStep={initialStep} />
    </Box>
  );
}
