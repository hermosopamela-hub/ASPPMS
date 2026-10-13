// One command that gets the project running, and is safe to run again at any time:
//   npm run setup                 asks before loading demo data, only when the database is empty
//   npm run setup -- --demo       load the demo data without asking (empty database only)
//   npm run setup -- --no-demo    never load demo data
//
// Every step first checks whether it is already done and skips itself if so:
//   1. Node version        2. database client       3. .env file          4. database and user
//   5. tables (migrate)    6. demo data (optional)  7. build the website
const { spawnSync } = require('child_process');
const path = require('path');
const { createPrompter } = require('./prompt');

const root = path.join(__dirname, '..');
const args = process.argv.slice(2);
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

let stepNo = 0;
const step = (title) => console.log(`\n[${++stepNo}/7] ${title}`);
const ok = (msg) => console.log(`      ok: ${msg}`);

function fail(message) {
  console.error(`\nSetup stopped: ${message}`);
  console.error('Fix that, then run  npm run setup  again. Steps that are already done are skipped.');
  process.exit(1);
}

// Runs a command with its output shown. Returns true on success.
// Steps that ask questions get the keyboard (interactive); the others must not touch it, or they
// could swallow answers meant for a later step.
function run(command, commandArgs, { interactive = false } = {}) {
  const stdio = [interactive ? 'inherit' : 'ignore', 'inherit', 'inherit'];
  const env = { ...process.env, ASPPM_SETUP: '1' }; // tells the sub-scripts they are part of the full setup
  // npm is a .cmd file on Windows and needs a shell; the command line is built here, so nothing is user input
  const result = command === npm
    ? spawnSync(`${npm} ${commandArgs.join(' ')}`, { cwd: root, stdio, shell: true, env })
    : spawnSync(command, commandArgs, { cwd: root, stdio, env });
  return result.status === 0;
}

function loadEnv() {
  try {
    process.loadEnvFile(path.join(root, '.env'));
    return true;
  } catch {
    return false;
  }
}

async function databaseState() {
  const { Client } = require('pg');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const { rows } = await client.query("SELECT to_regclass('public.suppliers') IS NOT NULL AS has_tables");
    if (!rows[0].has_tables) return { suppliers: 0 };
    const count = await client.query('SELECT count(*)::int AS n FROM suppliers');
    return { suppliers: count.rows[0].n };
  } finally {
    await client.end();
  }
}

async function main() {
  console.log('ASPPM setup. It is safe to run this again: finished steps are skipped.');

  step('Checking Node.js');
  const major = Number(process.versions.node.split('.')[0]);
  if (major < 20) fail(`Node.js ${process.versions.node} is too old. Install version 20 or newer (22 LTS recommended) from https://nodejs.org.`);
  ok(`Node.js ${process.versions.node}`);

  step('Preparing the database client');
  if (!run(npm, ['run', 'db:generate'])) fail('could not generate the database client. Run  npm install  first, then try again.');

  step('Settings file (.env)');
  if (loadEnv()) {
    ok('.env already exists, keeping it (to redo it: npm run setup:env -- --force)');
  } else {
    if (!run(process.execPath, ['scripts/setup_env.js'], { interactive: true })) fail('the .env file was not created.');
    if (!loadEnv()) fail('the .env file was not created.');
  }
  if (!process.env.DATABASE_URL) fail('.env has no DATABASE_URL. Delete .env and run  npm run setup  again.');

  step('Database and database user');
  if (!run(process.execPath, ['scripts/setup_db.js'], { interactive: true })) fail('the database could not be set up.');

  step('Creating the tables');
  if (!run(process.execPath, ['scripts/migrate.js'])) fail('the tables could not be created.');

  step('Demo data');
  const state = await databaseState();
  if (state.suppliers > 0) {
    ok(`the database already has data (${state.suppliers} suppliers), so nothing is loaded`);
  } else if (args.includes('--no-demo')) {
    ok('skipped (--no-demo). The first administrator is created when the app starts.');
  } else {
    let load = args.includes('--demo');
    if (!load) {
      const p = createPrompter();
      const answer = (await p.ask('      Load demo data and four demo accounts? Best for trying it out. [Y/n]: ')).trim().toLowerCase();
      p.close();
      load = answer === '' || answer.startsWith('y');
    }
    if (load) {
      if (!run(process.execPath, ['scripts/seed_demo.js'])) fail('the demo data could not be loaded.');
    } else {
      ok('skipped. The first administrator is created when the app starts.');
    }
  }

  step('Building the website');
  if (!run(npm, ['run', 'build'])) fail('the website could not be built.');

  const port = process.env.PORT || 8080;
  console.log('\nAll done. To start the app:\n');
  console.log('    npm run dev\n');
  console.log(`Then open http://localhost:${port}`);
  console.log('Sign-in details are in the README ("Sign in").\n');
}

main().catch((err) => fail(err.message));
