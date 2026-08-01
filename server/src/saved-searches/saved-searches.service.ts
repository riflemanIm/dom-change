import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateSavedSearchDto, UpdateSavedSearchDto } from './dto/saved-search.dto';

const allowedKeys = new Set([
  'city', 'startsOn', 'endsOn', 'guests', 'exchange', 'minPoints', 'maxPoints',
  'propertyType', 'bedrooms', 'allowsChildren', 'allowsPets', 'amenities', 'sort',
]);

@Injectable()
export class SavedSearchesService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.savedSearch.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(userId: string, dto: CreateSavedSearchDto) {
    const query = this.canonicalQuery(dto.query);
    const count = await this.prisma.savedSearch.count({ where: { userId } });
    if (count >= 20) throw new UnprocessableEntityException('Можно сохранить не более 20 поисков');
    try {
      return await this.prisma.savedSearch.create({
        data: { userId, name: dto.name.trim(), query },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Такой поиск уже сохранён');
      }
      throw error;
    }
  }

  async update(userId: string, id: string, dto: UpdateSavedSearchDto) {
    const updated = await this.prisma.savedSearch.updateMany({
      where: { id, userId },
      data: {
        name: dto.name?.trim(),
        notificationsEnabled: dto.notificationsEnabled,
      },
    });
    if (!updated.count) throw new NotFoundException('Сохранённый поиск не найден');
    return this.prisma.savedSearch.findUniqueOrThrow({ where: { id } });
  }

  async remove(userId: string, id: string) {
    const removed = await this.prisma.savedSearch.deleteMany({ where: { id, userId } });
    if (!removed.count) throw new NotFoundException('Сохранённый поиск не найден');
  }

  private canonicalQuery(rawQuery: string) {
    const source = new URLSearchParams(rawQuery.startsWith('?') ? rawQuery.slice(1) : rawQuery);
    const canonical = new URLSearchParams();
    for (const [key, value] of source) {
      if (!allowedKeys.has(key)) throw new UnprocessableEntityException(`Неизвестный фильтр: ${key}`);
      const normalized = value.trim();
      if (!normalized || normalized.length > 200) throw new UnprocessableEntityException('Некорректное значение фильтра');
      canonical.set(key, normalized);
    }
    canonical.delete('sort');
    if (!canonical.size) throw new UnprocessableEntityException('Выберите хотя бы один фильтр поиска');
    if (source.get('sort')) canonical.set('sort', source.get('sort')!.trim());
    canonical.sort();
    return canonical.toString();
  }
}
