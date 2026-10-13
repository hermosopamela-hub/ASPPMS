// Everything one signed-in person may see, in a single answer. The browser app loads this once
// after sign-in and again after each change, then reads from it.
const prisma = require('../db');
const { can } = require('../domain/permissions');
const suppliersQ = require('../queries/suppliers');
const materialsQ = require('../queries/materials');
const purchasesQ = require('../queries/purchases');
const alertsQ = require('../queries/alerts');
const settingsQ = require('../queries/settings');
const auditQ = require('../queries/audit');
const users = require('./users');

// Each list is included only when the role may view it, otherwise it is an empty list.
async function build(user) {
  const allow = (permission, load) => (can(user.role, permission) ? load() : Promise.resolve([]));
  const [settings, suppliers, materials, purchases, priceHistory, alerts, importHistory, auditLogs, accounts] = await Promise.all([
    settingsQ.get(prisma),
    allow('VIEW_SUPPLIERS', () => suppliersQ.list(prisma)),
    allow('VIEW_MATERIALS', () => materialsQ.list(prisma)),
    allow('VIEW_PURCHASES', () => purchasesQ.list(prisma)),
    allow('VIEW_MATERIALS', () => purchasesQ.listHistory(prisma)),
    allow('VIEW_DASHBOARD', () => alertsQ.list(prisma)),
    allow('IMPORT_DATA', () => auditQ.listImports(prisma)),
    allow('VIEW_AUDIT_LOGS', () => auditQ.listAudit(prisma, 500)),
    allow('MANAGE_USERS', () => users.listUsers()),
  ]);
  return { settings, suppliers, materials, purchases, priceHistory, alerts, importHistory, auditLogs, users: accounts };
}

module.exports = { build };
