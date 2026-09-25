import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PointTransactionType, Prisma, TrustLevel } from '@prisma/client';
import * as argon2 from 'argon2';
import { PointRulesService } from '../database/point-rules.service';
import { PrismaService } from '../database/prisma.service';
import { CreateAdminUserDto } from './dto/admin-user.dto';
import { CreateAmenityDto, UpdateAmenityDto } from './dto/amenity.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService, private readonly rules: PointRulesService) {}

  async users(query = '') {
    const search = query.trim().slice(0, 100);
    return this.prisma.user.findMany({
      where: {
        deletedAt: null,
        ...(search ? { OR: [
          { email: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { profile: { displayName: { contains: search, mode: Prisma.QueryMode.insensitive } } },
        ] } : {}),
      },
      select: {
        id: true, email: true, role: true, status: true, emailVerified: true, createdAt: true,
        profile: { select: { displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async createUser(dto: CreateAdminUserDto) {
    const email = dto.email.trim().toLowerCase();
    const displayName = dto.displayName.trim();
    if (displayName.length < 2) throw new BadRequestException('Имя должно содержать хотя бы 2 символа');
    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });
    const welcomeBonus = await this.rules.amount('registration');
    try {
      return await this.prisma.user.create({
        data: {
          email, passwordHash, role: dto.role, emailVerified: dto.emailVerified ?? true,
          trustLevel: dto.emailVerified === false ? TrustLevel.NEW : TrustLevel.EMAIL_VERIFIED,
          profile: { create: { displayName } },
          pointAccount: { create: {
            available: welcomeBonus,
            bonus: welcomeBonus,
            ...(welcomeBonus > 0 ? { transactions: { create: {
              type: PointTransactionType.BONUS,
              amount: welcomeBonus,
              idempotencyKey: `welcome:${email}`,
              sourceType: 'ADMIN_CREATED_USER',
              description: 'Приветственный бонус',
            } } } : {}),
          } },
        },
        select: {
          id: true, email: true, role: true, status: true, emailVerified: true, createdAt: true,
          profile: { select: { displayName: true } },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Пользователь с таким email уже существует');
      }
      throw error;
    }
  }

  amenities() {
    return this.prisma.amenity.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
  }

  async createAmenity(dto: CreateAmenityDto) {
    try {
      return await this.prisma.amenity.create({ data: {
        code: dto.code.trim(), name: dto.name.trim(), category: dto.category.trim(),
        sortOrder: dto.sortOrder ?? 0, isActive: dto.isActive ?? true,
      } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Код удобства уже существует');
      }
      throw error;
    }
  }

  async updateAmenity(id: string, dto: UpdateAmenityDto) {
    if (!Object.keys(dto).length) throw new BadRequestException('Укажите изменения');
    try {
      return await this.prisma.amenity.update({ where: { id }, data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.category !== undefined ? { category: dto.category.trim() } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Удобство не найдено');
      }
      throw error;
    }
  }
}
