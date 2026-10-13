// The session is a signed, httpOnly cookie that lasts 8 hours. Changing a password or deactivating
// a user ends their existing sessions (the token carries the time the password last changed).
const crypto = require('crypto');
const { PROD } = require('../config');

const COOKIE = 'asppm_session';
const SESSION_HOURS = 8;

let SECRET = process.env.SESSION_SECRET;
if (!SECRET) {
  // Every Cloud Run instance must share the same secret, so refuse to start without it in production.
  if (PROD) throw new Error('SESSION_SECRET is not set');
  SECRET = crypto.randomBytes(32).toString('hex');
  console.warn('SESSION_SECRET is not set: using a random one, so everyone is signed out whenever the server restarts.');
}

const b64 = (buf) => Buffer.from(buf).toString('base64url');
const sign = (payload) => crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');

function makeToken(user) {
  const payload = b64(JSON.stringify({ u: user.id, c: new Date(user.passwordChangedAt).getTime(), e: Date.now() + SESSION_HOURS * 3600e3 }));
  return `${payload}.${sign(payload)}`;
}

function readToken(token) {
  const [payload, sig] = String(token || '').split('.');
  if (!payload || !sig) return null;
  const expected = sign(payload);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return data.e > Date.now() ? data : null;
  } catch {
    return null;
  }
}

function cookieValue(req, name) {
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

const OPTIONS = { httpOnly: true, sameSite: 'lax', secure: PROD, path: '/' };
const setSession = (res, user) => res.cookie(COOKIE, makeToken(user), OPTIONS);
const clearSession = (res) => res.clearCookie(COOKIE, OPTIONS);
const sessionFromRequest = (req) => readToken(cookieValue(req, COOKIE));

module.exports = { setSession, clearSession, sessionFromRequest };
