// System settings: a single row (id = 1).
const { DEFAULT_SETTINGS } = require('../domain/constants');

const toSettings = (row) => ({
  companyName: row.companyName,
  baseCurrency: row.baseCurrency,
  fiscalYear: row.fiscalYear,
  weights: row.weights,
  thresholds: row.thresholds,
});

async function get(db) {
  const row = await db.systemSetting.findUnique({ where: { id: 1 } });
  return row ? toSettings(row) : { ...DEFAULT_SETTINGS };
}

async function save(db, settings) {
  const data = {
    companyName: settings.companyName,
    baseCurrency: settings.baseCurrency,
    fiscalYear: settings.fiscalYear,
    weights: settings.weights,
    thresholds: settings.thresholds,
  };
  return toSettings(await db.systemSetting.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: { ...data, updatedAt: new Date() } }));
}

module.exports = { get, save };
