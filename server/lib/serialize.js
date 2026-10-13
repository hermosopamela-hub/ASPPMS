// Prisma rows <-> the JSON the browser app uses.
//   out: Decimal -> number, Date -> ISO string ('YYYY-MM-DD' for calendar-date columns)
//   in:  those strings back to Date objects, and only the fields the table really has
const DATE_ONLY = new Set([
  'poDate', 'requestedDeliveryDate', 'actualDeliveryDate', 'receivingDate',
  'contractStartDate', 'contractEndDate', 'recordedDate',
]);

const isDecimal = (v) => v && typeof v === 'object' && typeof v.toNumber === 'function';

function toJson(row) {
  if (Array.isArray(row)) return row.map(toJson);
  if (!row || typeof row !== 'object') return row;
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    if (isDecimal(value)) out[key] = value.toNumber();
    else if (value instanceof Date) out[key] = DATE_ONLY.has(key) ? value.toISOString().slice(0, 10) : value.toISOString();
    else out[key] = value;
  }
  return out;
}

function toDate(value) {
  if (value === null || value === undefined || value === '') return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Picks `fields` from the client object. Dates become Date objects; `dates` lists the date columns.
function fromJson(input, fields, dates = []) {
  const out = {};
  for (const f of fields) {
    if (input[f] === undefined) continue;
    out[f] = dates.includes(f) ? toDate(input[f]) : input[f];
  }
  return out;
}

module.exports = { toJson, fromJson, toDate, DATE_ONLY };
