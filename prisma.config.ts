import { defineConfig } from 'prisma/config';

// Local development reads DATABASE_URL from .env; on Cloud Run it comes from the environment.
try {
  process.loadEnvFile('.env');
} catch {
  /* no .env file: use the real environment */
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  // `prisma generate` (run by npm install) does not touch the database, so it must work before a .env
  // exists. The placeholder is never used for real work: migrate.js and the server check DATABASE_URL first.
  datasource: { url: process.env.DATABASE_URL || 'postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder' },
});
