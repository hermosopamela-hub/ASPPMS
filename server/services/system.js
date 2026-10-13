// Backup, restore and reset of the business data. User accounts are never part of a backup.
const prisma = require('../db');
const { HttpError } = require('../lib/http');
const suppliersQ = require('../queries/suppliers');
const materialsQ = require('../queries/materials');
const purchasesQ = require('../queries/purchases');
const alertsQ = require('../queries/alerts');
const auditQ = require('../queries/audit');
const settingsQ = require('../queries/settings');
const { replaceAll } = require('../seed/load');
const audit = require('./audit');

async function exportSnapshot() {
  const [suppliers, materials, purchases, priceHistory, alerts, auditLogs, settings] = await Promise.all([
    suppliersQ.list(prisma), materialsQ.list(prisma), purchasesQ.list(prisma), purchasesQ.listHistory(prisma),
    alertsQ.list(prisma), auditQ.listAudit(prisma, 5000), settingsQ.get(prisma),
  ]);
  return {
    system: 'Automated Supplier Performance and Price Monitoring System',
    version: '2.0.0-postgres',
    exportTimestamp: new Date().toISOString(),
    counts: { suppliers: suppliers.length, materials: materials.length, purchases: purchases.length, priceHistory: priceHistory.length, alerts: alerts.length, auditLogs: auditLogs.length },
    data: { suppliers, materials, purchases, priceHistory, alerts, auditLogs, settings },
  };
}

async function importSnapshot(actor, snapshot) {
  const data = snapshot?.data;
  if (!data) throw new HttpError(400, 'Invalid backup file structure. Missing "data" payload.');
  if (!Array.isArray(data.suppliers) || !Array.isArray(data.materials) || !Array.isArray(data.purchases)) {
    throw new HttpError(400, 'Backup file data integrity failed. Required entity arrays not present.');
  }
  try {
    await prisma.$transaction(
      async (tx) => {
        await replaceAll(tx, data);
        await audit.log({ user: actor, action: 'IMPORT', module: 'System Settings', recordId: 'DATABASE_RESTORE', details: 'Restored complete database state from backup snapshot.' }, tx);
      },
      { timeout: 120000 }
    );
  } catch (err) {
    if (err instanceof HttpError) throw err;
    // nothing is changed when the transaction fails
    throw new HttpError(400, `Failed to restore snapshot: ${String(err.message || err).split('\n').pop()}`);
  }
  return { success: true, message: `Successfully restored database: ${data.suppliers.length} suppliers, ${data.materials.length} materials, ${data.purchases.length} transactions restored.` };
}

async function resetToDemo(actor) {
  const demo = require('../seed/data.json');
  await prisma.$transaction(
    async (tx) => {
      await replaceAll(tx, demo);
      await audit.log({ user: actor, action: 'IMPORT', module: 'System Settings', recordId: 'DATABASE_RESET', details: 'Reset the database to the demo data set.' }, tx);
    },
    { timeout: 120000 }
  );
}

module.exports = { exportSnapshot, importSnapshot, resetToDemo };
