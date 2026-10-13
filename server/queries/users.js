// All database access for user accounts.
const crypto = require('crypto');

const findById = (db, id) => db.user.findUnique({ where: { id } });
const findByEmail = (db, email) => db.user.findUnique({ where: { email } });
const countUsers = (db) => db.user.count();
const listUsers = (db) => db.user.findMany({ orderBy: { createdAt: 'desc' } });

async function insertUser(db, { id, email, displayName, role, department, passwordHash, mustChangePassword = true, status = 'ACTIVE', createdAt }) {
  return db.user.create({
    data: { id: id || `usr-${crypto.randomBytes(5).toString('hex')}`, email, displayName, role, department: department || '', status, passwordHash, mustChangePassword, ...(createdAt ? { createdAt } : {}) },
  });
}

const updateProfile = (db, id, { displayName, role, department }) => db.user.update({ where: { id }, data: { displayName, role, department } });

const setStatus = (db, id, status) => db.user.update({ where: { id }, data: { status } });

async function recordLogin(db, id) {
  return db.user.update({ where: { id }, data: { failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() } });
}

// Counts a wrong password; locks the account for `lockMinutes` when `lock` is true.
async function recordFailedLogin(db, id, lock, lockMinutes) {
  return db.user.update({
    where: { id },
    data: { failedAttempts: lock ? 0 : { increment: 1 }, lockedUntil: lock ? new Date(Date.now() + lockMinutes * 60000) : undefined },
  });
}

// A new password ends every existing session (the session token carries passwordChangedAt).
const updatePassword = (db, id, passwordHash) =>
  db.user.update({ where: { id }, data: { passwordHash, mustChangePassword: false, passwordChangedAt: new Date(), failedAttempts: 0, lockedUntil: null } });

const resetPassword = (db, id, passwordHash) =>
  db.user.update({ where: { id }, data: { passwordHash, mustChangePassword: true, passwordChangedAt: new Date(), failedAttempts: 0, lockedUntil: null } });

const countOtherActiveAdmins = (db, id) => db.user.count({ where: { role: 'ADMIN', status: 'ACTIVE', NOT: { id } } });

module.exports = {
  findById, findByEmail, countUsers, listUsers, insertUser, updateProfile, setStatus, recordLogin, recordFailedLogin, updatePassword, resetPassword, countOtherActiveAdmins,
};
