// Recalculates supplier scorecards from the purchase history, using the weights in the settings.
const prisma = require('../db');
const { scoreSupplier } = require('../domain/scoring');
const suppliersQ = require('../queries/suppliers');
const purchasesQ = require('../queries/purchases');
const settingsQ = require('../queries/settings');
const audit = require('./audit');

// Rescores `supplierIds` (all suppliers when omitted). Suppliers without purchases keep their scores.
async function recalculate(db, supplierIds) {
  const [settings, suppliers, purchases] = await Promise.all([settingsQ.get(db), suppliersQ.list(db), purchasesQ.list(db)]);
  const wanted = supplierIds ? new Set(supplierIds) : null;

  for (const supplier of suppliers) {
    if (wanted && !wanted.has(supplier.id)) continue;
    const own = purchases.filter((p) => p.supplierId === supplier.id);
    if (own.length === 0) continue;
    await suppliersQ.updateScores(db, supplier.id, scoreSupplier(supplier, own, purchases, settings.weights));
  }
}

async function recalculateAll(actor = audit.SYSTEM) {
  await prisma.$transaction(async (tx) => {
    await recalculate(tx);
    await audit.log({ user: actor, action: 'UPDATE', module: 'Scoring Engine', recordId: 'ALL', details: 'Recalculated all supplier scorecards' }, tx);
  });
}

module.exports = { recalculate, recalculateAll };
