import { Controller, Get, Module, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

const demoProperties = [
  {
    id: 'demo-moscow',
    slug: 'svetlaya-kvartira-u-patriarshih',
    title: 'Светлая квартира у Патриарших',
    city: 'Москва',
    district: 'Пресненский',
    propertyType: 'APARTMENT',
    bedrooms: 2,
    maxGuests: 4,
    pointsPerNight: 140,
    rating: 4.9,
    imageUrl: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267',
  },
  {
    id: 'demo-sochi',
    slug: 'dom-s-vidom-na-gory',
    title: 'Дом с видом на горы',
    city: 'Сочи',
    district: 'Хостинский',
    propertyType: 'HOUSE',
    bedrooms: 3,
    maxGuests: 6,
    pointsPerNight: 180,
    rating: 4.8,
    imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c',
  },
  {
    id: 'demo-kazan',
    slug: 'uyutnaya-studiya-v-centre',
    title: 'Уютная студия в центре',
    city: 'Казань',
    district: 'Вахитовский',
    propertyType: 'STUDIO',
    bedrooms: 1,
    maxGuests: 2,
    pointsPerNight: 95,
    rating: 4.7,
    imageUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688',
  },
];

@ApiTags('properties')
@Controller({ path: 'properties', version: '1' })
class PropertiesController {
  @Get()
  @ApiOperation({ summary: 'Каталог опубликованного жилья' })
  @ApiQuery({ name: 'city', required: false })
  list(@Query('city') city?: string) {
    const items = city
      ? demoProperties.filter((property) =>
          property.city.toLocaleLowerCase('ru').includes(city.toLocaleLowerCase('ru')),
        )
      : demoProperties;
    return { items, total: items.length };
  }
}

@Module({ controllers: [PropertiesController] })
export class PropertiesModule {}
