import { UserRole } from '@prisma/client';
import * as argon2 from 'argon2';
import { PointRulesService } from '../database/point-rules.service';
import { PrismaService } from '../database/prisma.service';
import { AdminService } from './admin.service';

describe('AdminService', () => {
  const user = { create: jest.fn() };
  const amenity = { update: jest.fn() };
  const service = new AdminService(
    { user, amenity } as unknown as PrismaService,
    { amount: jest.fn().mockResolvedValue(500) } as unknown as PointRulesService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('creates an account with a hashed password, role, profile and welcome points', async () => {
    user.create.mockImplementation(async ({ data }: { data: { passwordHash: string } }) => ({ id: 'new-user', email: 'new@example.test', role: UserRole.MODERATOR, passwordHash: data.passwordHash }));
    await service.createUser({ email: ' New@Example.test ', displayName: 'New User', password: 'Password123', role: UserRole.MODERATOR });
    const data = user.create.mock.calls[0][0].data;
    expect(data.email).toBe('new@example.test');
    expect(data.role).toBe(UserRole.MODERATOR);
    expect(data.profile).toEqual({ create: { displayName: 'New User' } });
    expect(data.pointAccount.create.available).toBe(500);
    expect(await argon2.verify(data.passwordHash, 'Password123')).toBe(true);
    expect(data.passwordHash).not.toBe('Password123');
  });

  it('deactivates an amenity without deleting its property relations', async () => {
    amenity.update.mockResolvedValue({ id: 'amenity-id', isActive: false });
    await service.updateAmenity('amenity-id', { isActive: false });
    expect(amenity.update).toHaveBeenCalledWith({ where: { id: 'amenity-id' }, data: { isActive: false } });
  });
});
