// Scoring weights, alert thresholds and company details. Changing them rescores every supplier.
const prisma = require('../db');
const { HttpError } = require('../lib/http');
const settingsQ = require('../queries/settings');
const audit = require('./audit');
const scoring = require('./scoring');

const WEIGHTS = ['deliveryWeight', 'qualityWeight', 'priceWeight', 'responsivenessWeight', 'complianceWeight'];
const THRESHOLDS = ['significantPriceIncreasePct', 'moderatePriceIncreasePct', 'poorPerformanceThreshold', 'minQualityAcceptanceRate', 'contractExpiringDays'];

function validate(s) {
  if (!s || typeof s !== 'object' || !s.weights || !s.thresholds) throw new HttpError(400, 'Settings must include weights and thresholds.');
  for (const k of WEIGHTS) if (!Number.isFinite(s.weights[k]) || s.weights[k] < 0) throw new HttpError(400, `Weight ${k} must be a number, zero or more.`);
  for (const k of THRESHOLDS) if (!Number.isFinite(s.thresholds[k]) || s.thresholds[k] < 0) throw new HttpError(400, `Threshold ${k} must be a number, zero or more.`);
  const total = WEIGHTS.reduce((sum, k) => sum + s.weights[k], 0);
  if (Math.abs(total - 1) > 0.011) throw new HttpError(400, `Scoring weights must add up to 1.00 (now ${total.toFixed(2)}).`);
  if (!String(s.companyName || '').trim()) throw new HttpError(400, 'Company name is required.');
}

async function update(actor, input) {
  validate(input);
  const clean = {
    companyName: String(input.companyName).trim(),
    baseCurrency: String(input.baseCurrency || 'PHP'),
    fiscalYear: String(input.fiscalYear || ''),
    weights: Object.fromEntries(WEIGHTS.map((k) => [k, input.weights[k]])),
    thresholds: Object.fromEntries(THRESHOLDS.map((k) => [k, input.thresholds[k]])),
  };
  return prisma.$transaction(async (tx) => {
    const saved = await settingsQ.save(tx, clean);
    await audit.log({ user: actor, action: 'UPDATE_SETTINGS', module: 'System Settings', recordId: 'GLOBAL', details: 'Updated scoring weights & alert thresholds' }, tx);
    await scoring.recalculate(tx);
    return saved;
  });
}

module.exports = { get: () => settingsQ.get(prisma), update };
