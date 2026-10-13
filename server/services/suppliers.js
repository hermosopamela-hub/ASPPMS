// Supplier master: create, edit, remove. Scores are never taken from an edit; the scoring engine owns them.
const crypto = require('crypto');
const prisma = require('../db');
const { HttpError } = require('../lib/http');
const { SUPPLIER_STATUSES } = require('../domain/constants');
const suppliersQ = require('../queries/suppliers');
const audit = require('./audit');
const scoring = require('./scoring');

const COMPUTED = ['overallScore', 'ratingTier', 'deliveryScore', 'qualityScore', 'priceScore', 'totalOrdersCount', 'totalSpend'];

function validate(input) {
  if (!input || typeof input !== 'object') throw new HttpError(400, 'Missing supplier data.');
  if (!String(input.supplierName || '').trim()) throw new HttpError(400, 'Supplier name is required.');
  if (!String(input.supplierCode || '').trim()) throw new HttpError(400, 'Supplier code is required.');
  if (input.status && !SUPPLIER_STATUSES.includes(input.status)) throw new HttpError(400, 'Unknown supplier status.');
}

// Used inside a transaction by the imports too.
async function saveIn(db, actor, input) {
  validate(input);
  const id = String(input.id || `SUP-${crypto.randomBytes(4).toString('hex').toUpperCase()}`);
  const existing = await suppliersQ.exists(db, id);
  const data = { ...input };
  if (existing) for (const f of COMPUTED) delete data[f];

  // checked here, not left to the database, so a bad row does not abort a whole import
  const sameCode = await suppliersQ.find(db, String(input.supplierCode).trim());
  if (sameCode && sameCode.id !== id) throw new HttpError(409, `Supplier code ${input.supplierCode} is already used.`);

  const saved = await suppliersQ.upsert(db, id, data);
  await audit.log(
    { user: actor, action: existing ? 'UPDATE' : 'CREATE', module: 'Suppliers', recordId: id, details: `${existing ? 'Updated supplier profile' : 'Created supplier record'}: ${saved.supplierName}` },
    db
  );
  // responsiveness and compliance feed the overall score
  await scoring.recalculate(db, [id]);
  return suppliersQ.find(db, id);
}

const save = (actor, input) => prisma.$transaction((tx) => saveIn(tx, actor, input));

// A data import: rows that break a rule are reported and skipped, the rest are saved.
async function saveMany(actor, items) {
  return prisma.$transaction(async (tx) => {
    const saved = [];
    const errors = [];
    for (const [index, item] of items.entries()) {
      try {
        saved.push(await saveIn(tx, actor, item));
      } catch (err) {
        if (!(err instanceof HttpError)) throw err;
        errors.push({ index, message: err.message });
      }
    }
    return { saved, errors };
  }, { timeout: 120000 });
}

// A supplier with purchase history is deactivated instead of deleted, so the history keeps its owner.
async function remove(actor, id) {
  return prisma.$transaction(async (tx) => {
    const supplier = await suppliersQ.find(tx, id);
    if (!supplier) throw new HttpError(404, 'Supplier not found.');
    if ((await suppliersQ.purchaseCount(tx, supplier.id)) > 0) {
      await suppliersQ.patch(tx, supplier.id, { status: 'INACTIVE' });
      await audit.log({ user: actor, action: 'UPDATE', module: 'Suppliers', recordId: supplier.id, details: `Deactivated supplier ${supplier.supplierName} (has purchase history)` }, tx);
      return { deleted: false, deactivated: true };
    }
    await suppliersQ.remove(tx, supplier.id);
    await audit.log({ user: actor, action: 'DELETE', module: 'Suppliers', recordId: supplier.id, details: `Removed supplier ${supplier.supplierName}` }, tx);
    return { deleted: true, deactivated: false };
  });
}

module.exports = { list: () => suppliersQ.list(prisma), save, saveMany, saveIn, remove };
