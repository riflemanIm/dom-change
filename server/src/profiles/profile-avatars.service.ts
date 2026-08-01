import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import type sharpFactory from 'sharp';
import { PrismaService } from '../database/prisma.service';
import { FilesService } from '../files/files.service';
import { CreateAvatarUploadDto } from './dto/avatar-upload.dto';

const sharp = require('sharp') as typeof sharpFactory;
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

@Injectable()
export class ProfileAvatarsService {
  constructor(private readonly prisma: PrismaService, private readonly files: FilesService, private readonly config: ConfigService) {}

  async createUpload(userId: string, dto: CreateAvatarUploadDto) {
    if (!allowedMimeTypes.has(dto.mimeType)) throw new UnprocessableEntityException('Разрешены JPEG, PNG и WebP');
    const uploadId = randomUUID();
    const key = `avatars/${userId}/${uploadId}/upload`;
    const uploadUrl = await this.files.createUploadUrl(this.files.privateBucket, key, dto.mimeType);
    return { uploadId, uploadUrl, expiresIn: 600 };
  }

  async complete(userId: string, uploadId: string) {
    const temporaryKey = `avatars/${userId}/${uploadId}/upload`;
    try {
      const head = await this.files.head(this.files.privateBucket, temporaryKey);
      const size = Number(head.ContentLength ?? 0);
      if (!size || size > 5 * 1024 * 1024 || (head.ContentType && !allowedMimeTypes.has(head.ContentType))) throw new Error('Некорректный файл');
      const input = await this.files.read(this.files.privateBucket, temporaryKey);
      const image = sharp(input, { limitInputPixels: 25_000_000, failOn: 'error' }).rotate();
      const metadata = await image.metadata();
      if (!metadata.width || !metadata.height || !['jpeg', 'png', 'webp'].includes(metadata.format ?? '')) throw new Error('Некорректное изображение');
      const avatarKey = `avatars/${userId}/${randomUUID()}.webp`;
      const output = await image.resize(512, 512, { fit: 'cover', position: 'attention' }).webp({ quality: 86 }).toBuffer();
      await this.files.put(this.files.publicBucket, avatarKey, output, 'image/webp');
      const current = await this.prisma.userProfile.findUniqueOrThrow({ where: { userId }, select: { avatarKey: true } });
      const publicApiUrl = this.config.get<string>('PUBLIC_API_URL', 'http://localhost:4000/api/v1').replace(/\/$/, '');
      const profile = await this.prisma.userProfile.update({
        where: { userId }, data: { avatarKey, avatarUrl: `${publicApiUrl}/profile-avatars/${userId}` },
      });
      await Promise.allSettled([
        this.files.delete(this.files.privateBucket, temporaryKey),
        current.avatarKey ? this.files.delete(this.files.publicBucket, current.avatarKey) : Promise.resolve(),
      ]);
      return profile;
    } catch {
      throw new UnprocessableEntityException('Не удалось обработать аватар');
    }
  }

  async redirectUrl(userId: string) {
    const profile = await this.prisma.userProfile.findUnique({ where: { userId }, select: { avatarKey: true } });
    if (!profile?.avatarKey) throw new NotFoundException('Аватар не найден');
    return this.files.createDownloadUrl(this.files.publicBucket, profile.avatarKey);
  }
}
