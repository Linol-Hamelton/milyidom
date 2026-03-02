/**
 * seed-clear.ts
 *
 * Удаляет ТОЛЬКО тестовые данные, созданные seed.ts.
 * Реальные данные пользователей и объявления контент-менеджеров НЕ затрагиваются.
 *
 * Идентификация тестовых данных:
 *   - Объявления: ID начинается на "seed_"
 *   - Пользователи: email из SEED_USER_EMAILS
 *
 * Запуск: npx pnpm seed:clear  (из директории apps/backend)
 *    или:  npx ts-node --transpile-only prisma/seed-clear.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SEED_LISTING_ID_PREFIX = 'seed_';

const SEED_USER_EMAILS = [
  'host@example.com',
  'host2@example.com',
  'guest@example.com',
  'admin@example.com',
];

async function main() {
  console.log('\n🗑  Clearing seed (test) data from "Милый Дом" database...\n');

  // ── 1. Find seed listing IDs ─────────────────────────────────────────────
  const seedListings = await prisma.listing.findMany({
    where: { id: { startsWith: SEED_LISTING_ID_PREFIX } },
    select: { id: true },
  });
  const seedListingIds = seedListings.map((l) => l.id);
  console.log(`Found ${seedListingIds.length} seed listing(s): ${seedListingIds.join(', ') || '—'}`);

  // ── 2. Find seed user IDs ────────────────────────────────────────────────
  const seedUsers = await prisma.user.findMany({
    where: { email: { in: SEED_USER_EMAILS } },
    select: { id: true, email: true },
  });
  const seedUserIds = seedUsers.map((u) => u.id);
  console.log(
    `Found ${seedUsers.length} seed user(s): ${seedUsers.map((u) => u.email).join(', ') || '—'}`,
  );

  if (seedListingIds.length === 0 && seedUserIds.length === 0) {
    console.log('\n✅  Nothing to clear — database is already clean.\n');
    return;
  }

  // ── 3. Delete in dependency order ────────────────────────────────────────
  //
  // The order matters: child records must be deleted before parents.
  // We delete by seed listing IDs *and* by seed user IDs to cover
  // any orphaned records (e.g. notifications for seed users).

  const listingWhere = seedListingIds.length > 0 ? { listingId: { in: seedListingIds } } : { listingId: { in: [] as string[] } };
  const userWhere = seedUserIds.length > 0 ? { userId: { in: seedUserIds } } : { userId: { in: [] as string[] } };

  // Notifications (for seed users)
  const { count: notifCount } = await prisma.notification.deleteMany({ where: userWhere });
  console.log(`  deleted ${notifCount} notification(s)`);

  // Messages & Conversations linked to seed listings
  if (seedListingIds.length > 0) {
    const convIds = (
      await prisma.conversation.findMany({
        where: { listingId: { in: seedListingIds } },
        select: { id: true },
      })
    ).map((c) => c.id);

    if (convIds.length > 0) {
      const { count: msgCount } = await prisma.message.deleteMany({
        where: { conversationId: { in: convIds } },
      });
      console.log(`  deleted ${msgCount} message(s)`);
      const { count: convCount } = await prisma.conversation.deleteMany({
        where: { id: { in: convIds } },
      });
      console.log(`  deleted ${convCount} conversation(s)`);
    }
  }

  // Reviews linked to seed listings
  const { count: reviewCount } = await prisma.review.deleteMany({ where: listingWhere });
  console.log(`  deleted ${reviewCount} review(s)`);

  // Payments linked to bookings of seed listings
  if (seedListingIds.length > 0) {
    const bookingIds = (
      await prisma.booking.findMany({
        where: { listingId: { in: seedListingIds } },
        select: { id: true },
      })
    ).map((b) => b.id);

    if (bookingIds.length > 0) {
      const { count: payCount } = await prisma.payment.deleteMany({
        where: { bookingId: { in: bookingIds } },
      });
      console.log(`  deleted ${payCount} payment(s)`);
    }
  }

  // Bookings linked to seed listings
  const { count: bookingCount } = await prisma.booking.deleteMany({ where: listingWhere });
  console.log(`  deleted ${bookingCount} booking(s)`);

  // Favorites
  const { count: favCount } = await prisma.favorite.deleteMany({ where: listingWhere });
  console.log(`  deleted ${favCount} favorite(s)`);

  // Listing images & amenities
  const { count: imgCount } = await prisma.propertyImage.deleteMany({ where: listingWhere });
  console.log(`  deleted ${imgCount} property image(s)`);

  const { count: amenCount } = await prisma.listingAmenity.deleteMany({ where: listingWhere });
  console.log(`  deleted ${amenCount} listing amenity link(s)`);

  // Listings themselves
  const { count: listingCount } = await prisma.listing.deleteMany({
    where: { id: { startsWith: SEED_LISTING_ID_PREFIX } },
  });
  console.log(`  deleted ${listingCount} listing(s)`);

  // Seed users (profiles cascade via schema onDelete: Cascade)
  const { count: userCount } = await prisma.user.deleteMany({
    where: { email: { in: SEED_USER_EMAILS } },
  });
  console.log(`  deleted ${userCount} user(s)\n`);

  console.log('✅  Seed data cleared. Real user data is untouched.\n');
}

main()
  .catch((e) => {
    console.error('seed-clear failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
