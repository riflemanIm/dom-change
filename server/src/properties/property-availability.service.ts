import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AvailabilityType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateAvailabilityDto, UpdateAvailabilityDto } from './dto/availability.dto';

type AvailabilityData = {
  startsOn: Date;
  endsOn: Date;
  type: AvailabilityType;
  minNights: number;
  maxNights: number | null;
  pointsPerNight: number;
  maxGuests: number;
  isFlexible: boolean;
  comment: string | null;
};

@Injectable()
export class PropertyAvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async list(ownerId: string, propertyId: string) {
    await this.assertOwner(ownerId, propertyId);
    return this.prisma.availabilityPeriod.findMany({
      where: { propertyId },
      orderBy: [{ startsOn: 'asc' }, { endsOn: 'asc' }],
    });
  }

  async create(ownerId: string, propertyId: string, dto: CreateAvailabilityDto) {
    await this.assertOwner(ownerId, propertyId);
    const data = this.toData(dto) as AvailabilityData;
    this.validate(data);
    await this.assertNoOverlap(propertyId, data.startsOn, data.endsOn);
    return this.prisma.availabilityPeriod.create({ data: { propertyId, ...data } });
  }

  async update(
    ownerId: string,
    propertyId: string,
    periodId: string,
    dto: UpdateAvailabilityDto,
  ) {
    await this.assertOwner(ownerId, propertyId);
    const current = await this.findPeriod(propertyId, periodId);
    const patch = this.toData(dto);
    const next = { ...current, ...patch };
    this.validate(next);
    await this.assertNoOverlap(propertyId, next.startsOn, next.endsOn, periodId);
    return this.prisma.availabilityPeriod.update({ where: { id: periodId }, data: patch });
  }

  async remove(ownerId: string, propertyId: string, periodId: string) {
    await this.assertOwner(ownerId, propertyId);
    await this.findPeriod(propertyId, periodId);
    await this.prisma.availabilityPeriod.delete({ where: { id: periodId } });
  }

  private async assertOwner(ownerId: string, propertyId: string) {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, ownerId, deletedAt: null },
      select: { id: true },
    });
    if (!property) throw new NotFoundException('Объявление не найдено');
  }

  private async findPeriod(propertyId: string, periodId: string) {
    const period = await this.prisma.availabilityPeriod.findFirst({
      where: { id: periodId, propertyId },
    });
    if (!period) throw new NotFoundException('Период доступности не найден');
    return period;
  }

  private async assertNoOverlap(
    propertyId: string,
    startsOn: Date,
    endsOn: Date,
    excludeId?: string,
  ) {
    const overlap = await this.prisma.availabilityPeriod.findFirst({
      where: {
        propertyId,
        id: excludeId ? { not: excludeId } : undefined,
        startsOn: { lte: endsOn },
        endsOn: { gte: startsOn },
      },
      select: { id: true },
    });
    if (overlap) throw new ConflictException('Период пересекается с существующим');
  }

  private toData(dto: CreateAvailabilityDto | UpdateAvailabilityDto): Partial<AvailabilityData> {
    return {
      ...(dto.startsOn !== undefined && { startsOn: this.parseDate(dto.startsOn) }),
      ...(dto.endsOn !== undefined && { endsOn: this.parseDate(dto.endsOn) }),
      ...(dto.type !== undefined && { type: dto.type }),
      ...(dto.minNights !== undefined && { minNights: dto.minNights }),
      ...(dto.maxNights !== undefined && { maxNights: dto.maxNights }),
      ...(dto.pointsPerNight !== undefined && { pointsPerNight: dto.pointsPerNight }),
      ...(dto.maxGuests !== undefined && { maxGuests: dto.maxGuests }),
      ...(dto.isFlexible !== undefined && { isFlexible: dto.isFlexible }),
      ...(dto.comment !== undefined && { comment: dto.comment }),
    };
  }

  private parseDate(value: string) {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
      throw new UnprocessableEntityException('Некорректная дата');
    }
    return date;
  }

  private validate(data: {
    startsOn: Date;
    endsOn: Date;
    minNights: number;
    maxNights: number | null;
  }) {
    if (data.startsOn > data.endsOn) {
      throw new UnprocessableEntityException('Дата окончания должна быть не раньше даты начала');
    }
    if (data.maxNights !== null && data.maxNights < data.minNights) {
      throw new UnprocessableEntityException('Максимум ночей не может быть меньше минимума');
    }
  }
}
