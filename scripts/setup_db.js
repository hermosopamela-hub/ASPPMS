// Creates the database user and the database named in .env. Run: npm run setup:db
// Needs the password of the PostgreSQL administrator ("postgres") that you chose when installing
// PostgreSQL. Nothing is stored. If the database already works, it does nothing.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { createPrompter } = require('./prompt');

const envFile = path.join(__dirname, '..', '.env');
try {
  process.loadEnvFile(envFile);
} catch {
  /* handled below */
}

// "postgres" role names and database names we create must be plain identifiers.
const quoteIdent = (name) => `"${String(name).replace(/"/g, '""')}"`;
const quoteLiteral = (value) => `'${String(value).replace(/'/g, "''")}'`;

async function canConnect(url) {
  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    await client.query('SELECT 1');
    return true;
  } catch {
    return false;
  } finally {
    await client.end().catch(() => {});
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('There is no .env file with a DATABASE_URL yet. Run first:  npm run setup:env');
    process.exitCode = 1;
    return;
  }

  const url = new URL(process.env.DATABASE_URL);
  const appUser = decodeURIComponent(url.username);
  const appPassword = decodeURIComponent(url.password);
  const dbName = decodeURIComponent(url.pathname.slice(1));
  const host = url.hostname;
  const port = url.port || '5432';

  if (await canConnect(process.env.DATABASE_URL)) {
    console.log(`The database "${dbName}" already works for user "${appUser}". Nothing to do.`);
    if (!process.env.ASPPM_SETUP) console.log('\nNext step:  npm run migrate');
    return;
  }

  console.log(`\nThis creates the user "${appUser}" and the database "${dbName}" on ${host}:${port}.`);
  console.log('PostgreSQL asks for its administrator password to do that: the one you chose when you installed PostgreSQL.\n');

  const p = createPrompter();
  const adminUser = process.env.PG_ADMIN_USER || (await p.ask('Administrator user [postgres]: ')).trim() || 'postgres';
  // setup.ps1 passes the password it just set, so a new install does not ask for it twice
  const adminPassword = process.env.PG_ADMIN_PASSWORD || (await p.ask('Administrator password (you will not see it as you type): ', { hidden: true }));
  p.close();

  const admin = new Client({ host, port: Number(port), user: adminUser, password: adminPassword, database: 'postgres' });
  try {
    await admin.connect();
  } catch (err) {
    console.error(`\nCould not sign in to PostgreSQL as "${adminUser}": ${err.message}`);
    console.error('Check that PostgreSQL is running and that the administrator password is right.');
    process.exitCode = 1;
    return;
  }

  try {
    const role = await admin.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [appUser]);
    if (appUser === adminUser) {
      console.log(`"${appUser}" is the administrator account, so its password is left alone.`);
    } else if (role.rowCount === 0) {
      await admin.query(`CREATE USER ${quoteIdent(appUser)} WITH PASSWORD ${quoteLiteral(appPassword)} CREATEDB`);
      console.log(`Created user "${appUser}".`);
    } else {
      // the user exists but could not sign in: its password is not the one in .env
      await admin.query(`ALTER USER ${quoteIdent(appUser)} WITH PASSWORD ${quoteLiteral(appPassword)} CREATEDB`);
      console.log(`User "${appUser}" already existed. Its password now matches your .env.`);
    }

    const db = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (db.rowCount === 0) {
      await admin.query(`CREATE DATABASE ${quoteIdent(dbName)} OWNER ${quoteIdent(appUser)}`);
      console.log(`Created database "${dbName}".`);
    } else {
      console.log(`Database "${dbName}" already existed.`);
    }
  } finally {
    await admin.end();
  }

  if (await canConnect(process.env.DATABASE_URL)) {
    console.log('\nThe app can now connect to its database.');
    if (!process.env.ASPPM_SETUP) console.log('\nNext step:  npm run migrate');
  } else {
    console.error('\nThe user and database exist, but the app still cannot connect. Check DATABASE_URL in .env.');
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('Database setup failed:', err.message);
  process.exitCode = 1;
});
