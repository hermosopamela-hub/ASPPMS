// Brings the database up to date with prisma/schema.prisma. Run: npm run migrate
// Also runs automatically before the web app starts (see Dockerfile) and before the data loaders.
//
// A database created before Prisma (tables exist, no migration history) is baselined first:
// the first migration is marked as already applied instead of trying to create the tables again.
const { spawnSync } = require('child_process');
const path = require('path');
const { Client } = require('pg');

try {
  process.loadEnvFile(path.join(__dirname, '..', '.env'));
} catch {
  /* no .env file: use the real environment */
}

const root = path.join(__dirname, '..');
const prisma = (...args) =>
  spawnSync(process.execPath, [require.resolve('prisma/build/index.js'), ...args], { cwd: root, stdio: 'inherit', env: process.env });

async function needsBaseline() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const { rows } = await client.query(
      `SELECT to_regclass('public._prisma_migrations') IS NOT NULL AS has_history,
              to_regclass('public.suppliers') IS NOT NULL AS has_tables`
    );
    return !rows[0].has_history && rows[0].has_tables;
  } finally {
    await client.end();
  }
}

(async () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set.');
  if (await needsBaseline()) {
    console.log('Existing database without migration history: marking the first migration as applied.');
    if (prisma('migrate', 'resolve', '--applied', '00000000000000_init').status !== 0) process.exit(1);
  }
  process.exit(prisma('migrate', 'deploy').status ?? 1);
})().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
