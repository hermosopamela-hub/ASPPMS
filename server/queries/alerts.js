// All database access for alerts.
const { toDate, toJson } = require('../lib/serialize');

const list = async (db) => toJson(await db.alert.findMany({ orderBy: { createdAt: 'desc' } }));

const find = async (db, id) => {
  const row = await db.alert.findUnique({ where: { id } });
  return row ? toJson(row) : null;
};

async function insert(db, alert) {
  const { supplierId, materialId } = alert;
  // a deleted supplier or material must not break the alert insert
  const data = { ...alert };
  if (supplierId && !(await db.supplier.count({ where: { id: supplierId } }))) data.supplierId = null;
  if (materialId && !(await db.material.count({ where: { id: materialId } }))) data.materialId = null;
  return toJson(await db.alert.create({ data }));
}

const update = async (db, id, data) => toJson(await db.alert.update({ where: { id }, data }));

module.exports = { list, find, insert, update, toDate };
