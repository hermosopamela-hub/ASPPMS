// All database access for materials.
const { fromJson, toJson } = require('../lib/serialize');

const FIELDS = [
  'materialCode', 'materialName', 'description', 'category', 'subcategory', 'uom', 'standardPrice',
  'currentPrice', 'previousPrice', 'priceChangePct', 'currency', 'preferredSupplierId',
  'preferredSupplierName', 'isActive', 'minOrderQty',
];

const list = async (db) => toJson(await db.material.findMany({ orderBy: { createdAt: 'desc' } }));

const find = async (db, idOrCode) => {
  const row = await db.material.findFirst({ where: { OR: [{ id: idOrCode }, { materialCode: idOrCode }] } });
  return row ? toJson(row) : null;
};

async function upsert(db, id, input) {
  const data = fromJson(input, FIELDS);
  // an empty preferred supplier means none
  if (data.preferredSupplierId === '') data.preferredSupplierId = null;
  const row = await db.material.upsert({
    where: { id },
    create: { id, ...data },
    update: { ...data, updatedAt: new Date() },
  });
  return toJson(row);
}

// New price after a purchase order.
async function setPrice(db, id, { previousPrice, currentPrice, priceChangePct }) {
  return toJson(await db.material.update({ where: { id }, data: { previousPrice, currentPrice, priceChangePct, updatedAt: new Date() } }));
}

// partial update of an existing row
const patch = async (db, id, data) => toJson(await db.material.update({ where: { id }, data: { ...data, updatedAt: new Date() } }));

const purchaseCount = (db, id) => db.purchaseTransaction.count({ where: { materialId: id } });
const remove = (db, id) => db.material.delete({ where: { id } });

module.exports = { FIELDS, list, find, upsert, patch, setPrice, purchaseCount, remove };
