import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PropertyStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { PropertiesService } from '../properties/properties.service';

@Injectable()
export class FavoritesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly properties: PropertiesService,
    private readonly config: ConfigService,
  ) {}

  async list(userId: string) {
    const includeFake = this.config.get<string>('INCLUDE_FAKE_PROPERTIES', 'false') === 'true';
    const favorites = await this.prisma.favorite.findMany({
      where: {
        userId,
        property: {
          status: PropertyStatus.PUBLISHED,
          deletedAt: null,
          isFake: includeFake ? undefined : false,
        },
      },
      include: {
        property: {
          include: {
            address: true,
            photos: { orderBy: { sortOrder: 'asc' } },
            owner: {
              select: {
                profile: { select: { displayName: true, avatarUrl: true, hostRating: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return Promise.all(favorites.map(({ property }) => this.properties.presentPublic(property)));
  }

  async ids(userId: string) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      select: { propertyId: true },
    });
    return favorites.map(({ propertyId }) => propertyId);
  }

  async add(userId: string, propertyId: string) {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, status: PropertyStatus.PUBLISHED, deletedAt: null },
      select: { id: true, ownerId: true },
    });
    if (!property) throw new NotFoundException('Объявление не найдено');
    if (property.ownerId === userId) return { favorite: false };
    await this.prisma.favorite.upsert({
      where: { userId_propertyId: { userId, propertyId } },
      create: { userId, propertyId },
      update: {},
    });
    return { favorite: true };
  }

  async remove(userId: string, propertyId: string) {
    await this.prisma.favorite.deleteMany({ where: { userId, propertyId } });
  }
}
