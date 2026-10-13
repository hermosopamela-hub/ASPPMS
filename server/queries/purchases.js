// All database access for purchase transactions and the price history they create.
const { fromJson, toJson } = require('../lib/serialize');

const FIELDS = [
  'poNumber', 'poDate', 'supplierId', 'supplierName', 'materialId', 'materialCode', 'materialName', 'quantity',
  'unitPrice', 'currency', 'totalAmount', 'requestedDeliveryDate', 'actualDeliveryDate', 'deliveryStatus',
  'delayDays', 'qualityStatus', 'receivedQuantity', 'acceptedQuantity', 'rejectedQuantity', 'rejectionRate',
  'buyerStaff', 'receivingDate', 'remarks',
];
const DATES = ['poDate', 'requestedDeliveryDate', 'actualDeliveryDate', 'receivingDate'];
const HISTORY_FIELDS = [
  'materialId', 'materialCode', 'materialName', 'supplierId', 'supplierName', 'poNumber', 'recordedDate', 'price',
  'previousPrice', 'priceDiff', 'priceChangePct', 'currency', 'classification', 'uom',
];

// newest first
const list = async (db, where = {}) =>
  toJson(await db.purchaseTransaction.findMany({ where, orderBy: [{ poDate: 'desc' }, { createdAt: 'desc' }] }));

const find = async (db, id) => {
  const row = await db.purchaseTransaction.findUnique({ where: { id } });
  return row ? toJson(row) : null;
};

const findByPoNumber = async (db, poNumber) => {
  const row = await db.purchaseTransaction.findUnique({ where: { poNumber } });
  return row ? toJson(row) : null;
};

async function upsert(db, id, input) {
  const data = fromJson(input, FIELDS, DATES);
  return toJson(await db.purchaseTransaction.upsert({ where: { id }, create: { id, ...data }, update: data }));
}

// ---- price history
const listHistory = async (db, where = {}) =>
  toJson(await db.priceHistory.findMany({ where, orderBy: [{ recordedDate: 'desc' }, { createdAt: 'desc' }] }));

const findHistoryByPo = async (db, poNumber) => {
  const row = await db.priceHistory.findFirst({ where: { poNumber } });
  return row ? toJson(row) : null;
};

const insertHistory = async (db, id, input) =>
  toJson(await db.priceHistory.create({ data: { id, ...fromJson(input, HISTORY_FIELDS, ['recordedDate']) } }));

const updateHistory = async (db, id, input) =>
  toJson(await db.priceHistory.update({ where: { id }, data: fromJson(input, HISTORY_FIELDS, ['recordedDate']) }));

// the newest purchase of a material, to know whether a PO sets the current price
const latestForMaterial = async (db, materialId) => {
  const row = await db.purchaseTransaction.findFirst({ where: { materialId }, orderBy: [{ poDate: 'desc' }, { createdAt: 'desc' }] });
  return row ? toJson(row) : null;
};

module.exports = {
  FIELDS, DATES, HISTORY_FIELDS, list, find, findByPoNumber, upsert, listHistory, findHistoryByPo, insertHistory, updateHistory, latestForMaterial,
};
