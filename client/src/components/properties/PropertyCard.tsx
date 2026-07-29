import FavoriteBorderRounded from '@mui/icons-material/FavoriteBorderRounded';
import { Box, Card, CardContent, Chip, IconButton, Rating, Stack, Typography } from '@mui/material';
import Image from 'next/image';

export type PropertySummary = {
  id: string;
  slug: string;
  title: string;
  city: string;
  district: string;
  bedrooms: number;
  maxGuests: number;
  pointsPerNight: number;
  rating: number;
  imageUrl: string;
};

export function PropertyCard({ property }: { property: PropertySummary }) {
  return (
    <Card sx={{ overflow: 'hidden', height: '100%' }}>
      <Box sx={{ position: 'relative', height: 230 }}>
        <Image src={`${property.imageUrl}?auto=format&fit=crop&w=900&q=80`} alt={property.title} fill sizes="(max-width: 900px) 100vw, 33vw" style={{ objectFit: 'cover' }} />
        <IconButton aria-label="Добавить в избранное" sx={{ position: 'absolute', top: 12, right: 12, bgcolor: 'white' }}>
          <FavoriteBorderRounded />
        </IconButton>
      </Box>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" gap={2}>
          <Box>
            <Typography variant="h6" fontWeight={750}>{property.title}</Typography>
            <Typography color="text.secondary">{property.city}, {property.district}</Typography>
          </Box>
          <Chip color="primary" label={`${property.pointsPerNight} баллов`} />
        </Stack>
        <Stack direction="row" alignItems="center" spacing={1} mt={2}>
          <Rating value={property.rating} precision={0.1} size="small" readOnly />
          <Typography variant="body2">{property.rating}</Typography>
          <Typography variant="body2" color="text.secondary">· до {property.maxGuests} гостей</Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
