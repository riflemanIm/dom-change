import type { PropertySummary } from '@/components/properties/PropertyCard';
import type { CatalogProperty } from './catalog-api';

export function toPropertySummary(property: CatalogProperty): PropertySummary {
  const photo = property.photos.find(({ isPrimary }) => isPrimary) ?? property.photos[0];
  return {
    id: property.id,
    slug: property.slug,
    title: property.title,
    city: property.address?.city ?? 'Город не указан',
    district: property.address?.district ?? '',
    bedrooms: property.bedroomsCount,
    maxGuests: property.maxGuests,
    pointsPerNight: property.pointsPerNight,
    rating: property.owner?.profile?.hostRating == null ? undefined : Number(property.owner.profile.hostRating),
    ownerName: property.owner?.profile?.displayName,
    ownerAvatarUrl: property.owner?.profile?.avatarUrl ?? undefined,
    imageUrl: photo?.previewUrl ?? photo?.url,
  };
}
