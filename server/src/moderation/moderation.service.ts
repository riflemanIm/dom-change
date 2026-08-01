import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { FileProcessingStatus, Prisma, PropertyStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { FilesService } from '../files/files.service';
import { ModerationAction, ModerationDecisionDto } from './dto/moderation-decision.dto';

const moderationInclude = {
  address: true,
  rule: true,
  photos: { orderBy: { sortOrder: 'asc' as const } },
  amenities: { include: { amenity: true } },
  availability: { orderBy: { startsOn: 'asc' as const } },
  owner: {
    select: {
      id: true,
      email: true,
      emailVerified: true,
      phoneVerified: true,
      trustLevel: true,
      profile: true,
    },
  },
  moderationHistory: {
    orderBy: { createdAt: 'desc' as const },
    include: { moderator: { select: { profile: { select: { displayName: true } } } } },
  },
} satisfies Prisma.PropertyInclude;

@Injectable()
export class ModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly files: FilesService,
  ) {}

  async list(page = 1, limit = 20) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(50, Math.max(1, limit));
    const where = { status: PropertyStatus.PENDING_MODERATION, deletedAt: null };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.property.findMany({
        where,
        include: moderationInclude,
        orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
      }),
      this.prisma.property.count({ where }),
    ]);
    return {
      items: await Promise.all(items.map((property) => this.present(property))),
      total,
      page: safePage,
      limit: safeLimit,
      pages: Math.ceil(total / safeLimit),
    };
  }

  async get(id: string) {
    const property = await this.prisma.property.findFirst({
      where: { id, deletedAt: null },
      include: moderationInclude,
    });
    if (!property) throw new NotFoundException('Объявление не найдено');
    return this.present(property);
  }

  async decide(moderatorId: string, propertyId: string, dto: ModerationDecisionDto) {
    const comment = dto.comment?.trim() || null;
    if (dto.action !== ModerationAction.APPROVE && !comment) {
      throw new UnprocessableEntityException('Укажите причину решения');
    }
    const toStatus = dto.action === ModerationAction.APPROVE
      ? PropertyStatus.PUBLISHED
      : dto.action === ModerationAction.REQUEST_CHANGES
        ? PropertyStatus.CHANGES_REQUESTED
        : PropertyStatus.REJECTED;
    try {
      const property = await this.prisma.$transaction(async (tx) => {
        const property = await tx.property.findUnique({
          where: { id: propertyId },
          include: { photos: true },
        });
        if (!property || property.deletedAt) throw new NotFoundException('Объявление не найдено');
        if (property.status !== PropertyStatus.PENDING_MODERATION) {
          throw new ConflictException('Объявление уже обработано');
        }
        if (toStatus === PropertyStatus.PUBLISHED && !property.photos.some(({ processingStatus }) => processingStatus === FileProcessingStatus.READY)) {
          throw new UnprocessableEntityException('Нельзя опубликовать объявление без обработанных фотографий');
        }
        const updated = await tx.property.updateMany({
          where: { id: propertyId, status: PropertyStatus.PENDING_MODERATION },
          data: { status: toStatus },
        });
        if (updated.count !== 1) throw new ConflictException('Объявление уже обработано');
        await tx.propertyModerationDecision.create({
          data: {
            propertyId,
            moderatorId,
            fromStatus: PropertyStatus.PENDING_MODERATION,
            toStatus,
            comment,
          },
        });
        return tx.property.findUniqueOrThrow({ where: { id: propertyId }, include: moderationInclude });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      return this.present(property);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new ConflictException('Объявление уже обрабатывается, повторите запрос');
      }
      throw error;
    }
  }

  private async present<T extends { photos: Array<{
    storageKey: string;
    previewKey: string | null;
    externalUrl: string | null;
    processingStatus: FileProcessingStatus;
  }> }>(property: T) {
    const photos = await Promise.all(property.photos.map(async (photo) => ({
      ...photo,
      url: photo.processingStatus === FileProcessingStatus.READY
        ? photo.externalUrl ?? await this.files.createDownloadUrl(this.files.publicBucket, photo.storageKey)
        : null,
      previewUrl: photo.processingStatus === FileProcessingStatus.READY && photo.previewKey
        ? photo.externalUrl ?? await this.files.createDownloadUrl(this.files.publicBucket, photo.previewKey)
        : null,
    })));
    return { ...property, photos };
  }
}
