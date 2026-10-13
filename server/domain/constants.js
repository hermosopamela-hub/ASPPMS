// Fixed vocabularies and defaults shared by the rules and the services.
const SUPPLIER_STATUSES = ['ACTIVE', 'INACTIVE', 'PROBATION', 'SUSPENDED'];
const USER_STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];
const ALERT_STATUSES = ['NEW', 'ACKNOWLEDGED', 'INVESTIGATING', 'RESOLVED', 'DISMISSED'];
const OPEN_ALERT_STATUSES = ['NEW', 'ACKNOWLEDGED', 'INVESTIGATING'];

const DEFAULT_SETTINGS = {
  companyName: 'International Pharmaceuticals & Manufacturing Inc.',
  baseCurrency: 'PHP',
  fiscalYear: '2026',
  weights: { deliveryWeight: 0.3, qualityWeight: 0.3, priceWeight: 0.2, responsivenessWeight: 0.1, complianceWeight: 0.1 },
  thresholds: {
    significantPriceIncreasePct: 10.0,
    moderatePriceIncreasePct: 3.0,
    poorPerformanceThreshold: 70.0,
    minQualityAcceptanceRate: 95.0,
    contractExpiringDays: 30,
  },
};

module.exports = { SUPPLIER_STATUSES, USER_STATUSES, ALERT_STATUSES, OPEN_ALERT_STATUSES, DEFAULT_SETTINGS };
