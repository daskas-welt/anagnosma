import { seedGenresForUser } from '@/lib/subjects/genres';

async function main() {
  const userId = process.argv[2];
  if (!userId) {
    console.error('Usage: tsx scripts/seed-genres.ts <clerk-user-id>');
    process.exit(1);
  }
  const created = await seedGenresForUser(userId);
  console.log(`Seeded ${created} genre subject(s) for user ${userId}.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
