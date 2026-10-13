// Sign-in rules and user management: lock-out after repeated wrong passwords, forced first-login
// password change, and who may be deactivated. Routes call these; the Prisma calls live in queries/users.js.
const prisma = require('../db');
const { HttpError } = require('../lib/http');
const { DUMMY_HASH, hashPassword, passwordProblem, temporaryPassword, verifyPassword } = require('../lib/passwords');
const { ROLES, permissionsFor } = require('../domain/permissions');
const { USER_STATUSES } = require('../domain/constants');
const users = require('../queries/users');
const audit = require('./audit');

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

// A short cache so the many API calls of one page do not each hit the database.
const sessionCache = new Map();
const forget = (id) => sessionCache.delete(id);

async function sessionUser(id) {
  const hit = sessionCache.get(id);
  if (hit && Date.now() - hit.at < 10000) return hit.user;
  const user = await users.findById(prisma, id);
  sessionCache.set(id, { at: Date.now(), user });
  return user;
}

const isActive = (u) => u.status === 'ACTIVE';

// What the browser may see about a person (never the hash).
const publicUser = (u) => ({
  uid: u.id,
  email: u.email,
  displayName: u.displayName,
  role: u.role,
  status: u.status,
  department: u.department,
  avatarUrl: u.avatarUrl || undefined,
  lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : undefined,
  createdAt: u.createdAt.toISOString(),
  mustChange: u.mustChangePassword,
});

const session = (u) => ({ user: publicUser(u), permissions: permissionsFor(u.role) });

// Returns the user when the email and password are right. Throws an HttpError otherwise.
async function login(rawEmail, password) {
  const email = String(rawEmail || '').trim().toLowerCase();
  if (!email || !password) throw new HttpError(400, 'Enter your email and password.');
  const u = await users.findByEmail(prisma, email);
  if (u?.lockedUntil && u.lockedUntil > new Date()) {
    const mins = Math.ceil((u.lockedUntil - Date.now()) / 60000);
    throw new HttpError(429, `Too many wrong passwords. Try again in ${mins} minute${mins === 1 ? '' : 's'}, or ask your administrator.`);
  }
  const ok = await verifyPassword(password, u ? u.passwordHash : await DUMMY_HASH);
  if (!u || !isActive(u) || !ok) {
    // Count the miss; on the 5th in a row lock the account.
    if (u) await users.recordFailedLogin(prisma, u.id, u.failedAttempts + 1 >= MAX_FAILED, LOCK_MINUTES);
    throw new HttpError(401, 'Incorrect email or password.');
  }
  const updated = await users.recordLogin(prisma, u.id);
  forget(u.id);
  await audit.log({ user: updated, action: 'LOGIN', module: 'Authentication', recordId: u.id, details: 'User logged in successfully' });
  return updated;
}

async function logout(user) {
  if (user) await audit.log({ user, action: 'LOGIN', module: 'Authentication', recordId: user.id, details: 'User logged out' });
}

// Returns the updated user row (the caller starts a fresh session with it).
async function changePassword(userId, current, next) {
  const u = await users.findById(prisma, userId);
  if (!(await verifyPassword(current, u.passwordHash))) throw new HttpError(400, 'Your current password is not correct.');
  if (next === current) throw new HttpError(400, 'Pick a password that is different from the current one.');
  const problem = passwordProblem(next, u.email.split('@')[0]);
  if (problem) throw new HttpError(400, problem);
  const updated = await users.updatePassword(prisma, userId, await hashPassword(next));
  forget(userId);
  await audit.log({ user: updated, action: 'UPDATE', module: 'Authentication', recordId: userId, details: 'Password changed' });
  return updated;
}

const listUsers = async () => (await users.listUsers(prisma)).map(publicUser);

function validateProfile(input) {
  const email = String(input.email || '').trim().toLowerCase();
  const displayName = String(input.displayName || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Enter a valid email address.');
  if (!displayName) throw new HttpError(400, 'Enter the person\'s name.');
  if (!ROLES.includes(input.role)) throw new HttpError(400, 'Choose a valid role.');
  return { email, displayName, role: input.role, department: String(input.department || '').trim() };
}

// Creates a person with a temporary password, shown once to the administrator.
async function createUser(actor, input) {
  const profile = validateProfile(input);
  const temp = temporaryPassword();
  let created;
  try {
    created = await users.insertUser(prisma, { ...profile, passwordHash: await hashPassword(temp) });
  } catch (err) {
    if (err.code === 'P2002') throw new HttpError(409, 'That email is already registered.');
    throw err;
  }
  await audit.log({ user: actor, action: 'CREATE', module: 'User Management', recordId: created.id, details: `Created new system user: ${created.email} (${created.role})` });
  return { user: publicUser(created), temporaryPassword: temp };
}

async function updateUser(actor, id, input) {
  const target = await users.findById(prisma, id);
  if (!target) throw new HttpError(404, 'User not found.');
  const profile = validateProfile({ ...input, email: target.email }); // the email is the sign-in name and does not change
  if (target.role === 'ADMIN' && profile.role !== 'ADMIN' && (await users.countOtherActiveAdmins(prisma, id)) === 0) {
    throw new HttpError(400, 'There must be at least one active administrator.');
  }
  const updated = await users.updateProfile(prisma, id, profile);
  forget(id);
  await audit.log({ user: actor, action: 'UPDATE', module: 'User Management', recordId: id, details: `Updated user profile & role for ${updated.email} (${updated.role})` });
  return publicUser(updated);
}

async function resetPassword(actor, id) {
  const temp = temporaryPassword();
  const target = await users.findById(prisma, id);
  if (!target) throw new HttpError(404, 'User not found.');
  await users.resetPassword(prisma, id, await hashPassword(temp));
  forget(id);
  await audit.log({ user: actor, action: 'UPDATE', module: 'User Management', recordId: id, details: `Reset password for ${target.email}` });
  return { email: target.email, temporaryPassword: temp };
}

async function setStatus(actor, id, status) {
  if (!USER_STATUSES.includes(status)) throw new HttpError(400, 'Unknown status.');
  const target = await users.findById(prisma, id);
  if (!target) throw new HttpError(404, 'User not found.');
  if (status !== 'ACTIVE') {
    if (id === actor.id) throw new HttpError(400, 'You cannot deactivate your own account.');
    if (target.role === 'ADMIN' && (await users.countOtherActiveAdmins(prisma, id)) === 0) {
      throw new HttpError(400, 'There must be at least one active administrator.');
    }
  }
  await users.setStatus(prisma, id, status);
  forget(id);
  await audit.log({ user: actor, action: 'UPDATE', module: 'User Management', recordId: id, details: `Changed status of ${target.email} to ${status}` });
}

// Creates the first administrator when there are no users yet. The password comes from the
// ADMIN_PASSWORD setting, never from the code.
async function ensureFirstAdmin() {
  if ((await users.countUsers(prisma)) > 0) return;
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) {
    console.error('There are no users yet and ADMIN_PASSWORD is not set, so nobody can sign in. Set ADMIN_PASSWORD and restart.');
    return;
  }
  const email = (process.env.ADMIN_EMAIL || 'admin@ipi.ph').toLowerCase();
  await users.insertUser(prisma, {
    id: 'usr-admin', email, displayName: 'System Administrator', role: 'ADMIN', department: 'Information Systems', passwordHash: await hashPassword(pw),
  });
  console.log(`Created the first administrator "${email}". It must choose a new password at the first sign-in.`);
}

module.exports = {
  sessionUser, publicUser, session, login, logout, changePassword, listUsers, createUser, updateUser, resetPassword, setStatus, ensureFirstAdmin,
};
