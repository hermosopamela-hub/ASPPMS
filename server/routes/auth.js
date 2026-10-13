// Sign-in routes, mounted at /auth.
const express = require('express');
const { handle } = require('../lib/http');
const { RULES } = require('../lib/passwords');
const { clearSession, setSession } = require('../lib/session');
const { requirePermission, sameSiteOnly } = require('../middleware/auth');
const users = require('../services/users');

const router = express.Router();
router.use(sameSiteOnly);

router.post(
  '/login',
  handle(async (req, res) => {
    const email = String(req.body?.email || '').slice(0, 200);
    const password = String(req.body?.password || '').slice(0, 200);
    const user = await users.login(email, password);
    setSession(res, user);
    res.json({ ok: true, ...users.session(user) });
  })
);

router.post(
  '/logout',
  handle(async (req, res) => {
    await users.logout(req.user);
    clearSession(res);
    res.json({ ok: true });
  })
);

// Who is signed in, what their role may do, and the password rules for the "choose a password" form.
router.get('/me', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Please sign in.' });
  res.json({ ...users.session(req.user), rules: RULES });
});

router.post(
  '/change-password',
  handle(async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Please sign in.' });
    const updated = await users.changePassword(req.user.id, String(req.body?.current || ''), String(req.body?.next || ''));
    setSession(res, updated); // the old session ends, this one replaces it
    res.json({ ok: true, ...users.session(updated) });
  })
);

// ---- administrators
const admin = [(req, res, next) => (req.user?.mustChangePassword ? res.status(403).json({ error: 'password_change_required' }) : next()), requirePermission('MANAGE_USERS')];

router.get('/users', admin, handle(async (req, res) => res.json({ users: await users.listUsers() })));

router.post('/users', admin, handle(async (req, res) => res.json({ ok: true, ...(await users.createUser(req.user, req.body || {})) })));

router.put('/users/:id', admin, handle(async (req, res) => res.json({ ok: true, user: await users.updateUser(req.user, req.params.id, req.body || {}) })));

router.post('/users/:id/reset', admin, handle(async (req, res) => res.json({ ok: true, ...(await users.resetPassword(req.user, req.params.id)) })));

router.post(
  '/users/:id/status',
  admin,
  handle(async (req, res) => {
    await users.setStatus(req.user, req.params.id, String(req.body?.status || ''));
    res.json({ ok: true });
  })
);

module.exports = router;
