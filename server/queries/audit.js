// Audit trail and data-import log.
const crypto = require('crypto');
const { toJson } = require('../lib/serialize');

const newId = (prefix) => `${prefix}-${Date.now()}-${crypto.randomInt(1000, 10000)}`;

async function insertAudit(db, { userId, userEmail, action, module, recordId, details, ipAddress }) {
  return db.auditLog.create({
    data: { id: newId('AUD'), userId: userId || userEmail, userEmail, action, module, recordId: String(recordId), details, ipAddress: ipAddress || null },
  });
}

const listAudit = async (db, limit = 500) => toJson(await db.auditLog.findMany({ orderBy: { timestamp: 'desc' }, take: limit }));

const listImports = async (db) => toJson(await db.dataImport.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }));

async function insertImport(db, rec) {
  return toJson(
    await db.dataImport.create({
      data: {
        id: rec.id || newId('IMP'),
        datasetType: rec.datasetType,
        fileName: rec.fileName,
        totalRows: rec.totalRows,
        validRows: rec.validRows,
        importedRows: rec.importedRows,
        errorRows: rec.errorRows,
        status: rec.status,
        importedBy: rec.importedBy,
        errors: rec.errors ?? undefined,
      },
    })
  );
}

module.exports = { newId, insertAudit, listAudit, listImports, insertImport };
