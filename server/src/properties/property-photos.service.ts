import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { FileProcessingStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import type sharpFactory from 'sharp';
import { PrismaService } from '../database/prisma.service';
import { FilesService } from '../files/files.service';
import { CreatePhotoUploadDto } from './dto/property-photo.dto';
import { PropertiesService } from './properties.service';

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const maxPhotos = 20;
const sharp = require('sharp') as typeof sharpFactory;

@Injectable()
export class PropertyPhotosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly files: FilesService,
    private readonly properties: PropertiesService,
  ) {}

  async createUpload(ownerId: string, propertyId: string, dto: CreatePhotoUploadDto) {
    await this.properties.prepareContentEdit(ownerId, propertyId);
    if (!allowedMimeTypes.has(dto.mimeType)) {
      throw new UnprocessableEntityException('Разрешены JPEG, PNG и WebP');
    }
    const count = await this.prisma.propertyPhoto.count({ where: { propertyId } });
    if (count >= maxPhotos) throw new UnprocessableEntityException(`Можно загрузить не более ${maxPhotos} фото`);
    await this.properties.markContentChanged(ownerId, propertyId);

    const photoId = randomUUID();
    const storageKey = `properties/${propertyId}/${photoId}/upload`;
    const photo = await this.prisma.propertyPhoto.create({
      data: {
        id: photoId,
        propertyId,
        storageKey,
        originalFilename: dto.filename,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        sortOrder: count,
        isPrimary: count === 0,
      },
    });
    const uploadUrl = await this.files.createUploadUrl(
      this.files.privateBucket,
      storageKey,
      dto.mimeType,
    );
    return { photoId: photo.id, uploadUrl, expiresIn: 600 };
  }

  async complete(ownerId: string, propertyId: string, photoId: string) {
    await this.properties.prepareContentEdit(ownerId, propertyId);
    const photo = await this.getPhoto(propertyId, photoId);
    if (photo.processingStatus === FileProcessingStatus.READY) return this.present(photo);
    await this.properties.markContentChanged(ownerId, propertyId);

    try {
      const head = await this.files.head(this.files.privateBucket, photo.storageKey);
      const actualSize = Number(head.ContentLength ?? 0);
      if (!actualSize || actualSize > 10 * 1024 * 1024) throw new Error('Некорректный размер файла');
      if (head.ContentType && !allowedMimeTypes.has(head.ContentType)) throw new Error('Некорректный MIME-тип');

      await this.prisma.propertyPhoto.update({
        where: { id: photoId },
        data: { processingStatus: FileProcessingStatus.PROCESSING, sizeBytes: actualSize },
      });
      const input = await this.files.read(this.files.privateBucket, photo.storageKey);
      const image = sharp(input, { limitInputPixels: 40_000_000, failOn: 'error' }).rotate();
      const metadata = await image.metadata();
      if (!metadata.width || !metadata.height || !['jpeg', 'png', 'webp'].includes(metadata.format ?? '')) {
        throw new Error('Файл не является поддерживаемым изображением');
      }

      const mainKey = `properties/${propertyId}/${photoId}/image.webp`;
      const previewKey = `properties/${propertyId}/${photoId}/preview.webp`;
      const [main, preview] = await Promise.all([
        image.clone().resize({ width: 1920, height: 1440, fit: 'inside', withoutEnlargement: true }).webp({ quality: 86 }).toBuffer(),
        image.clone().resize({ width: 640, height: 480, fit: 'cover' }).webp({ quality: 78 }).toBuffer(),
      ]);
      await Promise.all([
        this.files.put(this.files.publicBucket, mainKey, main, 'image/webp'),
        this.files.put(this.files.publicBucket, previewKey, preview, 'image/webp'),
      ]);
      const ready = await this.prisma.$transaction(async (tx) => {
        const readyPrimaryCount = await tx.propertyPhoto.count({
          where: {
            propertyId,
            isPrimary: true,
            processingStatus: FileProcessingStatus.READY,
          },
        });
        if (readyPrimaryCount === 0) {
          await tx.propertyPhoto.updateMany({
            where: { propertyId },
            data: { isPrimary: false },
          });
        }
        return tx.propertyPhoto.update({
          where: { id: photoId },
          data: {
            storageKey: mainKey,
            previewKey,
            mimeType: 'image/webp',
            width: metadata.width,
            height: metadata.height,
            processingStatus: FileProcessingStatus.READY,
            processingError: null,
            isPrimary: readyPrimaryCount === 0,
          },
        });
      });
      await this.files.delete(this.files.privateBucket, photo.storageKey);
      return this.present(ready);
    } catch (error) {
      await this.prisma.propertyPhoto.update({
        where: { id: photoId },
        data: {
          processingStatus: FileProcessingStatus.FAILED,
          processingError: (error as Error).message.slice(0, 500),
        },
      });
      throw new UnprocessableEntityException('Не удалось обработать изображение');
    }
  }

  async list(ownerId: string, propertyId: string) {
    await this.properties.getMine(ownerId, propertyId);
    const photos = await this.prisma.propertyPhoto.findMany({
      where: { propertyId },
      orderBy: { sortOrder: 'asc' },
    });
    return Promise.all(photos.map((photo) => this.present(photo)));
  }

  async reorder(ownerId: string, propertyId: string, photoIds: string[]) {
    await this.properties.prepareContentEdit(ownerId, propertyId);
    const existing = await this.prisma.propertyPhoto.findMany({
      where: { propertyId },
      select: { id: true },
    });
    const existingIds = new Set(existing.map(({ id }) => id));
    if (
      photoIds.length !== existingIds.size ||
      new Set(photoIds).size !== photoIds.length ||
      photoIds.some((id) => !existingIds.has(id))
    ) {
      throw new BadRequestException('Передайте все фотографии объявления без повторов');
    }
    await this.properties.markContentChanged(ownerId, propertyId);
    await this.prisma.$transaction(
      photoIds.map((id, sortOrder) =>
        this.prisma.propertyPhoto.update({ where: { id }, data: { sortOrder } }),
      ),
    );
    return this.list(ownerId, propertyId);
  }

  async setPrimary(ownerId: string, propertyId: string, photoId: string) {
    await this.properties.prepareContentEdit(ownerId, propertyId);
    const photo = await this.getPhoto(propertyId, photoId);
    if (photo.processingStatus !== FileProcessingStatus.READY) {
      throw new BadRequestException('Главной можно сделать только обработанную фотографию');
    }
    await this.properties.markContentChanged(ownerId, propertyId);
    await this.prisma.$transaction([
      this.prisma.propertyPhoto.updateMany({ where: { propertyId }, data: { isPrimary: false } }),
      this.prisma.propertyPhoto.update({ where: { id: photoId }, data: { isPrimary: true } }),
    ]);
    return { primaryPhotoId: photoId };
  }

  async remove(ownerId: string, propertyId: string, photoId: string) {
    await this.properties.prepareContentEdit(ownerId, propertyId);
    const photo = await this.getPhoto(propertyId, photoId);
    await this.properties.markContentChanged(ownerId, propertyId);
    await this.prisma.propertyPhoto.delete({ where: { id: photoId } });
    await Promise.allSettled([
      this.files.delete(
        photo.processingStatus === FileProcessingStatus.READY
          ? this.files.publicBucket
          : this.files.privateBucket,
        photo.storageKey,
      ),
      photo.previewKey
        ? this.files.delete(this.files.publicBucket, photo.previewKey)
        : Promise.resolve(),
    ]);
    if (photo.isPrimary) {
      const next = await this.prisma.propertyPhoto.findFirst({
        where: { propertyId, processingStatus: FileProcessingStatus.READY },
        orderBy: { sortOrder: 'asc' },
      });
      if (next) await this.prisma.propertyPhoto.update({ where: { id: next.id }, data: { isPrimary: true } });
    }
  }

  async publicPhotos(propertyId: string) {
    const photos = await this.prisma.propertyPhoto.findMany({
      where: { propertyId, processingStatus: FileProcessingStatus.READY },
      orderBy: { sortOrder: 'asc' },
    });
    return Promise.all(photos.map((photo) => this.present(photo)));
  }

  private async getPhoto(propertyId: string, id: string) {
    const photo = await this.prisma.propertyPhoto.findFirst({ where: { id, propertyId } });
    if (!photo) throw new NotFoundException('Фотография не найдена');
    return photo;
  }

  private async present(photo: {
    id: string;
    storageKey: string;
    previewKey: string | null;
    sortOrder: number;
    isPrimary: boolean;
    processingStatus: FileProcessingStatus;
    width: number | null;
    height: number | null;
  }) {
    const ready = photo.processingStatus === FileProcessingStatus.READY;
    return {
      id: photo.id,
      sortOrder: photo.sortOrder,
      isPrimary: photo.isPrimary,
      processingStatus: photo.processingStatus,
      width: photo.width,
      height: photo.height,
      url: ready
        ? await this.files.createDownloadUrl(this.files.publicBucket, photo.storageKey)
        : null,
      previewUrl:
        ready && photo.previewKey
          ? await this.files.createDownloadUrl(this.files.publicBucket, photo.previewKey)
          : null,
    };
  }
}
