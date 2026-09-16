import { ConfigService } from '@nestjs/config';
import {
  AvailabilityType,
  FileProcessingStatus,
  PropertyStatus,
  PropertyType,
  UserRole,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { FilesService } from '../files/files.service';
import { ModerationAction } from '../moderation/dto/moderation-decision.dto';
import { ModerationService } from '../moderation/moderation.service';
import { PrismaService } from '../database/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { PropertyAvailabilityService } from './property-availability.service';
import { PropertiesService } from './properties.service';

describe('Property lifecycle integration', () => {
  const prisma = new PrismaService();
  const files = {
    publicBucket: 'test-public',
    createDownloadUrl: jest.fn(async (_bucket: string, key: string) => `https://files.test/${key}`),
  } as unknown as FilesService;
  const realtime = { requestNotificationsRefresh: jest.fn() } as unknown as RealtimeService;
  const properties = new PropertiesService(
    prisma,
    files,
    new ConfigService({ INCLUDE_FAKE_PROPERTIES: 'true' }),
    realtime,
  );
  const availability = new PropertyAvailabilityService(prisma);
  const moderation = new ModerationService(prisma, files, realtime);
  const testRun = randomUUID();
  let ownerId: string;
  let moderatorId: string;
  let propertyId: string;

  beforeAll(async () => {
    await prisma.$connect();
    await cleanupStaleIntegrationUsers();
    const [owner, moderator] = await Promise.all([
      prisma.user.create({
        data: {
          email: `property-owner-${testRun}@example.test`,
          passwordHash: 'integration-test',
          emailVerified: true,
          role: UserRole.USER,
          profile: { create: { displayName: 'Integration Owner' } },
        },
      }),
      prisma.user.create({
        data: {
          email: `property-moderator-${testRun}@example.test`,
          passwordHash: 'integration-test',
          emailVerified: true,
          role: UserRole.MODERATOR,
          profile: { create: { displayName: 'Integration Moderator' } },
        },
      }),
    ]);
    ownerId = owner.id;
    moderatorId = moderator.id;
  });

  afterAll(async () => {
    try {
      await cleanupUsers([ownerId, moderatorId].filter(Boolean));
    } finally {
      await prisma.$disconnect();
    }
  });

  it('passes draft, correction, remoderation and publication', async () => {
    const draft = await properties.createDraft(ownerId, {
      title: 'Светлый дом у моря',
      description: 'Уютный дом с большой террасой, тихим садом и всем необходимым для семейной поездки.',
      type: PropertyType.HOUSE,
      areaSqm: 120,
      roomsCount: 4,
      bedroomsCount: 3,
      bedsCount: 4,
      maxGuests: 6,
      hasElevator: false,
      allowsChildren: true,
      allowsPets: true,
      acceptsPoints: true,
      acceptsDirect: true,
      pointsPerNight: 140,
      minNights: 2,
      maxNights: 21,
      address: { country: 'Россия', region: 'Краснодарский край', city: 'Сочи' },
      rule: { smokingAllowed: false, eventsAllowed: false },
      amenityIds: [],
    });
    propertyId = draft.id;
    expect(draft.status).toBe(PropertyStatus.DRAFT);

    const autosaved = await properties.update(ownerId, propertyId, {
      title: 'Светлый семейный дом у моря',
    });
    expect(autosaved.title).toBe('Светлый семейный дом у моря');

    await prisma.propertyPhoto.create({
      data: {
        propertyId,
        storageKey: `integration/${testRun}/photo.webp`,
        externalUrl: `https://images.example.test/${testRun}.webp`,
        mimeType: 'image/webp',
        sizeBytes: 1024,
        processingStatus: FileProcessingStatus.READY,
        isPrimary: true,
      },
    });
    const period = await availability.create(ownerId, propertyId, {
      startsOn: futureDate(30),
      endsOn: futureDate(60),
      type: AvailabilityType.BOTH,
      minNights: 2,
      maxNights: 14,
      pointsPerNight: 140,
      maxGuests: 6,
      isFlexible: true,
    });
    expect(period.type).toBe(AvailabilityType.BOTH);

    const firstSubmission = await properties.submit(ownerId, propertyId);
    expect(firstSubmission.status).toBe(PropertyStatus.PENDING_MODERATION);
    expect(await prisma.notification.findFirst({
      where: {
        userId: moderatorId,
        type: 'PROPERTY_MODERATION_QUEUE',
        title: 'Объявление отправлено на модерацию',
      },
    })).toMatchObject({
      body: '«Светлый семейный дом у моря» ожидает проверки',
      link: '/admin/moderation',
    });
    expect(realtime.requestNotificationsRefresh).toHaveBeenCalledWith(moderatorId);
    const queueNotificationsBeforeRepeatedSubmit = await prisma.notification.count({
      where: { userId: moderatorId, type: 'PROPERTY_MODERATION_QUEUE' },
    });
    await expect(properties.submit(ownerId, propertyId)).rejects.toThrow('Объявление уже на модерации');
    expect(await prisma.notification.count({
      where: { userId: moderatorId, type: 'PROPERTY_MODERATION_QUEUE' },
    })).toBe(queueNotificationsBeforeRepeatedSubmit);
    await expect(properties.update(ownerId, propertyId, { title: 'Нельзя изменить' })).rejects.toThrow(
      'Нельзя менять объявление во время модерации',
    );

    const notificationsBeforeInvalidDecision = await prisma.notification.count({ where: { userId: ownerId } });
    await expect(moderation.decide(moderatorId, propertyId, {
      action: ModerationAction.REQUEST_CHANGES,
    })).rejects.toThrow('Укажите причину решения');
    expect(await prisma.notification.count({ where: { userId: ownerId } })).toBe(notificationsBeforeInvalidDecision);

    const correction = await moderation.decide(moderatorId, propertyId, {
      action: ModerationAction.REQUEST_CHANGES,
      comment: 'Добавьте больше деталей о районе',
    });
    expect(correction.status).toBe(PropertyStatus.CHANGES_REQUESTED);
    expect(await prisma.notification.findFirst({
      where: { userId: ownerId, type: 'PROPERTY_MODERATION', title: 'Нужны изменения в объявлении' },
    })).toMatchObject({ body: 'Добавьте больше деталей о районе' });

    const corrected = await properties.update(ownerId, propertyId, {
      description: 'Уютный дом с большой террасой, тихим садом, пешей дорогой к морю и подробными советами по лучшим местам района.',
    });
    expect(corrected.status).toBe(PropertyStatus.CHANGES_REQUESTED);

    await properties.submit(ownerId, propertyId);
    const approved = await moderation.decide(moderatorId, propertyId, {
      action: ModerationAction.APPROVE,
    });
    expect(approved.status).toBe(PropertyStatus.PUBLISHED);
    expect(await prisma.notification.findFirst({
      where: { userId: ownerId, type: 'PROPERTY_MODERATION', title: 'Объявление опубликовано' },
    })).toBeTruthy();
    expect(realtime.requestNotificationsRefresh).toHaveBeenCalledWith(ownerId);

    const publicProperty = await properties.getPublic(propertyId);
    expect(publicProperty.id).toBe(propertyId);
    expect(publicProperty.photos).toHaveLength(1);

    const editedPublished = await properties.update(ownerId, propertyId, { pointsPerNight: 150 });
    expect(editedPublished.status).toBe(PropertyStatus.DRAFT);
    await expect(properties.getPublic(propertyId)).rejects.toThrow('Объявление не найдено');
  });

  async function cleanupStaleIntegrationUsers() {
    const users = await prisma.user.findMany({
      where: {
        email: { startsWith: 'property-' },
        AND: { email: { endsWith: '@example.test' } },
      },
      select: { id: true },
    });
    await cleanupUsers(users.map(({ id }) => id));
  }

  async function cleanupUsers(userIds: string[]) {
    if (!userIds.length) return;
    await prisma.property.deleteMany({ where: { ownerId: { in: userIds } } });
    await prisma.propertyModerationDecision.deleteMany({ where: { moderatorId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
});

function futureDate(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
