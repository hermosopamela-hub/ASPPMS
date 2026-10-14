// Imports an ERP "Indirect PO" CSV. Additive and safe to repeat: it never deletes business data.
//   1. every valid line is kept as-is in erp_purchase_orders (the same document + item again replaces it)
//   2. lines dated on or after `since` (all lines when omitted) also become suppliers, materials and
//      purchase orders in the app: only the ones not already there are created
// It writes in bulk (a few thousand rows per statement) instead of going through the one-PO-at-a-time
// services, because an export has tens of thousands of lines. The rules are the same pure functions the
// services use (derivePurchase, priceMovement); the differences are listed in the README.
const Papa = require('papaparse');
const prisma = require('../db');
const auditQ = require('../queries/audit');
const { mapRow, missingColumns } = require('../domain/erp');
const { derivePurchase, priceMovement } = require('../domain/purchases');
const scoring = require('./scoring');
const audit = require('./audit');

const DATASET = 'ERP Purchase Orders';
const ACTOR = { id: 'erp-import', email: 'erp-import@system' };
// The app sends every purchase order to the browser in one answer (/api/snapshot), so a huge window would break it.
const LARGE_WINDOW = 25000;
const ROW_CHUNK = 500; // raw lines have 35 columns: keep each statement well under the query parameter limit
const SMALL_CHUNK = 2000;

const chunks = (list, size) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, (i + 1) * size));
const day = (iso) => new Date(`${iso}T00:00:00Z`);

// Parses and maps the file. Returns the good rows and a list of { row, message } for the bad ones.
function parse(csvText, fileName) {
  const parsed = Papa.parse(csvText.replace(/^﻿/, ''), { header: true, skipEmptyLines: true });
  const missing = missingColumns(parsed.meta.fields || []);
  if (missing.length) throw new Error(`Not an ERP Indirect PO export. Missing column(s): ${missing.join(', ')}`);

  const rows = [];
  const errors = [];
  const seen = new Set();
  parsed.data.forEach((r, i) => {
    const line = i + 2; // line 1 is the header
    try {
      const m = mapRow(r, fileName);
      if (seen.has(m.raw.id)) throw new Error(`Document ${m.raw.purchasingDocument} item ${m.raw.item} appears twice in this file.`);
      seen.add(m.raw.id);
      rows.push(m);
    } catch (err) {
      errors.push({ row: line, message: err.message });
    }
  });
  return { rows, errors, totalRows: parsed.data.length };
}

// A SAP material number can appear with slightly different descriptions; the first one is kept.
function descriptionVariants(rows) {
  const names = new Map();
  for (const { material } of rows) {
    if (!names.has(material.materialCode)) names.set(material.materialCode, new Set());
    names.get(material.materialCode).add(material.materialName.toLowerCase());
  }
  const n = [...names.values()].filter((set) => set.size > 1).length;
  return n ? [`${n} material code(s) appear with more than one description in this file; the first description is kept.`] : [];
}

// Replaces the raw lines (by document + item, which also covers rows an older load saved under other ids).
async function saveRaw(tx, rows) {
  for (const part of chunks(rows, ROW_CHUNK)) {
    const docs = part.map((r) => r.raw.purchasingDocument);
    const items = part.map((r) => r.raw.item);
    await tx.$executeRaw`DELETE FROM erp_purchase_orders WHERE (purchasing_document, item) IN (SELECT * FROM unnest(${docs}::text[], ${items}::int[]))`;
    await tx.erpPurchaseOrder.createMany({ data: part.map((r) => r.raw) });
  }
}

async function importCsv(csvText, fileName, { dryRun = false, since = null, forceLarge = false, actor = ACTOR } = {}) {
  const { rows, errors, totalRows } = parse(csvText, fileName);
  const windowRows = since ? rows.filter((r) => r.purchase.poDate >= since) : rows;
  const report = {
    fileName, dryRun, since, totalRows, validRows: rows.length, windowRows: windowRows.length,
    errors: [...errors], warnings: descriptionVariants(windowRows),
  };
  if (windowRows.length > LARGE_WINDOW && !forceLarge) {
    throw new Error(
      `${windowRows.length} purchase orders would be loaded into the app, and the app sends all of them to the browser at once. ` +
        `Use --since YYYY-MM-DD to load a recent period, or add --force-large if you really want all of them.`
    );
  }

  // ---- what is already in the database (one array parameter per lookup: no query parameter limit)
  const poNumbers = windowRows.map((r) => r.purchase.poNumber);
  const rawIds = rows.map((r) => r.raw.id);
  const [havePos, haveRaw] = await Promise.all([
    prisma.$queryRaw`SELECT po_number AS "poNumber" FROM purchase_transactions WHERE po_number = ANY(${poNumbers}::text[])`,
    prisma.$queryRaw`SELECT count(*)::int AS n FROM erp_purchase_orders WHERE id = ANY(${rawIds}::text[])`,
  ]);
  const knownPos = new Set(havePos.map((p) => p.poNumber));
  const fresh = windowRows
    .filter((r) => !knownPos.has(r.purchase.poNumber))
    .sort((a, b) => a.purchase.poDate.localeCompare(b.purchase.poDate) || a.purchase.poNumber.localeCompare(b.purchase.poNumber));

  const supplierCodes = [...new Set(fresh.map((r) => r.supplier.supplierCode))];
  const materialCodes = [...new Set(fresh.map((r) => r.material.materialCode))];
  const [haveSuppliers, haveMaterials] = await Promise.all([
    prisma.$queryRaw`SELECT id, supplier_code AS "supplierCode", supplier_name AS "supplierName" FROM suppliers WHERE supplier_code = ANY(${supplierCodes}::text[])`,
    prisma.$queryRaw`SELECT id, material_code AS "materialCode", material_name AS "materialName", uom, current_price::float8 AS "currentPrice" FROM materials WHERE material_code = ANY(${materialCodes}::text[])`,
  ]);
  const suppliers = new Map(haveSuppliers.map((s) => [s.supplierCode, { id: s.id, name: s.supplierName, isNew: false }]));
  const materials = new Map(haveMaterials.map((m) => [m.materialCode, { id: m.id, name: m.materialName, uom: m.uom, cur: m.currentPrice, isNew: false }]));

  Object.assign(report, {
    rawNew: rows.length - haveRaw[0].n, rawUpdated: haveRaw[0].n,
    suppliersNew: supplierCodes.filter((c) => !suppliers.has(c)).length,
    materialsNew: materialCodes.filter((c) => !materials.has(c)).length,
    purchasesNew: fresh.length, purchasesSkipped: windowRows.length - fresh.length,
    outsideWindow: rows.length - windowRows.length,
  });
  if (dryRun) return report;

  // ---- 1. raw lines (all valid lines, whatever their date)
  await prisma.$transaction((tx) => saveRaw(tx, rows), { timeout: 600000 });

  // ---- 2. suppliers, materials, purchase orders and price history, all or nothing
  const run = Date.now().toString(36).toUpperCase();
  const saved = await prisma.$transaction(
    async (tx) => {
      const newSuppliers = [];
      for (const r of fresh) {
        if (!suppliers.has(r.supplier.supplierCode)) {
          suppliers.set(r.supplier.supplierCode, { id: r.supplier.id, name: r.supplier.supplierName, isNew: true });
          newSuppliers.push(r.supplier);
        }
      }
      for (const part of chunks(newSuppliers, SMALL_CHUNK)) await tx.supplier.createMany({ data: part });

      // price movement per material, oldest PO first; a new material starts at the price of its first PO
      const history = [];
      const orders = [];
      const newMaterials = new Map();
      const touched = new Set();
      for (const r of fresh) {
        const code = r.material.materialCode;
        let m = materials.get(code);
        if (!m) {
          m = { id: r.material.id, name: r.material.materialName, uom: r.material.uom, cur: r.purchase.unitPrice, isNew: true, standard: r.purchase.unitPrice };
          materials.set(code, m);
          newMaterials.set(code, r.material);
        }
        const supplier = suppliers.get(r.supplier.supplierCode);
        const { supplierCode, materialCode, ...p } = r.purchase;
        const mv = priceMovement(p.unitPrice, m.cur);
        history.push({
          id: `PH-${run}-${history.length + 1}`, materialId: m.id, materialCode: code, materialName: m.name, supplierId: supplier.id, supplierName: supplier.name,
          poNumber: p.poNumber, recordedDate: day(p.poDate), price: p.unitPrice, previousPrice: m.cur, ...mv, currency: p.currency, uom: m.uom || 'Unit',
        });
        orders.push(
          derivePurchase({
            ...p, supplierId: supplier.id, supplierName: supplier.name, materialId: m.id, materialCode: code, materialName: m.name,
            poDate: day(p.poDate), requestedDeliveryDate: day(p.requestedDeliveryDate),
          })
        );
        m.prev = m.cur;
        m.cur = p.unitPrice;
        m.pct = mv.priceChangePct;
        touched.add(code);
      }

      const materialRows = [...newMaterials.values()].map((material) => {
        const m = materials.get(material.materialCode);
        const { supplierCode, ...rest } = material;
        const sup = suppliers.get(supplierCode);
        return { ...rest, standardPrice: m.standard, currentPrice: m.cur, previousPrice: m.prev, priceChangePct: m.pct, preferredSupplierId: sup.id, preferredSupplierName: sup.name };
      });
      for (const part of chunks(materialRows, SMALL_CHUNK)) await tx.material.createMany({ data: part });

      // existing materials: move their current price to the newest PO
      const existing = [...touched].filter((c) => !materials.get(c).isNew).map((c) => materials.get(c));
      for (const part of chunks(existing, SMALL_CHUNK)) {
        await tx.$executeRaw`UPDATE materials SET current_price = v.cur, previous_price = v.prev, price_change_pct = v.pct, updated_at = now()
          FROM unnest(${part.map((m) => m.id)}::text[], ${part.map((m) => m.cur)}::numeric[], ${part.map((m) => m.prev)}::numeric[], ${part.map((m) => m.pct)}::float8[]) AS v(id, cur, prev, pct)
          WHERE materials.id = v.id`;
      }

      for (const part of chunks(orders, ROW_CHUNK)) await tx.purchaseTransaction.createMany({ data: part });
      for (const part of chunks(history, SMALL_CHUNK)) await tx.priceHistory.createMany({ data: part });
      return { purchases: orders.length, suppliers: newSuppliers.length, materials: materialRows.length };
    },
    { timeout: 900000 }
  );

  // ---- 3. rescore the suppliers that got new orders, once
  const scored = [...new Set(fresh.map((r) => suppliers.get(r.supplier.supplierCode).id))];
  await scoring.recalculate(prisma, scored);
  Object.assign(report, { purchasesSaved: saved.purchases, suppliersCreated: saved.suppliers, materialsCreated: saved.materials });

  // ---- 4. the import log and one audit entry
  const failed = report.errors.length;
  await prisma.$transaction(async (tx) => {
    await auditQ.insertImport(tx, {
      datasetType: DATASET, fileName: String(fileName).slice(0, 255), totalRows, validRows: rows.length, importedRows: saved.purchases,
      errorRows: failed, status: failed === 0 ? 'COMPLETED' : 'PARTIAL', importedBy: actor.email, errors: report.errors.slice(0, 500),
    });
    await audit.log(
      { user: actor, action: 'IMPORT', module: 'Data Import', recordId: fileName, details: `ERP import ${fileName}: ${rows.length} raw lines, ${saved.purchases} new purchase orders${since ? ` since ${since}` : ''}, ${saved.suppliers} suppliers, ${saved.materials} materials` },
      tx
    );
  });
  return report;
}

module.exports = { importCsv, parse, DATASET };
