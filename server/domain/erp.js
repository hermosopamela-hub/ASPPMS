// Turns one row of the ERP "Indirect PO" export into the raw ERP record and the supplier, material and
// purchase order it implies. Pure functions: no database.
const crypto = require('crypto');

// SAP material group -> category shown in the app
const GROUP_CATEGORIES = {
  SU01001: 'Paints & Protective Coatings',
  SU02001: 'Electrical, Utilities & Power Equipment',
  SU03001: 'Process Valves, Tooling & Fittings',
  SU04001: 'Laboratory & Packaging Accessories',
  SU05001: 'Office Supplies, Cartridges & Inks',
  SU06001: 'Conveyor Belts & Industrial Hardware',
  SU08001: 'Computer, IT & Printing Hardware',
  SU10001: 'Industrial Seals, Gaskets & Rubber',
  SU12001: 'Petroleum, Fuel & Bulk Lubricants',
  SP14001: 'Automotive & Heavy Duty Batteries',
  SP15001: 'Vehicle Hardware & Engine Components',
  SP16001: 'Automotive & Mechanical Spare Parts',
  DI0005: 'Heavy Equipment Tires & Heavy Tubes',
  FG006: 'Nutraceuticals & Health Formulations',
};
const DEFAULT_CATEGORY = 'Industrial Supplies';
const DEFAULT_LEAD_DAYS = 7;

const REQUIRED_COLUMNS = ['Purchasing Document', 'Item', 'Document Date', 'Supplier/Supplying Plant', 'Short Text', 'Order Quantity', 'Gross Unit Price'];

const text = (v) => {
  const s = String(v ?? '').trim();
  return s === '' ? null : s;
};

// "1,112.00" -> 1112; blank or unreadable -> null
function parseNumber(v) {
  const s = String(v ?? '').replace(/,/g, '').trim();
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// SAP exports dates as M/D/YYYY. Returns 'YYYY-MM-DD', or null when it is not a real date.
function parseDate(v) {
  const m = String(v ?? '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [month, day, year] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return d.toISOString().slice(0, 10);
}

function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// "3000824    SCOTTIE INC." -> { code: '3000824', name: 'SCOTTIE INC.' }
function splitSupplier(v) {
  const s = String(v ?? '').trim();
  const m = s.match(/^(\S+)\s+(.+)$/);
  return m ? { code: m[1], name: m[2].trim() } : { code: s, name: s };
}

// Lines without a SAP material number get a stable code from the group and the full description, so the
// same item maps to the same material every time a file is imported, and different items never merge.
// Case, spacing and punctuation are ignored ("Pipe Wrench 12\"" and "PIPE WRENCH 12" are one item).
function materialCodeFor(row) {
  const code = text(row['Material']);
  if (code) return code;
  const norm = String(row['Short Text'] || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const hash = crypto.createHash('sha1').update(norm).digest('hex').slice(0, 6).toUpperCase();
  return `MAT-${text(row['Material Group']) || 'GEN'}-${norm.slice(0, 10).toUpperCase()}-${hash}`;
}

const idFor = (code, prefix) => (code.startsWith(`${prefix}-`) ? code : `${prefix}-${code}`);

function missingColumns(headers) {
  return REQUIRED_COLUMNS.filter((c) => !headers.includes(c));
}

// Throws an Error whose message says what is wrong with the row.
function mapRow(r, sourceFile) {
  const doc = text(r['Purchasing Document']);
  const item = Number.parseInt(r['Item'], 10);
  if (!doc) throw new Error('Purchasing Document is empty.');
  if (!Number.isInteger(item) || item < 1) throw new Error(`Item "${r['Item']}" is not a line number.`);
  const docDate = parseDate(r['Document Date']);
  if (!docDate) throw new Error(`Document Date "${r['Document Date']}" is not a date (expected M/D/YYYY).`);
  const supplier = splitSupplier(r['Supplier/Supplying Plant']);
  if (!supplier.code) throw new Error('Supplier/Supplying Plant is empty.');
  const shortText = text(r['Short Text']);
  if (!shortText) throw new Error('Short Text is empty.');
  const quantity = parseNumber(r['Order Quantity']);
  if (!(quantity > 0)) throw new Error(`Order Quantity "${r['Order Quantity']}" must be more than zero.`);
  const gross = parseNumber(r['Gross Unit Price']);
  const net = parseNumber(r['Net Price']);
  const unitPrice = gross > 0 ? gross : net > 0 ? net : null;
  if (unitPrice === null) throw new Error('Gross Unit Price and Net Price are both empty or zero.');

  const group = text(r['Material Group']);
  const currency = text(r['Currency']) || 'PHP';
  const materialCode = materialCodeFor(r);
  const nn = (col) => parseNumber(r[col]);

  return {
    raw: {
      id: `ERP-${doc}-${item}`,
      erpLegacyPo: text(r['ERP Legacy PO']),
      purchasingDocument: doc,
      taxCode: text(r['Tax Code']),
      grossUnitPrice: gross,
      netPrice: net,
      materialCode: text(r['Material']),
      orderQuantity: quantity,
      orderUnit: text(r['Order Unit']),
      purchasingDocType: text(r['Purchasing Doc. Type']),
      purchOrganization: text(r['Purch. organization']),
      itemCategory: text(r['Item category']),
      item,
      purchDocCategory: text(r['Purch. Doc. Category']),
      purchasingGroup: text(r['Purchasing Group']),
      documentDate: new Date(`${docDate}T00:00:00Z`),
      supplierText: text(r['Supplier/Supplying Plant']),
      shortText,
      materialGroup: group,
      acctAssignmentCat: text(r['Acct Assignment Cat.']),
      plant: text(r['Plant']),
      storageLocation: text(r['Storage location']),
      quantityInSku: nn('Quantity in SKU'),
      stockkeepingUnit: text(r['Stockkeeping unit']),
      createdBy: text(r['Created By']),
      currency,
      priceUnit: nn('Price unit'),
      targetQuantity: nn('Target Quantity'),
      openTargetQuantity: nn('Open Target Quantity'),
      stillToBeDeliveredQty: nn('Still to be delivered (qty)'),
      stillToBeDeliveredValue: nn('Still to be delivered (value)'),
      stillToBeInvoicedQty: nn('Still to be invoiced (qty)'),
      stillToBeInvoicedVal: nn('Still to be invoiced (val.)'),
      noOfPositions: Number.parseInt(r['No. of Positions'], 10) || null,
      sourceFile,
    },
    supplier: {
      id: idFor(supplier.code, 'SUP'),
      supplierCode: supplier.code,
      supplierName: supplier.name,
      supplierType: 'Distributor',
      category: GROUP_CATEGORIES[group] || DEFAULT_CATEGORY,
      country: currency === 'PHP' ? 'Philippines' : '',
      leadTimeDays: DEFAULT_LEAD_DAYS,
    },
    material: {
      id: idFor(materialCode, 'MAT'),
      materialCode,
      materialName: shortText,
      description: `${shortText} (${GROUP_CATEGORIES[group] || DEFAULT_CATEGORY})`,
      category: GROUP_CATEGORIES[group] || DEFAULT_CATEGORY,
      subcategory: group || 'GENERAL',
      uom: text(r['Order Unit']) || 'Unit',
      standardPrice: unitPrice,
      currentPrice: unitPrice,
      previousPrice: unitPrice,
      currency,
      supplierCode: supplier.code, // resolved to the supplier's id by the importer
    },
    purchase: {
      id: `TX-${doc}-${String(item).padStart(2, '0')}`,
      poNumber: `PO-${doc}-${String(item).padStart(2, '0')}`,
      poDate: docDate,
      requestedDeliveryDate: addDays(docDate, DEFAULT_LEAD_DAYS),
      supplierCode: supplier.code,
      materialCode,
      quantity,
      unitPrice,
      currency,
      // The export says nothing about delivery or inspection, so those start as pending (not scored).
      actualDeliveryDate: null,
      deliveryStatus: 'PENDING',
      qualityStatus: 'PENDING',
      receivedQuantity: 0,
      acceptedQuantity: 0,
      rejectedQuantity: 0,
      buyerStaff: text(r['Created By']) || '',
      remarks: `ERP legacy PO: ${text(r['ERP Legacy PO']) || 'N/A'}, Plant: ${text(r['Plant']) || ''}, Storage: ${text(r['Storage location']) || ''}, Line: ${item}`,
    },
  };
}

module.exports = { GROUP_CATEGORIES, REQUIRED_COLUMNS, parseNumber, parseDate, addDays, splitSupplier, materialCodeFor, missingColumns, mapRow };
