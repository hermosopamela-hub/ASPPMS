// Entry point: `npm start` runs this. The app itself is built in server/app.js.
try {
  process.loadEnvFile();
} catch {
  // on Cloud Run or production, env vars come from environment
}

const app = require('./server/app');
const { PORT } = require('./server/config');
const prisma = require('./server/db');
const users = require('./server/services/users');

const server = app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});

// Creates the first administrator if there are no users yet.
users.ensureFirstAdmin().catch((err) => console.error('Could not set up sign-in:', err));

// A failed query or a late rejection must not take the whole server down.
process.on('unhandledRejection', (err) => console.error('Unhandled rejection:', err));
process.on('uncaughtException', (err) => console.error('Uncaught exception:', err));

// Cloud Run sends SIGTERM before stopping an instance; `node --watch` sends it on every restart.
// Browsers keep idle connections open, so close those too or the shutdown would hang.
let stopping = false;
function shutdown() {
  if (stopping) return;
  stopping = true;
  setTimeout(() => process.exit(0), 5000).unref(); // hard stop if a query never finishes
  server.close();
  server.closeAllConnections();
  prisma.$disconnect().finally(() => process.exit(0));
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
