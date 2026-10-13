// Replaces all business data (not user accounts) with the given data set. Used by the demo seed,
// "reset to defaults" and the backup restore, so all three go through one code path.
const { toDate, fromJson } = require('../lib/serialize');
const suppliersQ = require('../queries/suppliers');
const materialsQ = require('../queries/materials');
const purchasesQ = require('../queries/purchases');
const { DEFAULT_SETTINGS } = require('../domain/constants');

const CHUNK = 500;

async function createInChunks(model, rows) {
  for (let i = 0; i < rows.length; i += CHUNK) await model.createMany({ data: rows.slice(i, i + CHUNK) });
}

const stamps = (row) => ({
  ...(row.createdAt ? { createdAt: toDate(row.createdAt) } : {}),
  ...(row.updatedAt ? { updatedAt: toDate(row.updatedAt) } : {}),
});

// `db` is a transaction. Throws when the data refers to something that is not in it.
async function replaceAll(db, data) {
  // children first
  await db.priceHistory.deleteMany();
  await db.alert.deleteMany();
  await db.purchaseTransaction.deleteMany();
  await db.material.deleteMany();
  await db.supplier.deleteMany();
  await db.auditLog.deleteMany();

  await createInChunks(
    db.supplier,
    data.suppliers.map((r) => ({ id: r.id, ...fromJson(r, suppliersQ.FIELDS, suppliersQ.DATES), ...stamps(r) }))
  );
  await createInChunks(
    db.material,
    data.materials.map((r) => ({ id: r.id, ...fromJson(r, materialsQ.FIELDS), preferredSupplierId: r.preferredSupplierId || null, ...stamps(r) }))
  );
  await createInChunks(
    db.purchaseTransaction,
    data.purchases.map((r) => ({ id: r.id, ...fromJson(r, purchasesQ.FIELDS, purchasesQ.DATES), ...stamps(r) }))
  );
  await createInChunks(
    db.priceHistory,
    (data.priceHistory || []).map((r) => ({ id: r.id, ...fromJson(r, purchasesQ.HISTORY_FIELDS, ['recordedDate']), ...stamps(r) }))
  );
  await createInChunks(
    db.alert,
    (data.alerts || []).map((r) => ({
      id: r.id, alertType: r.alertType, severity: r.severity, supplierId: r.supplierId || null, supplierName: r.supplierName ?? null,
      materialId: r.materialId || null, materialName: r.materialName ?? null, description: r.description, triggerMetric: r.triggerMetric ?? null,
      status: r.status || 'NEW', assignedUser: r.assignedUser ?? null, resolution: r.resolution ?? null,
      ...stamps(r), resolvedAt: toDate(r.resolvedAt),
    }))
  );
  await createInChunks(
    db.auditLog,
    (data.auditLogs || []).map((r) => ({
      id: r.id, userId: r.userId || r.userEmail, userEmail: r.userEmail, action: r.action, module: r.module,
      recordId: String(r.recordId), details: r.details, ipAddress: r.ipAddress ?? null, timestamp: toDate(r.timestamp) || new Date(),
    }))
  );

  const s = data.settings && data.settings.weights && data.settings.thresholds ? data.settings : DEFAULT_SETTINGS;
  const row = { companyName: s.companyName, baseCurrency: s.baseCurrency, fiscalYear: s.fiscalYear, weights: s.weights, thresholds: s.thresholds };
  await db.systemSetting.upsert({ where: { id: 1 }, create: { id: 1, ...row }, update: { ...row, updatedAt: new Date() } });
}

module.exports = { replaceAll };
