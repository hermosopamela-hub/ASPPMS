// Imports ERP "Indirect PO" CSV exports. Additive: it never deletes or overwrites business data.
//
//   npm run import:erp                 import every .csv in data/erp_inbox/, then move it to data/erp_inbox/processed/
//   npm run import:erp -- --dry-run    show what would happen, change nothing, leave the files where they are
//   npm run import:erp -- --since 2026-01-01   every line is kept raw, but only lines from this date become suppliers/materials/POs
//   --force-large                      allow more than 25,000 POs into the app (it sends them all to the browser at once)
//   npm run import:erp -- --file path  import one file from anywhere (it is not moved)
//   npm run seed:erp                   import the sample file data/erp_po_dump.csv (safe to repeat)
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
try {
  process.loadEnvFile(path.join(root, '.env'));
} catch {
  /* no .env file: use the real environment */
}

// In the cloud DATA_DIR is the mounted bucket folder (for example /mnt/data/asppm); locally it is ./data
const INBOX = path.join(process.env.DATA_DIR || path.join(root, 'data'), 'erp_inbox');
const PROCESSED = path.join(INBOX, 'processed');
const SAMPLE = path.join(root, 'data', 'erp_po_dump.csv');

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);

function print(report) {
  const tag = report.dryRun ? ' (dry run, nothing written)' : '';
  console.log(`\n${report.fileName}${tag}`);
  console.log(`  rows in file ........ ${report.totalRows} (${report.validRows} valid, ${report.totalRows - report.validRows} rejected)`);
  console.log(`  raw ERP lines ....... ${report.rawNew} new, ${report.rawUpdated} updated`);
  if (report.since) console.log(`  app window .......... from ${report.since}: ${report.windowRows} lines (${report.outsideWindow} older lines stay in the raw table only)`);
  console.log(`  suppliers ........... ${report.suppliersNew} new`);
  console.log(`  materials ........... ${report.materialsNew} new`);
  console.log(`  purchase orders ..... ${report.dryRun ? report.purchasesNew : report.purchasesSaved} new, ${report.purchasesSkipped} already present`);
  report.warnings.forEach((w) => console.log(`  NOTE ${w}`));
  report.errors.slice(0, 20).forEach((e) => console.log(`  PROBLEM ${e.row ? `line ${e.row}: ` : ''}${e.message}`));
  if (report.errors.length > 20) console.log(`  ... and ${report.errors.length - 20} more (see Import History in the app)`);
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set. Run npm run setup:env first.');

  // make sure the erp_purchase_orders table exists
  const migrated = spawnSync(process.execPath, [path.join(__dirname, 'migrate.js')], { cwd: root, stdio: 'inherit', env: process.env });
  if (migrated.status !== 0) throw new Error('Database migration failed; nothing was imported.');

  const { importCsv } = require('../server/services/erpImport');
  const dryRun = flag('--dry-run');
  const since = option('--since');
  if (since && !/^\d{4}-\d{2}-\d{2}$/.test(since)) throw new Error('--since must look like 2026-01-01.');
  const forceLarge = flag('--force-large');

  let files;
  let move = false;
  if (flag('--seed')) {
    files = [SAMPLE];
  } else if (option('--file')) {
    files = [path.resolve(option('--file'))];
  } else {
    fs.mkdirSync(PROCESSED, { recursive: true });
    files = fs.readdirSync(INBOX).filter((f) => f.toLowerCase().endsWith('.csv')).sort().map((f) => path.join(INBOX, f));
    move = !dryRun;
    if (!files.length) {
      console.log(`No .csv files in ${INBOX}${path.sep}. Copy the ERP export there and run this again.`);
      return;
    }
  }

  let failed = 0;
  for (const file of files) {
    const name = path.basename(file);
    try {
      const report = await importCsv(fs.readFileSync(file, 'utf8'), name, { dryRun, since, forceLarge });
      print(report);
      if (move) {
        const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
        fs.renameSync(file, path.join(PROCESSED, `${stamp}_${name}`));
        console.log(`  moved to ${PROCESSED}${path.sep}`);
      }
    } catch (err) {
      failed++;
      console.error(`\n${name}: FAILED, file left in place. ${err.message}`);
    }
  }
  if (failed) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error('ERP import failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => require('../server/db').$disconnect());
