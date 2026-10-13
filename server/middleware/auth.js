const { sessionFromRequest } = require('../lib/session');
const { can } = require('../domain/permissions');
const users = require('../services/users');

// Puts req.user on the request when the cookie is valid. Never blocks by itself.
async function attach(req, res, next) {
  try {
    const data = sessionFromRequest(req);
    if (data) {
      const u = await users.sessionUser(data.u);
      // a changed password or a deactivated account ends old sessions
      if (u && u.status === 'ACTIVE' && new Date(u.passwordChangedAt).getTime() === data.c) req.user = u;
    }
  } catch (err) {
    console.error('auth.attach', err);
  }
  next();
}

// For the data API: signed in, and past the forced password change.
function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Please sign in.' });
  if (req.user.mustChangePassword) return res.status(403).json({ error: 'password_change_required' });
  next();
}

// Signed in is not enough: the person's role must hold the permission.
const requirePermission = (permission) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Please sign in.' });
  if (!can(req.user.role, permission)) return res.status(403).json({ error: 'Your role is not allowed to do this.' });
  next();
};

// Blocks forged requests from other websites: state-changing calls must come from this site and be JSON.
function sameSiteOnly(req, res, next) {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const origin = req.headers.origin;
    if (origin && new URL(origin).host !== req.headers.host) return res.status(403).json({ error: 'Request blocked.' });
    if (!req.is('application/json')) return res.status(415).json({ error: 'Send JSON.' });
  }
  next();
}

module.exports = { attach, requireAuth, requirePermission, sameSiteOnly };
