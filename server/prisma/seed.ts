import bcrypt from 'bcryptjs';
import { prisma } from '../src/db';

// Seeds the demo users for the Pakistan ride-booking prototype.
//
// This is IDEMPOTENT and NON-DESTRUCTIVE: it upserts the demo accounts and never
// deletes rides, ratings or other users. Running it again (e.g. via db:setup)
// is safe and will NOT wipe your ride history.
//
// If you ever *want* a full reset, run:  npm run db:reset -w server
async function main() {
  const password = await bcrypt.hash('password', 10);
  const riders = [
    { email: 'alice@rider.com', name: 'Ayesha Khan' },
    { email: 'bob@rider.com', name: 'Bilal Ahmed' },
  ];

  const drivers = [
    { email: 'dan@driver.com', name: 'Danish Malik', vehicle: 'Toyota Corolla · LEA-4823' },
    { email: 'eve@driver.com', name: 'Imran Farooq', vehicle: 'Suzuki Cultus · AJK-1190' },
    { email: 'sam@driver.com', name: 'Saad Riaz', vehicle: 'Honda City · ICT-7654' },
  ];

  for (const r of riders) {
    await prisma.user.upsert({
      where: { email: r.email },
      update: { name: r.name, password },
      create: { ...r, password, role: 'RIDER' },
    });
  }
  for (const d of drivers) {
    await prisma.user.upsert({
      where: { email: d.email },
      update: { name: d.name, vehicle: d.vehicle, password },
      create: { ...d, password, role: 'DRIVER', isOnline: false },
    });
  }
  await prisma.user.upsert({
    where: { email: 'admin@rideshare.com' },
    update: { password },
    create: { email: 'admin@rideshare.com', name: 'Admin', password, role: 'ADMIN' },
  });

  console.log('Ensured 2 riders, 3 drivers and 1 admin exist. Password for all: "password"');
  console.log('(Existing rides & ratings were left untouched.)');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
