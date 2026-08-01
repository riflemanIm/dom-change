import { Box, Typography } from '@mui/material';
import { AvailabilityManager } from '@/features/properties/AvailabilityManager';

export default async function PropertyAvailabilityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
      <Box sx={{ maxWidth: 900 }}>
        <Typography variant="h2" fontSize={{ xs: 36, md: 52 }} mb={1}>Календарь доступности</Typography>
        <Typography color="text.secondary" mb={4}>Укажите даты, условия обмена и допустимую длительность проживания.</Typography>
        <AvailabilityManager propertyId={id} />
      </Box>
  );
}
