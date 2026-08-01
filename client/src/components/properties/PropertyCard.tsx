import FavoriteBorderRounded from '@mui/icons-material/FavoriteBorderRounded';
import { Box, Card, CardContent, Chip, IconButton, Rating, Stack, Typography } from '@mui/material';
import Image from 'next/image';
import Link from 'next/link';

export type PropertySummary = {
  id: string;
  slug: string;
  title: string;
  city: string;
  district: string;
  bedrooms: number;
  maxGuests: number;
  pointsPerNight: number;
  rating?: number;
  imageUrl?: string;
};

export function PropertyCard({ property }: { property: PropertySummary }) {
  return (
    <Card sx={{ overflow: 'hidden', height: '100%', position: 'relative' }}>
      <Box sx={{ position: 'relative', height: 230 }}>
        {property.imageUrl ? (
          <Image src={property.imageUrl.includes('images.unsplash.com') ? `${property.imageUrl}?auto=format&fit=crop&w=900&q=80` : property.imageUrl} alt={property.title} fill unoptimized={!property.imageUrl.includes('images.unsplash.com')} sizes="(max-width: 900px) 100vw, 33vw" style={{ objectFit: 'cover' }} />
        ) : <Box sx={{ height: '100%', bgcolor: 'grey.100' }} />}
        <IconButton aria-label="Добавить в избранное" sx={{ position: 'absolute', top: 12, right: 12, bgcolor: 'white' }}>
          <FavoriteBorderRounded />
        </IconButton>
      </Box>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" gap={2}>
          <Box>
            <Typography component={Link} href={`/homes/${property.slug}`} variant="h6" fontWeight={750} color="text.primary" sx={{ textDecoration: 'none', '&::after': { content: '\"\"', position: 'absolute', inset: 0 } }}>{property.title}</Typography>
            <Typography color="text.secondary">{property.city}, {property.district}</Typography>
          </Box>
          <Chip color="primary" label={`${property.pointsPerNight} баллов`} />
        </Stack>
        <Stack direction="row" alignItems="center" spacing={1} mt={2}>
          {property.rating !== undefined && <><Rating value={property.rating} precision={0.1} size="small" readOnly /><Typography variant="body2">{property.rating}</Typography></>}
          <Typography variant="body2" color="text.secondary">· до {property.maxGuests} гостей</Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
