import { prisma } from '../src/db';

// DESTRUCTIVE: wipes all ratings, rides and users, then re-seeds demo accounts.
// Only run this when you deliberately want a clean slate.
async function main() {
  await prisma.rating.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.ride.deleteMany();
  await prisma.user.deleteMany();
  console.log('Wiped all ratings, rides and users.');
  await import('./seed');
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
