import { PrismaClient } from '@prisma/client';

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
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
