// Creates the .env file for you. Run: npm run setup:env
// Asks a few questions, generates a random SESSION_SECRET, and writes .env.
// It never overwrites an existing .env unless you pass --force.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { passwordProblem } = require('../server/lib/passwords');
const { createPrompter } = require('./prompt');

const args = process.argv.slice(2);
const force = args.includes('--force');
const outIndex = args.indexOf('--out');
const target = outIndex >= 0 ? path.resolve(args[outIndex + 1]) : path.join(__dirname, '..', '.env');

// A long random string for signing session cookies: 64 hex characters (256 bits).
const newSecret = () => crypto.randomBytes(32).toString('hex');

async function main() {
  if (args.includes('--secret-only')) {
    console.log(newSecret());
    return;
  }

  if (fs.existsSync(target) && !force) {
    console.log(`${path.basename(target)} already exists, so nothing was changed.`);
    console.log('To start over, run:  npm run setup:env -- --force');
    console.log('To get just a new random secret to paste in:  npm run secret');
    return;
  }

  const p = createPrompter();
  console.log('\nThis writes your .env file. Press Enter to accept the value shown in [brackets].\n');

  const dbUser = (await p.ask('Database user [asppm_app]: ')).trim() || 'asppm_app';
  let dbPassword = '';
  while (!dbPassword) {
    dbPassword = await p.ask('Choose a password for that database user (you will not see it as you type): ', { hidden: true });
    if (!dbPassword) console.log('  A password is required.');
  }
  const dbName = (await p.ask('Database name [asppm]: ')).trim() || 'asppm';
  const dbPort = (await p.ask('PostgreSQL port [5432]: ')).trim() || '5432';
  const port = (await p.ask('Port for the website [8080]: ')).trim() || '8080';
  const adminEmail = ((await p.ask('First administrator email [admin@ipi.ph]: ')).trim() || 'admin@ipi.ph').toLowerCase();

  let adminPassword = '';
  for (;;) {
    adminPassword = await p.ask('Temporary password for that administrator (at least 6 characters, letters and a number): ', { hidden: true });
    const problem = passwordProblem(adminPassword, adminEmail.split('@')[0]);
    if (!problem) break;
    console.log(`  ${problem}`);
  }
  p.close();

  const url = `postgresql://${encodeURIComponent(dbUser)}:${encodeURIComponent(dbPassword)}@127.0.0.1:${dbPort}/${dbName}`;
  const env = [
    '# Created by npm run setup:env. Never commit this file.',
    `DATABASE_URL=${url}`,
    `PORT=${port}`,
    '',
    '# The first administrator is created only when there are no users yet.',
    '# The password is temporary: it must be changed at the first sign-in.',
    `ADMIN_EMAIL=${adminEmail}`,
    `ADMIN_PASSWORD=${adminPassword}`,
    '',
    '# Signs the session cookie. Changing it signs everybody out.',
    `SESSION_SECRET=${newSecret()}`,
    '',
  ].join('\n');

  fs.writeFileSync(target, env, { mode: 0o600 });
  console.log(`\nCreated ${target}`);
  console.log('A random SESSION_SECRET was generated for you.');
  if (!process.env.ASPPM_SETUP) console.log('\nNext step:  npm run setup:db');
}

main().catch((err) => {
  console.error('Could not create .env:', err.message);
  process.exitCode = 1;
});
