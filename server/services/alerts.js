// Alert workflow and the full rule scan.
const prisma = require('../db');
const { HttpError } = require('../lib/http');
const { ALERT_STATUSES } = require('../domain/constants');
const { scanForAlerts } = require('../domain/alerts');
const alertsQ = require('../queries/alerts');
const suppliersQ = require('../queries/suppliers');
const materialsQ = require('../queries/materials');
const purchasesQ = require('../queries/purchases');
const settingsQ = require('../queries/settings');
const auditQ = require('../queries/audit');
const audit = require('./audit');

async function updateStatus(actor, id, { status, resolution, assignedUser }) {
  if (!ALERT_STATUSES.includes(status)) throw new HttpError(400, 'Unknown alert status.');
  return prisma.$transaction(async (tx) => {
    if (!(await alertsQ.find(tx, id))) throw new HttpError(404, 'Alert not found.');
    const data = { status };
    if (resolution) data.resolution = String(resolution).slice(0, 2000);
    if (assignedUser) data.assignedUser = String(assignedUser).slice(0, 200);
    if (status === 'RESOLVED' || status === 'DISMISSED') data.resolvedAt = new Date();
    const updated = await alertsQ.update(tx, id, data);
    await audit.log({ user: actor, action: 'RESOLVE_ALERT', module: 'Alerts', recordId: id, details: `Updated alert ${id} to ${status}` }, tx);
    return updated;
  });
}

async function scan(actor) {
  return prisma.$transaction(async (tx) => {
    const [settings, suppliers, materials, purchases, alerts] = await Promise.all([
      settingsQ.get(tx), suppliersQ.list(tx), materialsQ.list(tx), purchasesQ.list(tx), alertsQ.list(tx),
    ]);
    const { alerts: created, scannedCount } = scanForAlerts({ suppliers, materials, purchases, alerts, settings });
    for (const a of created) await alertsQ.insert(tx, { ...a, id: auditQ.newId('ALT-SYS') });
    await audit.log(
      { user: actor, action: 'UPDATE', module: 'Alert Engine', recordId: 'GLOBAL_SCAN', details: `Automated rule scan completed: evaluated ${scannedCount} entities, generated ${created.length} new alerts.` },
      tx
    );
    return {
      scannedCount,
      alertsGenerated: created.length,
      summary: `Evaluated ${scannedCount} records across vendors, material catalogs, and recent lots. Generated ${created.length} alerts.`,
    };
  });
}

module.exports = { list: () => alertsQ.list(prisma), updateStatus, scan };
