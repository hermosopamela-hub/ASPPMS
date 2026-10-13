// The log of data imports (the rows themselves go through the supplier, material and purchase services).
const prisma = require('../db');
const { HttpError } = require('../lib/http');
const auditQ = require('../queries/audit');
const audit = require('./audit');

const DATASETS = ['Supplier Master', 'Material Master', 'Purchase Transactions', 'Delivery Records', 'Quality Records', 'Price Records'];
const STATUSES = ['COMPLETED', 'FAILED', 'PARTIAL'];

async function record(actor, rec) {
  if (!DATASETS.includes(rec?.datasetType)) throw new HttpError(400, 'Unknown dataset type.');
  if (!STATUSES.includes(rec.status)) throw new HttpError(400, 'Unknown import status.');
  const count = (n) => Math.max(0, Math.trunc(Number(n) || 0));
  return prisma.$transaction(async (tx) => {
    const saved = await auditQ.insertImport(tx, {
      ...rec,
      fileName: String(rec.fileName || 'upload').slice(0, 255),
      totalRows: count(rec.totalRows), validRows: count(rec.validRows), importedRows: count(rec.importedRows), errorRows: count(rec.errorRows),
      importedBy: actor.email,
      errors: Array.isArray(rec.errors) ? rec.errors.slice(0, 500) : undefined,
    });
    await audit.log({ user: actor, action: 'IMPORT', module: 'Data Import', recordId: saved.id, details: `Imported ${saved.importedRows}/${saved.totalRows} rows of ${saved.datasetType} from ${saved.fileName}` }, tx);
    return saved;
  });
}

module.exports = { list: () => auditQ.listImports(prisma), record };
