// All database access for suppliers. Every function takes `db`: the Prisma client or a transaction.
const { fromJson, toJson } = require('../lib/serialize');

const FIELDS = [
  'supplierCode', 'supplierName', 'supplierType', 'category', 'contactPerson', 'email', 'phone', 'address',
  'country', 'region', 'status', 'paymentTerms', 'leadTimeDays', 'contractStartDate', 'contractEndDate',
  'overallScore', 'ratingTier', 'deliveryScore', 'qualityScore', 'priceScore', 'responsivenessScore',
  'complianceScore', 'totalOrdersCount', 'totalSpend',
];
const DATES = ['contractStartDate', 'contractEndDate'];

const list = async (db) => toJson(await db.supplier.findMany({ orderBy: { createdAt: 'desc' } }));

// by id or by supplier code
const find = async (db, idOrCode) => {
  const row = await db.supplier.findFirst({ where: { OR: [{ id: idOrCode }, { supplierCode: idOrCode }] } });
  return row ? toJson(row) : null;
};

const exists = async (db, id) => (await db.supplier.count({ where: { id } })) > 0;

async function upsert(db, id, input) {
  const data = fromJson(input, FIELDS, DATES);
  const row = await db.supplier.upsert({
    where: { id },
    create: { id, ...data },
    update: { ...data, updatedAt: new Date() },
  });
  return toJson(row);
}

// Only the computed scorecard fields.
async function updateScores(db, id, scores) {
  return toJson(await db.supplier.update({ where: { id }, data: { ...scores, updatedAt: new Date() } }));
}

// partial update of an existing row
const patch = async (db, id, data) => toJson(await db.supplier.update({ where: { id }, data: { ...data, updatedAt: new Date() } }));

const purchaseCount = (db, id) => db.purchaseTransaction.count({ where: { supplierId: id } });
const remove = (db, id) => db.supplier.delete({ where: { id } });

module.exports = { FIELDS, DATES, list, find, exists, upsert, patch, updateScores, purchaseCount, remove };
