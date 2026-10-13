// Unit tests for the pure business rules. No database needed: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateDeliveryScore, calculateQualityScore, calculatePriceScore, calculateOverallScore, classifyPriceChange, ratingFor } = require('./scoring');
const { derivePurchase, priceMovement } = require('./purchases');
const { alertsForTransaction, scanForAlerts } = require('./alerts');
const { can } = require('./permissions');
const { DEFAULT_SETTINGS } = require('./constants');

const tx = (over = {}) => ({
  id: 'T1', poNumber: 'PO-1', supplierId: 'S1', supplierName: 'Sup', materialId: 'M1', materialName: 'Mat',
  quantity: 10, unitPrice: 100, totalAmount: 1000, actualDeliveryDate: '2026-01-10', deliveryStatus: 'ON_TIME', delayDays: 0,
  receivedQuantity: 10, acceptedQuantity: 10, rejectedQuantity: 0, rejectionRate: 0, ...over,
});

test('delivery score: on-time rate minus a capped delay penalty', () => {
  assert.equal(calculateDeliveryScore([]).deliveryScore, 100);
  const r = calculateDeliveryScore([tx(), tx(), tx(), tx({ deliveryStatus: 'DELAYED', delayDays: 5 })]);
  assert.equal(r.onTimeDeliveryRate, 75);
  assert.equal(r.averageDelayDays, 1.3);
  assert.equal(r.deliveryScore, 72.5); // 75 - min(20, 1.25 * 2)
  assert.equal(calculateDeliveryScore([tx({ deliveryStatus: 'DELAYED', delayDays: 90 })]).deliveryScore, 0);
});

test('quality score is the acceptance rate', () => {
  const r = calculateQualityScore([tx({ receivedQuantity: 100, acceptedQuantity: 90, rejectedQuantity: 10 })]);
  assert.equal(r.qualityScore, 90);
  assert.equal(r.rejectionRate, 10);
});

test('price score: cheaper than the average caps at 100, 10% dearer is 90', () => {
  assert.equal(calculatePriceScore([tx({ unitPrice: 90 })], { M1: 100 }), 100);
  assert.equal(calculatePriceScore([tx({ unitPrice: 110 })], { M1: 100 }), 90);
  assert.equal(calculatePriceScore([], {}), 85);
});

test('overall score and rating tiers', () => {
  const w = DEFAULT_SETTINGS.weights;
  const { overallScore, ratingCategory } = calculateOverallScore({ deliveryScore: 90, qualityScore: 90, priceScore: 90, responsivenessScore: 90, complianceScore: 90 }, w);
  assert.equal(overallScore, 90);
  assert.equal(ratingCategory, 'EXCELLENT');
  assert.deepEqual([80, 79.9, 70, 69.9, 60, 59.9].map(ratingFor), ['GOOD', 'SATISFACTORY', 'SATISFACTORY', 'NEEDS_IMPROVEMENT', 'NEEDS_IMPROVEMENT', 'POOR']);
});

test('price change classification', () => {
  assert.equal(classifyPriceChange(10), 'Significant Increase');
  assert.equal(classifyPriceChange(3), 'Moderate Increase');
  assert.equal(classifyPriceChange(0.5), 'Minor Increase');
  assert.equal(classifyPriceChange(0), 'No Significant Change');
  assert.equal(classifyPriceChange(-12), 'Significant Decrease');
});

test('a purchase order derives its total and rejection rate itself', () => {
  const p = derivePurchase({ quantity: 12, unitPrice: 12.5, totalAmount: 1, receivedQuantity: 8, rejectedQuantity: 2 });
  assert.equal(p.totalAmount, 150);
  assert.equal(p.rejectionRate, 25);
  assert.deepEqual(priceMovement(120, 100), { priceDiff: 20, priceChangePct: 20, classification: 'Significant Increase' });
  assert.equal(priceMovement(5, 0).priceChangePct, 0);
});

test('alerts for one purchase order', () => {
  const s = DEFAULT_SETTINGS;
  assert.equal(alertsForTransaction(tx(), 2, s).length, 0);
  const types = alertsForTransaction(tx({ rejectionRate: 12 }), 15, s).map((a) => a.alertType);
  assert.deepEqual(types, ['Significant Price Increase', 'High Rejection Rate']);
});

test('a scan never raises the same alert twice', () => {
  const supplier = { id: 'S1', supplierName: 'Sup', status: 'ACTIVE', overallScore: 50, deliveryScore: 60, contractEndDate: null };
  const base = { suppliers: [supplier], materials: [], purchases: [], alerts: [], settings: DEFAULT_SETTINGS };
  const first = scanForAlerts(base);
  assert.deepEqual(first.alerts.map((a) => a.alertType).sort(), ['Late Delivery Spike', 'Performance Below Threshold']);
  const open = first.alerts.map((a, i) => ({ ...a, id: `A${i}`, status: 'NEW' }));
  assert.equal(scanForAlerts({ ...base, alerts: open }).alerts.length, 0);
  const resolved = open.map((a) => ({ ...a, status: 'RESOLVED' }));
  assert.equal(scanForAlerts({ ...base, alerts: resolved }).alerts.length, 2, 'a resolved alert can be raised again');
});

test('role permissions', () => {
  assert.equal(can('PURCHASING_ANALYST', 'MANAGE_PURCHASES'), true);
  assert.equal(can('PURCHASING_MANAGER', 'MANAGE_SUPPLIERS'), false);
  assert.equal(can('ADMIN', 'MANAGE_USERS'), true);
  assert.equal(can('NOBODY', 'VIEW_DASHBOARD'), false);
});
