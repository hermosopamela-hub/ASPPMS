let PrismaClient;
try {
  ({ PrismaClient } = require('@prisma/client'));
} catch (err) {
  // the client is generated from prisma/schema.prisma; npm install normally does it
  if (/\.prisma\/client/.test(String(err.message))) {
    throw new Error('The database client has not been generated yet. Run:  npm run db:generate');
  }
  throw err;
}
const { PrismaPg } = require('@prisma/adapter-pg');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Copy .env.example to .env for local dev.');
}

// Cloud Run: DATABASE_URL comes from Secret Manager and uses the /cloudsql/... socket.
// Local:     DATABASE_URL points at 127.0.0.1:5432 (or the Cloud SQL Auth Proxy).
// A small tier allows few connections across ALL Cloud Run instances, so lower POOL_MAX
// (or cap --max-instances) if you stay on it.
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.POOL_MAX) || 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000,
});

const prisma = new PrismaClient({ adapter });

module.exports = prisma;
