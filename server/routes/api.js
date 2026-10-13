// Data routes, mounted at /api. Each one checks the role's permission and hands the request to a service.
const express = require('express');
const { handle } = require('../lib/http');
const { requirePermission, sameSiteOnly } = require('../middleware/auth');
const alerts = require('../services/alerts');
const audit = require('../services/audit');
const imports = require('../services/imports');
const materials = require('../services/materials');
const purchases = require('../services/purchases');
const scoring = require('../services/scoring');
const settings = require('../services/settings');
const snapshot = require('../services/snapshot');
const suppliers = require('../services/suppliers');
const system = require('../services/system');

// Like IOVDIP's dashboard routes, but a database error never reaches the browser as raw text.
const wrap = (fn) => handle(async (req, res) => res.json(await fn(req)));

const router = express.Router();
router.use(sameSiteOnly);

// Wraps a service call that needs the signed-in person and the request body.
const act = (fn) => wrap((req) => fn(req.user, req.body, req));
const items = (req) => (Array.isArray(req.body?.items) ? req.body.items : []);

// ---- everything this role may see, in one answer
router.get('/snapshot', wrap((req) => snapshot.build(req.user)));

// ---- suppliers
router.post('/suppliers', requirePermission('MANAGE_SUPPLIERS'), act((u, body) => suppliers.save(u, body)));
router.put('/suppliers/:id', requirePermission('MANAGE_SUPPLIERS'), wrap((req) => suppliers.save(req.user, { ...req.body, id: req.params.id })));
router.post('/suppliers/bulk', requirePermission('IMPORT_DATA'), wrap((req) => suppliers.saveMany(req.user, items(req))));
router.delete('/suppliers/:id', requirePermission('MANAGE_SUPPLIERS'), wrap((req) => suppliers.remove(req.user, req.params.id)));

// ---- materials
router.post('/materials', requirePermission('MANAGE_MATERIALS'), act((u, body) => materials.save(u, body)));
router.put('/materials/:id', requirePermission('MANAGE_MATERIALS'), wrap((req) => materials.save(req.user, { ...req.body, id: req.params.id })));
router.post('/materials/bulk', requirePermission('IMPORT_DATA'), wrap((req) => materials.saveMany(req.user, items(req))));
router.delete('/materials/:id', requirePermission('MANAGE_MATERIALS'), wrap((req) => materials.remove(req.user, req.params.id)));

// ---- purchase orders
router.post('/purchases', requirePermission('MANAGE_PURCHASES'), act((u, body) => purchases.save(u, body)));
router.put('/purchases/:id', requirePermission('MANAGE_PURCHASES'), wrap((req) => purchases.save(req.user, { ...req.body, id: req.params.id })));
router.post('/purchases/bulk', requirePermission('IMPORT_DATA'), wrap((req) => purchases.saveMany(req.user, items(req))));

// ---- scoring
router.post('/scoring/recalculate', requirePermission('VIEW_DASHBOARD'), wrap(async (req) => (await scoring.recalculateAll(req.user), { ok: true })));

// ---- alerts
router.post('/alerts/scan', requirePermission('MANAGE_ALERTS'), wrap((req) => alerts.scan(req.user)));
router.patch('/alerts/:id', requirePermission('MANAGE_ALERTS'), wrap((req) => alerts.updateStatus(req.user, req.params.id, req.body || {})));

// ---- settings
router.put('/settings', requirePermission('MANAGE_SETTINGS'), wrap((req) => settings.update(req.user, req.body)));

// ---- imports
router.post('/imports', requirePermission('IMPORT_DATA'), wrap((req) => imports.record(req.user, req.body)));

// ---- audit trail
router.get('/audit-logs', requirePermission('VIEW_AUDIT_LOGS'), wrap(() => audit.list(500)));

// ---- backup and restore (settings managers only)
router.get('/system/export', requirePermission('MANAGE_SETTINGS'), wrap(() => system.exportSnapshot()));
router.post('/system/import', requirePermission('MANAGE_SETTINGS'), wrap((req) => system.importSnapshot(req.user, req.body)));
router.post('/system/reset', requirePermission('MANAGE_SETTINGS'), wrap(async (req) => (await system.resetToDemo(req.user), { ok: true })));

module.exports = router;
