import { AvailabilityType, FileProcessingStatus, PrismaClient, PropertyStatus, PropertyType, TrustLevel } from '@prisma/client';
import { config } from 'dotenv';

config({ path: '../.env' });

const prisma = new PrismaClient();

const amenities = [
  ['wifi', 'Wi-Fi', 'Связь'],
  ['workspace', 'Рабочее место', 'Связь'],
  ['tv', 'Телевизор', 'Техника'],
  ['washing_machine', 'Стиральная машина', 'Техника'],
  ['dishwasher', 'Посудомоечная машина', 'Кухня'],
  ['oven', 'Духовка', 'Кухня'],
  ['microwave', 'Микроволновая печь', 'Кухня'],
  ['air_conditioning', 'Кондиционер', 'Комфорт'],
  ['heating', 'Отопление', 'Комфорт'],
  ['balcony', 'Балкон', 'Комфорт'],
  ['elevator', 'Лифт', 'Доступность'],
  ['parking', 'Парковка', 'Транспорт'],
  ['baby_crib', 'Детская кроватка', 'Для детей'],
  ['baby_chair', 'Детский стул', 'Для детей'],
  ['accessible', 'Доступно для маломобильных гостей', 'Доступность'],
] as const;

const locations = [
  ['Москва', 'Хамовники'], ['Санкт-Петербург', 'Петроградский'], ['Сочи', 'Хостинский'],
  ['Казань', 'Вахитовский'], ['Калининград', 'Амалиенау'], ['Тбилиси', 'Сололаки'],
  ['Стамбул', 'Бейоглу'], ['Минск', 'Центральный'], ['Алматы', 'Медеуский'], ['Ереван', 'Кентрон'],
] as const;

const homeKinds = [
  ['Светлая квартира', PropertyType.APARTMENT],
  ['Уютный семейный дом', PropertyType.HOUSE],
  ['Студия с характером', PropertyType.STUDIO],
] as const;

const imageUrls = [
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688',
  'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c',
  'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d',
  'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace',
  'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6',
  'https://images.unsplash.com/photo-1615874694520-474822394e73',
  'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0',
] as const;

const ownerNames = ['Анна', 'Михаил', 'Елена', 'Игорь', 'Мария', 'Алексей', 'Ольга', 'Дмитрий', 'София', 'Артём'];

async function main() {
  await Promise.all(
    amenities.map(([code, name, category], index) =>
      prisma.amenity.upsert({
        where: { code },
        update: { name, category, isActive: true, sortOrder: index },
        create: { code, name, category, sortOrder: index },
      }),
    ),
  );

  const amenityRows = await prisma.amenity.findMany({ orderBy: { sortOrder: 'asc' } });
  for (let ownerIndex = 0; ownerIndex < ownerNames.length; ownerIndex += 1) {
    const displayName = ownerNames[ownerIndex];
    const owner = await prisma.user.upsert({
      where: { email: `demo-owner-${ownerIndex + 1}@example.invalid` },
      update: {
        emailVerified: true,
        trustLevel: TrustLevel.VERIFIED_MEMBER,
        profile: {
          upsert: {
            create: { displayName, city: locations[ownerIndex][0], hostRating: 4.7 + (ownerIndex % 3) / 10, completedExchanges: 3 + ownerIndex },
            update: { displayName, city: locations[ownerIndex][0], hostRating: 4.7 + (ownerIndex % 3) / 10, completedExchanges: 3 + ownerIndex },
          },
        },
      },
      create: {
        email: `demo-owner-${ownerIndex + 1}@example.invalid`,
        passwordHash: 'fake-account-login-disabled',
        emailVerified: true,
        trustLevel: TrustLevel.VERIFIED_MEMBER,
        profile: { create: { displayName, city: locations[ownerIndex][0], hostRating: 4.7 + (ownerIndex % 3) / 10, completedExchanges: 3 + ownerIndex } },
      },
    });

    for (let kindIndex = 0; kindIndex < homeKinds.length; kindIndex += 1) {
      const [city, district] = locations[ownerIndex];
      const [kind, type] = homeKinds[kindIndex];
      const number = ownerIndex * homeKinds.length + kindIndex + 1;
      const slug = `demo-home-${String(number).padStart(2, '0')}`;
      const bedroomsCount = kindIndex + 1;
      const maxGuests = bedroomsCount * 2;
      const amenitySelection = amenityRows.slice(ownerIndex % 5, ownerIndex % 5 + 6);
      await prisma.property.upsert({
        where: { slug },
        update: {
          ownerId: owner.id,
          title: `${kind} в районе ${district}`,
          description: `Комфортное жильё в городе ${city} для спокойного отдыха и знакомства с местной жизнью. Рядом находятся кафе, прогулочные маршруты и общественный транспорт. Дом полностью подготовлен для гостей и длительного проживания.`,
          type,
          bedroomsCount,
          bedsCount: bedroomsCount + 1,
          roomsCount: bedroomsCount + 1,
          maxGuests,
          areaSqm: 42 + number * 2,
          acceptsPoints: true,
          acceptsDirect: number % 3 !== 0,
          pointsPerNight: 90 + (number % 9) * 10,
          minNights: 2,
          maxNights: 21,
          status: PropertyStatus.PUBLISHED,
          isFake: true,
          address: { upsert: { create: { country: ownerIndex < 5 ? 'Россия' : city === 'Минск' ? 'Беларусь' : city === 'Алматы' ? 'Казахстан' : city === 'Ереван' ? 'Армения' : city === 'Тбилиси' ? 'Грузия' : 'Турция', city, district }, update: { city, district } } },
          photos: { deleteMany: {}, create: { storageKey: `fake/${slug}/cover`, externalUrl: imageUrls[number % imageUrls.length], mimeType: 'image/jpeg', sizeBytes: 0, width: 1600, height: 1067, processingStatus: FileProcessingStatus.READY, isPrimary: true } },
          availability: { deleteMany: {}, create: { startsOn: new Date('2026-01-01T00:00:00.000Z'), endsOn: new Date('2030-12-31T00:00:00.000Z'), type: number % 3 === 0 ? AvailabilityType.POINTS : AvailabilityType.BOTH, minNights: 2, maxNights: 21, pointsPerNight: 90 + (number % 9) * 10, maxGuests } },
          amenities: { deleteMany: {}, create: amenitySelection.map(({ id }) => ({ amenityId: id })) },
        },
        create: {
          ownerId: owner.id,
          slug,
          title: `${kind} в районе ${district}`,
          description: `Комфортное жильё в городе ${city} для спокойного отдыха и знакомства с местной жизнью. Рядом находятся кафе, прогулочные маршруты и общественный транспорт. Дом полностью подготовлен для гостей и длительного проживания.`,
          type,
          bedroomsCount,
          bedsCount: bedroomsCount + 1,
          roomsCount: bedroomsCount + 1,
          maxGuests,
          areaSqm: 42 + number * 2,
          acceptsPoints: true,
          acceptsDirect: number % 3 !== 0,
          pointsPerNight: 90 + (number % 9) * 10,
          minNights: 2,
          maxNights: 21,
          status: PropertyStatus.PUBLISHED,
          isFake: true,
          address: { create: { country: ownerIndex < 5 ? 'Россия' : city === 'Минск' ? 'Беларусь' : city === 'Алматы' ? 'Казахстан' : city === 'Ереван' ? 'Армения' : city === 'Тбилиси' ? 'Грузия' : 'Турция', city, district } },
          photos: { create: { storageKey: `fake/${slug}/cover`, externalUrl: imageUrls[number % imageUrls.length], mimeType: 'image/jpeg', sizeBytes: 0, width: 1600, height: 1067, processingStatus: FileProcessingStatus.READY, isPrimary: true } },
          availability: { create: { startsOn: new Date('2026-01-01T00:00:00.000Z'), endsOn: new Date('2030-12-31T00:00:00.000Z'), type: number % 3 === 0 ? AvailabilityType.POINTS : AvailabilityType.BOTH, minNights: 2, maxNights: 21, pointsPerNight: 90 + (number % 9) * 10, maxGuests } },
          amenities: { create: amenitySelection.map(({ id }) => ({ amenityId: id })) },
          rule: { create: {} },
        },
      });
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
