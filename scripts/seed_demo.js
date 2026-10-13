// Loads the demo data set and four demo accounts (one per role). Run: npm run seed:demo
// For local development only: it replaces ALL business data. It refuses to touch a database that
// is not on this computer unless you pass --allow-remote.
const path = require('path');

try {
  process.loadEnvFile(path.join(__dirname, '..', '.env'));
} catch {
  /* no .env file: use the real environment */
}

const prisma = require('../server/db');
const demo = require('../server/seed/data.json');
const { replaceAll } = require('../server/seed/load');
const { hashPassword } = require('../server/lib/passwords');
const { toDate } = require('../server/lib/serialize');

// Demo passwords, set from DEMO_PASSWORD when given. They meet the password rules.
const DEMO_PASSWORDS = {
  'purchasing.manager@ipi.ph': 'manager@2026',
  'assistant.manager@ipi.ph': 'asst.mgr@2026',
  'purchasing.analyst@ipi.ph': 'analyst@2026',
  'admin.procure@ipi.ph': 'admin@ipi2026',
};

function isLocal(url) {
  try {
    return ['localhost', '127.0.0.1', '[::1]', '::1'].includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

(async () => {
  if (!isLocal(process.env.DATABASE_URL) && !process.argv.includes('--allow-remote')) {
    throw new Error('DATABASE_URL is not a local database. Pass --allow-remote if you really mean it.');
  }

  await prisma.$transaction(
    async (tx) => {
      await replaceAll(tx, demo);
      for (const u of demo.users) {
        const password = process.env.DEMO_PASSWORD || DEMO_PASSWORDS[u.email] || 'welcome@2026';
        const data = {
          displayName: u.displayName, role: u.role, status: u.status, department: u.department || '',
          passwordHash: await hashPassword(password), mustChangePassword: false, failedAttempts: 0, lockedUntil: null, createdAt: toDate(u.createdAt) || new Date(),
        };
        await tx.user.upsert({ where: { id: u.uid }, create: { id: u.uid, email: u.email, ...data }, update: { email: u.email, ...data } });
      }
    },
    { timeout: 120000 }
  );

  console.log(
    `Demo data loaded: ${demo.suppliers.length} suppliers, ${demo.materials.length} materials, ${demo.purchases.length} purchase orders, ${demo.users.length} demo accounts.`
  );
})()
  .catch((err) => {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
