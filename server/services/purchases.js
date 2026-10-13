// Purchase orders. Saving one is the heart of the system: it derives the totals, records the price
// movement, updates the material price, rescores the supplier and raises alerts, all in one transaction.
const crypto = require('crypto');
const prisma = require('../db');
const { HttpError } = require('../lib/http');
const { OPEN_ALERT_STATUSES } = require('../domain/constants');
const { alertsForTransaction } = require('../domain/alerts');
const { derivePurchase, priceMovement } = require('../domain/purchases');
const purchasesQ = require('../queries/purchases');
const materialsQ = require('../queries/materials');
const suppliersQ = require('../queries/suppliers');
const alertsQ = require('../queries/alerts');
const settingsQ = require('../queries/settings');
const auditQ = require('../queries/audit');
const audit = require('./audit');
const scoring = require('./scoring');

function validate(input) {
  if (!input || typeof input !== 'object') throw new HttpError(400, 'Missing purchase order data.');
  if (!String(input.poNumber || '').trim()) throw new HttpError(400, 'PO number is required.');
  if (!input.poDate || Number.isNaN(new Date(input.poDate).getTime())) throw new HttpError(400, 'A valid PO date is required.');
  if (!input.requestedDeliveryDate) throw new HttpError(400, 'Requested delivery date is required.');
  if (!(Number(input.quantity) > 0)) throw new HttpError(400, 'Quantity must be more than zero.');
  if (!(Number(input.unitPrice) >= 0)) throw new HttpError(400, 'Unit price must be zero or more.');
  if (Number(input.acceptedQuantity || 0) + Number(input.rejectedQuantity || 0) > Number(input.receivedQuantity || 0)) {
    throw new HttpError(400, 'Accepted plus rejected quantity cannot be more than the quantity received.');
  }
}

// Applies one purchase order inside a transaction. Returns what changed so the caller can rescore once.
async function applyIn(tx, actor, input, settings) {
  validate(input);
  const [supplier, material] = await Promise.all([suppliersQ.find(tx, input.supplierId), materialsQ.find(tx, input.materialId)]);
  if (!supplier) throw new HttpError(400, `Supplier ${input.supplierId} does not exist.`);
  if (!material) throw new HttpError(400, `Material ${input.materialId} does not exist.`);

  const byPo = await purchasesQ.findByPoNumber(tx, input.poNumber);
  const id = String(input.id || `TX-${crypto.randomBytes(5).toString('hex').toUpperCase()}`);
  const existing = (await purchasesQ.find(tx, id)) || null;
  if (byPo && byPo.id !== id) throw new HttpError(409, `PO number ${input.poNumber} already exists.`);

  // names always come from the masters, never from the client
  const derived = derivePurchase({
    ...input,
    id,
    quantity: Number(input.quantity),
    unitPrice: Number(input.unitPrice),
    supplierId: supplier.id,
    supplierName: supplier.supplierName,
    materialId: material.id,
    materialCode: material.materialCode,
    materialName: material.materialName,
    currency: input.currency || material.currency,
  });
  const saved = await purchasesQ.upsert(tx, id, derived);
  await audit.log({ user: actor, action: existing ? 'UPDATE' : 'CREATE', module: 'Purchases', recordId: id, details: `${existing ? 'Updated' : 'Created'} PO ${saved.poNumber}` }, tx);

  let movement;
  if (!existing) {
    const previousPrice = material.currentPrice;
    movement = priceMovement(saved.unitPrice, previousPrice);
    await purchasesQ.insertHistory(tx, auditQ.newId('PH'), {
      materialId: material.id, materialCode: material.materialCode, materialName: material.materialName,
      supplierId: supplier.id, supplierName: supplier.supplierName, poNumber: saved.poNumber, recordedDate: saved.poDate,
      price: saved.unitPrice, previousPrice, ...movement, currency: saved.currency, uom: material.uom || 'Unit',
    });
    await materialsQ.setPrice(tx, material.id, { previousPrice, currentPrice: saved.unitPrice, priceChangePct: movement.priceChangePct });
  } else {
    // an edit: only the price of its own history entry changes, and the material price when this is the newest PO
    const history = await purchasesQ.findHistoryByPo(tx, existing.poNumber);
    if (history && (history.price !== saved.unitPrice || history.poNumber !== saved.poNumber)) {
      movement = priceMovement(saved.unitPrice, history.previousPrice);
      await purchasesQ.updateHistory(tx, history.id, { price: saved.unitPrice, poNumber: saved.poNumber, recordedDate: saved.poDate, ...movement });
      const latest = await purchasesQ.latestForMaterial(tx, material.id);
      if (latest && latest.id === id) {
        await materialsQ.setPrice(tx, material.id, { previousPrice: history.previousPrice, currentPrice: saved.unitPrice, priceChangePct: movement.priceChangePct });
      }
    }
  }

  // alerts, skipping any that is already open for this PO
  const open = (await alertsQ.list(tx)).filter((a) => OPEN_ALERT_STATUSES.includes(a.status));
  const candidates = alertsForTransaction(saved, movement ? movement.priceChangePct : 0, settings);
  for (const candidate of candidates) {
    if (open.some((a) => a.alertType === candidate.alertType && a.description.includes(saved.poNumber))) continue;
    await alertsQ.insert(tx, { ...candidate, id: auditQ.newId('ALT-SYS') });
  }

  return { saved, supplierIds: [supplier.id, ...(existing && existing.supplierId !== supplier.id ? [existing.supplierId] : [])] };
}

async function save(actor, input) {
  return prisma.$transaction(async (tx) => {
    const settings = await settingsQ.get(tx);
    const { saved, supplierIds } = await applyIn(tx, actor, input, settings);
    await scoring.recalculate(tx, supplierIds);
    return saved;
  });
}

// Many orders (a data import): one transaction, one rescoring pass at the end. A row that fails a
// rule (duplicate PO number, unknown supplier...) is reported and skipped; the rest are saved.
async function saveMany(actor, items) {
  return prisma.$transaction(
    async (tx) => {
      const settings = await settingsQ.get(tx);
      const touched = new Set();
      const saved = [];
      const errors = [];
      for (const [index, item] of items.entries()) {
        try {
          const r = await applyIn(tx, actor, item, settings);
          saved.push(r.saved);
          r.supplierIds.forEach((s) => touched.add(s));
        } catch (err) {
          if (!(err instanceof HttpError)) throw err;
          errors.push({ index, message: err.message });
        }
      }
      await scoring.recalculate(tx, [...touched]);
      return { saved, errors };
    },
    { timeout: 120000 }
  );
}

module.exports = { list: () => purchasesQ.list(prisma), listHistory: () => purchasesQ.listHistory(prisma), save, saveMany };
