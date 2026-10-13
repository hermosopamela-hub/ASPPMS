// End-to-end check of the API against a running server and the demo data. Run:
//   npm start   (in one terminal, after npm run seed:demo)
//   node --test server/smoke.test.js
// Skipped unless SMOKE_URL is set, so `npm test` stays database-free.
const test = require('node:test');
const assert = require('node:assert/strict');

const BASE = process.env.SMOKE_URL;
const skip = !BASE && 'set SMOKE_URL=http://localhost:8080 to run';

async function call(method, path, body, cookie) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: method === 'GET' ? undefined : JSON.stringify(body || {}),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json, cookie: (res.headers.get('set-cookie') || '').split(';')[0] };
}

const login = async (email, password) => call('POST', '/auth/login', { email, password });

test('sign-in', { skip }, async () => {
  assert.equal((await call('GET', '/api/snapshot')).status, 401, 'no session -> 401');
  assert.equal((await login('purchasing.analyst@ipi.ph', 'wrong-pass1')).status, 401);
  const ok = await login('purchasing.analyst@ipi.ph', 'analyst@2026');
  assert.equal(ok.status, 200);
  assert.equal(ok.json.user.role, 'PURCHASING_ANALYST');
  assert.ok(ok.json.permissions.includes('MANAGE_PURCHASES'));
  assert.equal(ok.json.user.passwordHash, undefined);
});

test('snapshot respects the role', { skip }, async () => {
  const mgr = await login('purchasing.manager@ipi.ph', 'manager@2026');
  const snap = (await call('GET', '/api/snapshot', null, mgr.cookie)).json;
  assert.equal(snap.suppliers.length, 20);
  assert.equal(snap.purchases.length, 125);
  assert.equal(snap.users.length, 0, 'manager cannot list users');
  assert.equal(typeof snap.purchases[0].unitPrice, 'number');
  assert.match(snap.purchases[0].poDate, /^\d{4}-\d{2}-\d{2}$/);
  // a manager may not edit suppliers
  assert.equal((await call('POST', '/api/suppliers', { supplierName: 'X', supplierCode: 'X1' }, mgr.cookie)).status, 403);
  const admin = await login('admin.procure@ipi.ph', 'admin@ipi2026');
  assert.ok((await call('GET', '/api/snapshot', null, admin.cookie)).json.users.length >= 4);
});

test('purchase order flow', { skip }, async () => {
  const a = await login('purchasing.analyst@ipi.ph', 'analyst@2026');
  const before = (await call('GET', '/api/snapshot', null, a.cookie)).json;
  const mat = before.materials[0];
  const sup = before.suppliers.find((s) => s.id === mat.preferredSupplierId) || before.suppliers[0];
  const po = `PO-SMOKE-${Date.now()}`;
  const bad = await call('POST', '/api/purchases', { poNumber: po, poDate: '2026-10-05', supplierId: sup.id, materialId: mat.id, quantity: 0, unitPrice: 1, requestedDeliveryDate: '2026-10-12' }, a.cookie);
  assert.equal(bad.status, 400);

  const body = {
    poNumber: po, poDate: '2026-10-05', supplierId: sup.id, materialId: mat.id, quantity: 100, unitPrice: Math.round(mat.currentPrice * 1.25),
    requestedDeliveryDate: '2026-10-12', actualDeliveryDate: '2026-10-14', deliveryStatus: 'DELAYED', delayDays: 2,
    qualityStatus: 'PARTIAL', receivedQuantity: 100, acceptedQuantity: 80, rejectedQuantity: 20, buyerStaff: 'Smoke',
  };
  const saved = await call('POST', '/api/purchases', body, a.cookie);
  assert.equal(saved.status, 200, JSON.stringify(saved.json));
  assert.equal(saved.json.totalAmount, 100 * body.unitPrice, 'total is computed on the server');
  assert.equal(saved.json.rejectionRate, 20);
  assert.equal((await call('POST', '/api/purchases', body, a.cookie)).status, 409, 'duplicate PO number');

  const after = (await call('GET', '/api/snapshot', null, a.cookie)).json;
  const m2 = after.materials.find((m) => m.id === mat.id);
  assert.equal(m2.currentPrice, body.unitPrice);
  assert.equal(m2.previousPrice, mat.currentPrice);
  assert.ok(after.priceHistory.some((h) => h.poNumber === po && h.classification === 'Significant Increase'));
  assert.ok(after.alerts.some((x) => x.description.includes(po) && x.alertType === 'High Rejection Rate'));
  assert.ok(after.alerts.some((x) => x.description.includes(po) && x.alertType === 'Significant Price Increase'));
  const s2 = after.suppliers.find((s) => s.id === sup.id);
  assert.equal(s2.totalOrdersCount, after.purchases.filter((p) => p.supplierId === sup.id).length, 'scorecard is recalculated from the real POs');

  // editing the PO again must not add a second history row or move the previous price
  const edit = await call('PUT', `/api/purchases/${saved.json.id}`, { ...body, remarks: 'edited' }, a.cookie);
  assert.equal(edit.status, 200);
  const again = (await call('GET', '/api/snapshot', null, a.cookie)).json;
  assert.equal(again.priceHistory.filter((h) => h.poNumber === po).length, 1);
  assert.equal(again.materials.find((m) => m.id === mat.id).previousPrice, mat.currentPrice);
});

test('alert scan, settings and audit', { skip }, async () => {
  const mgr = await login('purchasing.manager@ipi.ph', 'manager@2026');
  const scan = await call('POST', '/api/alerts/scan', null, mgr.cookie);
  assert.equal(scan.status, 200);
  assert.equal(typeof scan.json.alertsGenerated, 'number');
  const again = await call('POST', '/api/alerts/scan', null, mgr.cookie);
  assert.equal(again.json.alertsGenerated, 0, 'a second scan finds nothing new');

  const snap = (await call('GET', '/api/snapshot', null, mgr.cookie)).json;
  const badWeights = { ...snap.settings, weights: { ...snap.settings.weights, deliveryWeight: 0.9 } };
  assert.equal((await call('PUT', '/api/settings', badWeights, mgr.cookie)).status, 400);
  assert.equal((await call('PUT', '/api/settings', snap.settings, mgr.cookie)).status, 200);
  const logs = (await call('GET', '/api/audit-logs', null, mgr.cookie)).json;
  assert.ok(logs.length > 0 && logs[0].timestamp);
});

test('supplier delete keeps purchase history', { skip }, async () => {
  const a = await login('purchasing.analyst@ipi.ph', 'analyst@2026');
  const snap = (await call('GET', '/api/snapshot', null, a.cookie)).json;
  const withPo = snap.suppliers.find((s) => snap.purchases.some((p) => p.supplierId === s.id));
  const r = await call('DELETE', `/api/suppliers/${withPo.id}`, null, a.cookie);
  assert.equal(r.json.deactivated, true);
  // put it back
  await call('PUT', `/api/suppliers/${withPo.id}`, { ...withPo, status: withPo.status }, a.cookie);
  const fresh = await call('POST', '/api/suppliers', { supplierName: 'Smoke Test Supplier', supplierCode: `SMK-${Date.now()}`, supplierType: 'Distributor', category: 'Test' }, a.cookie);
  assert.equal(fresh.status, 200);
  assert.equal((await call('DELETE', `/api/suppliers/${fresh.json.id}`, null, a.cookie)).json.deleted, true);
});

test('lock-out after five wrong passwords', { skip }, async () => {
  for (let i = 0; i < 5; i++) await login('assistant.manager@ipi.ph', 'nope-nope1');
  const locked = await login('assistant.manager@ipi.ph', 'asst.mgr@2026');
  assert.equal(locked.status, 429);
});
