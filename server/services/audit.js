// Writes the audit trail. `user` is the person (or the engine) who did it.
const prisma = require('../db');
const queries = require('../queries/audit');

const SYSTEM = { id: 'system', email: 'system' };

// log({ user, action, module, recordId, details }, db?): pass a transaction as `db` to log inside it.
async function log({ user = SYSTEM, action, module, recordId, details }, db = prisma) {
  await queries.insertAudit(db, { userId: user.id, userEmail: user.email, action, module, recordId, details });
}

const list = (limit) => queries.listAudit(prisma, limit);

module.exports = { SYSTEM, log, list };
