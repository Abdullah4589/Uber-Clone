import { prisma } from './db';
import type { UserPublic } from '@uber-clone/shared';

export async function avgRatingFor(userId: string): Promise<number | null> {
  const agg = await prisma.rating.aggregate({
    where: { toId: userId },
    _avg: { stars: true },
  });
  const v = agg._avg.stars;
  return v == null ? null : Math.round(v * 10) / 10;
}

export async function toPublicUser(u: {
  id: string;
  email: string;
  name: string;
  role: string;
  isOnline: boolean;
  vehicle?: string | null;
}): Promise<UserPublic> {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role as UserPublic['role'],
    isOnline: u.isOnline,
    vehicle: u.vehicle ?? null,
    avgRating: await avgRatingFor(u.id),
  };
}
