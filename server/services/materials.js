// Material master: create, edit, remove. A changed current price moves the previous price along with it.
const crypto = require('crypto');
const prisma = require('../db');
const { HttpError } = require('../lib/http');
const { priceMovement } = require('../domain/purchases');
const materialsQ = require('../queries/materials');
const suppliersQ = require('../queries/suppliers');
const audit = require('./audit');

function validate(input) {
  if (!input || typeof input !== 'object') throw new HttpError(400, 'Missing material data.');
  if (!String(input.materialName || '').trim()) throw new HttpError(400, 'Material name is required.');
  if (!String(input.materialCode || '').trim()) throw new HttpError(400, 'Material code is required.');
  for (const f of ['standardPrice', 'currentPrice']) {
    if (!(Number(input[f]) >= 0)) throw new HttpError(400, `${f === 'standardPrice' ? 'Standard' : 'Current'} price must be zero or more.`);
  }
}

async function saveIn(db, actor, input) {
  validate(input);
  const id = String(input.id || `MAT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`);
  const existing = await materialsQ.find(db, id);
  const data = { ...input, standardPrice: Number(input.standardPrice), currentPrice: Number(input.currentPrice) };

  if (existing && existing.id === id) {
    // price history fields belong to the purchasing flow: only a hand-edited current price changes them
    if (data.currentPrice !== existing.currentPrice) {
      data.previousPrice = existing.currentPrice;
      data.priceChangePct = priceMovement(data.currentPrice, existing.currentPrice).priceChangePct;
    } else {
      data.previousPrice = existing.previousPrice;
      data.priceChangePct = existing.priceChangePct;
    }
  } else {
    data.previousPrice = Number(input.previousPrice) || data.currentPrice;
    data.priceChangePct = Number(input.priceChangePct) || 0;
  }

  // keep the supplier name in step with the supplier master
  if (data.preferredSupplierId) {
    const supplier = await suppliersQ.find(db, data.preferredSupplierId);
    if (!supplier) throw new HttpError(400, 'The preferred supplier does not exist.');
    data.preferredSupplierId = supplier.id;
    data.preferredSupplierName = supplier.supplierName;
  } else {
    data.preferredSupplierId = null;
    data.preferredSupplierName = '';
  }

  // checked here, not left to the database, so a bad row does not abort a whole import
  const sameCode = await materialsQ.find(db, String(input.materialCode).trim());
  if (sameCode && sameCode.id !== id) throw new HttpError(409, `Material code ${input.materialCode} is already used.`);

  const saved = await materialsQ.upsert(db, id, data);
  const isUpdate = !!existing && existing.id === id;
  await audit.log(
    { user: actor, action: isUpdate ? 'UPDATE' : 'CREATE', module: 'Materials', recordId: id, details: `${isUpdate ? 'Updated' : 'Created'} material: ${saved.materialName}` },
    db
  );
  return saved;
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

async function remove(actor, id) {
  return prisma.$transaction(async (tx) => {
    const material = await materialsQ.find(tx, id);
    if (!material) throw new HttpError(404, 'Material not found.');
    if ((await materialsQ.purchaseCount(tx, material.id)) > 0) {
      await materialsQ.patch(tx, material.id, { isActive: false });
      await audit.log({ user: actor, action: 'UPDATE', module: 'Materials', recordId: material.id, details: `Deactivated material ${material.materialName} (has purchase history)` }, tx);
      return { deleted: false, deactivated: true };
    }
    await materialsQ.remove(tx, material.id);
    await audit.log({ user: actor, action: 'DELETE', module: 'Materials', recordId: material.id, details: `Removed material ${material.materialName} (${material.materialCode})` }, tx);
    return { deleted: true, deactivated: false };
  });
}

module.exports = { list: () => materialsQ.list(prisma), save, saveMany, saveIn, remove };
