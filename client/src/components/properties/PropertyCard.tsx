import { Avatar, Box, Card, CardContent, Chip, Rating, Stack, Typography } from '@mui/material';
import Image from 'next/image';
import Link from 'next/link';
import { FavoriteButton } from '@/features/favorites/FavoriteButton';

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
  ownerName?: string;
  ownerAvatarUrl?: string;
};

export function PropertyCard({ property, onFavoriteChange }: { property: PropertySummary; onFavoriteChange?: (favorite: boolean) => void }) {
  const canFavorite = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(property.id);
  return (
    <Card sx={{ overflow: 'hidden', height: '100%', position: 'relative', border: '1px solid', borderColor: 'divider', boxShadow: '0 8px 24px rgba(31,50,45,.06)', transition: 'transform .2s ease, box-shadow .2s ease', '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 14px 34px rgba(31,50,45,.12)' } }}>
      <Box sx={{ position: 'relative', height: 210 }}>
        {property.imageUrl ? (
          <Image src={property.imageUrl.includes('images.unsplash.com') ? `${property.imageUrl}?auto=format&fit=crop&w=900&q=80` : property.imageUrl} alt={property.title} fill unoptimized={!property.imageUrl.includes('images.unsplash.com')} sizes="(max-width: 900px) 100vw, 33vw" style={{ objectFit: 'cover' }} />
        ) : <Box sx={{ height: '100%', bgcolor: 'grey.100' }} />}
        {canFavorite && <Box sx={{ position: 'absolute', zIndex: 2, top: 12, right: 12 }}><FavoriteButton propertyId={property.id} onChange={onFavoriteChange} /></Box>}
      </Box>
      <CardContent sx={{ p: 2.25, '&:last-child': { pb: 2.25 } }}>
        <Stack direction="row" justifyContent="space-between" gap={1.5}>
          <Box>
            <Typography component={Link} href={`/homes/${property.slug}`} fontWeight={800} color="text.primary" sx={{ textDecoration: 'none', '&::after': { content: '\"\"', position: 'absolute', inset: 0 } }}>{property.title}</Typography>
            <Typography variant="body2" color="text.secondary" mt={0.5}>{property.city}{property.district ? `, ${property.district}` : ''}</Typography>
          </Box>
          {property.ownerName && <Avatar src={property.ownerAvatarUrl} alt={property.ownerName} sx={{ width: 32, height: 32, fontSize: 14 }}>{property.ownerName.slice(0, 1)}</Avatar>}
        </Stack>
        <Typography variant="body2" color="text.secondary" mt={1.5}>{property.bedrooms} спальни · до {property.maxGuests} гостей</Typography>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mt={1.5}>
          <Chip size="small" color="primary" variant="outlined" label={`${property.pointsPerNight} баллов за ночь`} />
          {property.rating !== undefined && <Stack direction="row" alignItems="center" spacing={0.5}><Rating value={property.rating} precision={0.1} size="small" readOnly /><Typography variant="body2">{property.rating}</Typography></Stack>}
        </Stack>
      </CardContent>
    </Card>
  );
}
