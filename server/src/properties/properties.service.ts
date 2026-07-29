import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { FileProcessingStatus, Prisma, PropertyStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import { FilesService } from '../files/files.service';
import { UpsertPropertyDto } from './dto/property.dto';

const propertyInclude = {
  address: true,
  rule: true,
  photos: { orderBy: { sortOrder: 'asc' as const } },
  amenities: { include: { amenity: true } },
  availability: { orderBy: [{ startsOn: 'asc' as const }, { endsOn: 'asc' as const }] },
} satisfies Prisma.PropertyInclude;

@Injectable()
export class PropertiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly files: FilesService,
  ) {}

  async createDraft(ownerId: string, dto: UpsertPropertyDto) {
    this.validateRanges(dto);
    return this.prisma.property.create({
      data: {
        ownerId,
        slug: `home-${randomUUID()}`,
        ...this.scalarData(dto),
        address: dto.address ? { create: dto.address } : undefined,
        rule: dto.rule ? { create: dto.rule } : { create: {} },
        amenities: dto.amenityIds?.length
          ? { create: dto.amenityIds.map((amenityId) => ({ amenityId })) }
          : undefined,
      },
      include: propertyInclude,
    });
  }

  listMine(ownerId: string) {
    return this.prisma.property.findMany({
      where: { ownerId, deletedAt: null },
      include: propertyInclude,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getMine(ownerId: string, id: string) {
    const property = await this.prisma.property.findFirst({
      where: { id, ownerId, deletedAt: null },
      include: propertyInclude,
    });
    if (!property) throw new NotFoundException('Объявление не найдено');
    return property;
  }

  async update(ownerId: string, id: string, dto: UpsertPropertyDto) {
    const property = await this.getMine(ownerId, id);
    if (property.status === PropertyStatus.PENDING_MODERATION) {
      throw new ForbiddenException('Нельзя менять объявление во время модерации');
    }
    this.validateRanges(dto);
    return this.prisma.$transaction(async (tx) => {
      if (dto.amenityIds) {
        await tx.propertyAmenity.deleteMany({ where: { propertyId: id } });
        if (dto.amenityIds.length) {
          await tx.propertyAmenity.createMany({
            data: dto.amenityIds.map((amenityId) => ({ propertyId: id, amenityId })),
            skipDuplicates: true,
          });
        }
      }
      return tx.property.update({
        where: { id },
        data: {
          ...this.scalarData(dto),
          address: dto.address
            ? { upsert: { create: dto.address, update: dto.address } }
            : undefined,
          rule: dto.rule
            ? { upsert: { create: dto.rule, update: dto.rule } }
            : undefined,
        },
        include: propertyInclude,
      });
    });
  }

  async submit(ownerId: string, id: string) {
    const property = await this.getMine(ownerId, id);
    const user = await this.prisma.user.findUnique({
      where: { id: ownerId },
      select: { emailVerified: true },
    });
    if (!user?.emailVerified) {
      throw new ForbiddenException('Сначала подтвердите email');
    }
    const missing = [
      property.title.trim().length < 5 && 'название',
      property.description.trim().length < 50 && 'описание не менее 50 символов',
      !property.address?.country && 'страна',
      !property.address?.city && 'город',
      !property.acceptsPoints && !property.acceptsDirect && 'тип обмена',
      !property.photos.some(({ processingStatus }) => processingStatus === FileProcessingStatus.READY) &&
        'хотя бы одну обработанную фотографию',
    ].filter(Boolean);
    if (missing.length) {
      throw new UnprocessableEntityException(`Заполните: ${missing.join(', ')}`);
    }
    return this.prisma.property.update({
      where: { id },
      data: { status: PropertyStatus.PENDING_MODERATION },
      include: propertyInclude,
    });
  }

  async archive(ownerId: string, id: string) {
    const property = await this.getMine(ownerId, id);
    if (property.status === PropertyStatus.PENDING_MODERATION) {
      throw new ForbiddenException('Сначала отмените отправку на модерацию');
    }
    await this.prisma.property.update({
      where: { id },
      data: { status: PropertyStatus.ARCHIVED, deletedAt: new Date() },
    });
  }

  async listPublic(city?: string) {
    const items = await this.prisma.property.findMany({
      where: {
        status: PropertyStatus.PUBLISHED,
        deletedAt: null,
        address: city ? { city: { contains: city, mode: 'insensitive' } } : undefined,
      },
      include: propertyInclude,
      orderBy: { createdAt: 'desc' },
    });
    return { items: await Promise.all(items.map((property) => this.toPublic(property))), total: items.length };
  }

  async getPublic(idOrSlug: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      idOrSlug,
    );
    const property = await this.prisma.property.findFirst({
      where: {
        OR: isUuid ? [{ id: idOrSlug }, { slug: idOrSlug }] : [{ slug: idOrSlug }],
        status: PropertyStatus.PUBLISHED,
        deletedAt: null,
      },
      include: {
        ...propertyInclude,
        owner: {
          select: {
            id: true,
            createdAt: true,
            trustLevel: true,
            emailVerified: true,
            phoneVerified: true,
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
                city: true,
                description: true,
                adultsCount: true,
                childrenCount: true,
                hasPets: true,
                hostRating: true,
                guestRating: true,
                completedExchanges: true,
              },
            },
          },
        },
      },
    });
    if (!property) throw new NotFoundException('Объявление не найдено');
    return this.toPublic(property);
  }

  listAmenities() {
    return this.prisma.amenity.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  private scalarData(dto: UpsertPropertyDto) {
    const { address: _, rule: __, amenityIds: ___, ...data } = dto;
    return data;
  }

  private validateRanges(dto: UpsertPropertyDto) {
    if (dto.minNights && dto.maxNights && dto.maxNights < dto.minNights) {
      throw new UnprocessableEntityException('Максимум ночей не может быть меньше минимума');
    }
    if (dto.floor && dto.floorsTotal && dto.floor > dto.floorsTotal) {
      throw new UnprocessableEntityException('Этаж не может быть выше этажности дома');
    }
  }

  private async toPublic<
    T extends {
      address: Record<string, unknown> | null;
      ownerId: string;
      deletedAt: Date | null;
      photos: Array<{
        id: string;
        storageKey: string;
        previewKey: string | null;
        sortOrder: number;
        isPrimary: boolean;
        processingStatus: FileProcessingStatus;
      }>;
    },
  >(property: T) {
    const { address, photos, ownerId: _, deletedAt: __, ...rest } = property;
    const publicAddress = address
      ? {
          country: address.country,
          region: address.region,
          city: address.city,
          district: address.district,
          latitudeApprox: address.latitudeApprox,
          longitudeApprox: address.longitudeApprox,
        }
      : null;
    const publicPhotos = await Promise.all(
      photos
        .filter(({ processingStatus }) => processingStatus === FileProcessingStatus.READY)
        .map(async (photo) => ({
          id: photo.id,
          sortOrder: photo.sortOrder,
          isPrimary: photo.isPrimary,
          url: await this.files.createDownloadUrl(this.files.publicBucket, photo.storageKey),
          previewUrl: photo.previewKey
            ? await this.files.createDownloadUrl(this.files.publicBucket, photo.previewKey)
            : null,
        })),
    );
    return { ...rest, address: publicAddress, photos: publicPhotos };
  }
}
