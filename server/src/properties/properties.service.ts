import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AvailabilityType, FileProcessingStatus, Prisma, PropertyStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { FilesService } from '../files/files.service';
import { UpsertPropertyDto } from './dto/property.dto';
import { ExchangeFilter, PropertySearchDto, PropertySort } from './dto/property-search.dto';

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
    private readonly config: ConfigService,
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

  async listPublic(query: PropertySearchDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;
    const amenityIds = [...new Set(query.amenities?.split(',').map((id) => id.trim()).filter(Boolean) ?? [])];
    if (amenityIds.some((id) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))) {
      throw new UnprocessableEntityException('Некорректный идентификатор удобства');
    }
    if (query.startsOn !== undefined !== (query.endsOn !== undefined)) {
      throw new UnprocessableEntityException('Укажите обе даты поездки');
    }
    if (query.minPoints !== undefined && query.maxPoints !== undefined && query.minPoints > query.maxPoints) {
      throw new UnprocessableEntityException('Минимальная стоимость не может быть больше максимальной');
    }
    const startsOn = query.startsOn ? this.parseDate(query.startsOn) : undefined;
    const endsOn = query.endsOn ? this.parseDate(query.endsOn) : undefined;
    if (startsOn && endsOn && startsOn >= endsOn) {
      throw new UnprocessableEntityException('Дата выезда должна быть позже даты заезда');
    }
    const tripNights = startsOn && endsOn
      ? Math.round((endsOn.getTime() - startsOn.getTime()) / 86_400_000)
      : undefined;
    const availabilityTypes = query.exchange === ExchangeFilter.POINTS
      ? [AvailabilityType.POINTS, AvailabilityType.BOTH]
      : query.exchange === ExchangeFilter.DIRECT
        ? [AvailabilityType.DIRECT, AvailabilityType.BOTH]
        : [AvailabilityType.POINTS, AvailabilityType.DIRECT, AvailabilityType.BOTH, AvailabilityType.ON_REQUEST];
    const location = query.city?.split(',')[0].trim();
    const where: Prisma.PropertyWhereInput = {
      status: PropertyStatus.PUBLISHED,
      deletedAt: null,
      isFake: this.config.get<string>('INCLUDE_FAKE_PROPERTIES', 'false') === 'true' ? undefined : false,
      address: location ? {
        OR: [
          { city: { contains: location, mode: 'insensitive' } },
          { region: { contains: location, mode: 'insensitive' } },
          { country: { contains: location, mode: 'insensitive' } },
        ],
      } : undefined,
      maxGuests: query.guests ? { gte: query.guests } : undefined,
      type: query.propertyType,
      bedroomsCount: query.bedrooms !== undefined ? { gte: query.bedrooms } : undefined,
      allowsChildren: query.allowsChildren,
      allowsPets: query.allowsPets,
      acceptsPoints: query.exchange === ExchangeFilter.POINTS ? true : undefined,
      acceptsDirect: query.exchange === ExchangeFilter.DIRECT ? true : undefined,
      pointsPerNight: query.minPoints !== undefined || query.maxPoints !== undefined
        ? { gte: query.minPoints, lte: query.maxPoints }
        : undefined,
      AND: [
        ...amenityIds.map((amenityId) => ({ amenities: { some: { amenityId } } })),
        ...(startsOn && endsOn
          ? [{
              availability: {
                some: {
                  startsOn: { lte: startsOn },
                  endsOn: { gte: endsOn },
                  type: { in: availabilityTypes },
                  maxGuests: query.guests ? { gte: query.guests } : undefined,
                  minNights: tripNights ? { lte: tripNights } : undefined,
                  OR: tripNights ? [{ maxNights: null }, { maxNights: { gte: tripNights } }] : undefined,
                },
              },
            }]
          : []),
      ],
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.property.findMany({
        where,
        include: {
          address: true,
          photos: { orderBy: { sortOrder: 'asc' } },
          owner: {
            select: {
              profile: { select: { displayName: true, avatarUrl: true, hostRating: true } },
            },
          },
        },
        orderBy: query.sort === PropertySort.PRICE_ASC
          ? [{ pointsPerNight: 'asc' }, { id: 'asc' }]
          : query.sort === PropertySort.PRICE_DESC
            ? [{ pointsPerNight: 'desc' }, { id: 'asc' }]
            : [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.property.count({ where }),
    ]);
    return {
      items: await Promise.all(items.map((property) => this.toPublic(property))),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async listPublicLocations() {
    const includeFake = this.config.get<string>('INCLUDE_FAKE_PROPERTIES', 'false') === 'true';
    const addresses = await this.prisma.propertyAddress.findMany({
      where: {
        property: {
          status: PropertyStatus.PUBLISHED,
          deletedAt: null,
          isFake: includeFake ? undefined : false,
        },
      },
      select: { city: true, region: true, country: true },
      distinct: ['city', 'region', 'country'],
      orderBy: [{ country: 'asc' }, { city: 'asc' }],
    });
    const labels = new Set<string>();
    for (const address of addresses) {
      labels.add(`${address.city}, ${address.country}`);
      if (address.region) labels.add(`${address.region}, ${address.country}`);
      labels.add(address.country);
    }
    return [...labels].sort((left, right) => left.localeCompare(right, 'ru'));
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

  private parseDate(value: string) {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
      throw new UnprocessableEntityException('Некорректная дата');
    }
    return date;
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
        externalUrl: string | null;
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
          url: photo.externalUrl ?? await this.files.createDownloadUrl(this.files.publicBucket, photo.storageKey),
          previewUrl: photo.externalUrl ?? (photo.previewKey
            ? await this.files.createDownloadUrl(this.files.publicBucket, photo.previewKey)
            : null),
        })),
    );
    return { ...rest, address: publicAddress, photos: publicPhotos };
  }
}
