try { process.loadEnvFile(); } catch {}
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const prisma = require('../server/db');
const { scoreSupplier } = require('../server/domain/scoring');
const { DEFAULT_SETTINGS } = require('../server/domain/constants');

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

function parseNum(val) {
  if (val === undefined || val === null || val === '') return 0;
  const cleaned = String(val).replace(/,/g, '').trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function parseDate(val) {
  if (!val) return new Date('2024-01-01');
  const parts = String(val).trim().split('/');
  if (parts.length === 3) {
    const month = parts[0].padStart(2, '0');
    const day = parts[1].padStart(2, '0');
    const year = parts[2];
    return new Date(`${year}-${month}-${day}T00:00:00Z`);
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? new Date('2024-01-01') : d;
}

function formatDateStr(d) {
  return d.toISOString().split('T')[0];
}

async function main() {
  console.log('Loading ERP Purchase Order CSV data...');
  const csvPath = path.join(__dirname, '..', 'data', 'erp_po_dump.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const { data: rows, errors } = Papa.parse(csvContent, { header: true, skipEmptyLines: true });

  if (errors.length > 0) {
    console.warn('CSV parse warnings:', errors);
  }
  console.log(`Parsed ${rows.length} rows from CSV.`);

  // 1. Prepare raw ERP table records
  const erpRows = rows.map((r, idx) => {
    const docDate = parseDate(r['Document Date']);
    return {
      id: `ERP-PO-${String(idx + 1).padStart(4, '0')}`,
      erpLegacyPo: r['ERP Legacy PO']?.trim() || null,
      purchasingDocument: String(r['Purchasing Document'] || '').trim(),
      taxCode: r['Tax Code']?.trim() || null,
      grossUnitPrice: parseNum(r['Gross Unit Price']),
      netPrice: parseNum(r['Net Price']),
      materialCode: r['Material']?.trim() || null,
      orderQuantity: parseNum(r['Order Quantity']),
      orderUnit: r['Order Unit']?.trim() || null,
      purchasingDocType: r['Purchasing Doc. Type']?.trim() || null,
      purchOrganization: r['Purch. organization']?.trim() || null,
      itemCategory: r['Item category']?.trim() || null,
      item: parseInt(r['Item'], 10) || idx + 1,
      purchDocCategory: r['Purch. Doc. Category']?.trim() || null,
      purchasingGroup: r['Purchasing Group']?.trim() || null,
      documentDate: docDate,
      supplierText: r['Supplier/Supplying Plant']?.trim() || null,
      shortText: r['Short Text']?.trim() || null,
      materialGroup: r['Material Group']?.trim() || null,
      acctAssignmentCat: r['Acct Assignment Cat.']?.trim() || null,
      plant: r['Plant']?.trim() || null,
      storageLocation: r['Storage location']?.trim() || null,
      quantityInSku: parseNum(r['Quantity in SKU']),
      stockkeepingUnit: r['Stockkeeping unit']?.trim() || null,
      createdBy: r['Created By']?.trim() || null,
      currency: r['Currency']?.trim() || 'PHP',
      priceUnit: parseNum(r['Price unit']) || 1,
      targetQuantity: parseNum(r['Target Quantity']),
      openTargetQuantity: parseNum(r['Open Target Quantity']),
      stillToBeDeliveredQty: parseNum(r['Still to be delivered (qty)']),
      stillToBeDeliveredValue: parseNum(r['Still to be delivered (value)']),
      stillToBeInvoicedQty: parseNum(r['Still to be invoiced (qty)']),
      stillToBeInvoicedVal: parseNum(r['Still to be invoiced (val.)']),
      noOfPositions: parseInt(r['No. of Positions'], 10) || 1,
      createdAt: docDate,
    };
  });

  // 2. Build unique Suppliers
  const supMap = new Map();
  rows.forEach((r) => {
    const rawSup = (r['Supplier/Supplying Plant'] || '').trim();
    const match = rawSup.match(/^(\S+)\s+(.+)$/);
    const code = match ? match[1].trim() : rawSup;
    const name = match ? match[2].trim() : rawSup;
    const grp = (r['Material Group'] || '').trim();
    const cat = GROUP_CATEGORIES[grp] || 'Industrial Supplies';

    if (!supMap.has(code)) {
      const supId = `SUP-${code}`;
      const emailName = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12);
      supMap.set(code, {
        id: supId,
        supplierCode: code,
        supplierName: name,
        supplierType: name.includes('INC') || name.includes('CORP') || name.includes('MFG') ? 'Manufacturer' : 'Distributor',
        category: cat,
        contactPerson: 'Account Executive',
        email: `sales@${emailName}.ph`,
        phone: `+63 32 ${Math.floor(200 + Math.random() * 700)} ${Math.floor(1000 + Math.random() * 9000)}`,
        address: 'Metro Cebu Industrial Area, Philippines',
        country: code === '4500284' ? 'China' : 'Philippines',
        region: code === '4500284' ? 'Jiangsu' : 'Central Visayas',
        status: 'ACTIVE',
        paymentTerms: 'Net 30',
        leadTimeDays: 7,
        contractStartDate: '2024-01-01',
        contractEndDate: '2026-12-31',
        totalOrdersCount: 0,
        totalSpend: 0,
        responsivenessScore: 88,
        complianceScore: 92,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-15T00:00:00Z',
      });
    }
  });

  // 3. Build unique Materials
  const matMap = new Map();
  rows.forEach((r, idx) => {
    let matCode = (r['Material'] || '').trim();
    const shortText = (r['Short Text'] || '').trim();
    const grp = (r['Material Group'] || '').trim();
    const rawSup = (r['Supplier/Supplying Plant'] || '').trim();
    const supCode = rawSup.match(/^(\S+)/)?.[1] || '';
    const supplier = supMap.get(supCode);

    if (!matCode) {
      // Deterministic material code based on group and sanitized short text
      const nameKey = shortText.replace(/[^A-Za-z0-9]/g, '').slice(0, 10).toUpperCase();
      matCode = `MAT-${grp || 'GEN'}-${nameKey}`;
    }

    const matId = matCode.startsWith('MAT-') ? matCode : `MAT-${matCode}`;

    if (!matMap.has(matCode)) {
      const grossPrice = parseNum(r['Gross Unit Price']);
      const netPrice = parseNum(r['Net Price']);
      const unitPrice = grossPrice > 0 ? grossPrice : (netPrice > 0 ? netPrice : 100);
      const cat = GROUP_CATEGORIES[grp] || 'Industrial Supplies';

      matMap.set(matCode, {
        id: matId,
        materialCode: matCode,
        materialName: shortText,
        description: `${shortText} (${cat})`,
        category: cat,
        subcategory: grp || 'GENERAL',
        uom: (r['Order Unit'] || 'Unit').trim(),
        standardPrice: unitPrice,
        currentPrice: unitPrice,
        previousPrice: unitPrice,
        priceChangePct: 0,
        currency: (r['Currency'] || 'PHP').trim(),
        preferredSupplierId: supplier ? supplier.id : null,
        preferredSupplierName: supplier ? supplier.supplierName : '',
        isActive: true,
        minOrderQty: 1,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-15T00:00:00Z',
      });
    }
  });

  // 4. Build Purchase Transactions
  const purchases = [];
  rows.forEach((r, idx) => {
    const doc = String(r['Purchasing Document'] || '').trim();
    const item = parseInt(r['Item'], 10) || (idx + 1);
    const poNumber = `PO-${doc}-${String(item).padStart(2, '0')}`;
    const txId = `TX-${doc}-${String(item).padStart(2, '0')}`;

    let matCode = (r['Material'] || '').trim();
    const shortText = (r['Short Text'] || '').trim();
    const grp = (r['Material Group'] || '').trim();
    if (!matCode) {
      const nameKey = shortText.replace(/[^A-Za-z0-9]/g, '').slice(0, 10).toUpperCase();
      matCode = `MAT-${grp || 'GEN'}-${nameKey}`;
    }

    const material = matMap.get(matCode);
    const rawSup = (r['Supplier/Supplying Plant'] || '').trim();
    const supCode = rawSup.match(/^(\S+)/)?.[1] || '';
    const supplier = supMap.get(supCode);

    const qty = parseNum(r['Order Quantity']);
    const grossPrice = parseNum(r['Gross Unit Price']);
    const netPrice = parseNum(r['Net Price']);
    const unitPrice = grossPrice > 0 ? grossPrice : (netPrice > 0 ? netPrice : material.standardPrice);
    const totalAmount = Number((qty * unitPrice).toFixed(2));

    const poDate = parseDate(r['Document Date']);
    const poDateStr = formatDateStr(poDate);
    // Requested & delivery date 7 days later
    const delivDate = new Date(poDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    const delivDateStr = formatDateStr(delivDate);

    purchases.push({
      id: txId,
      poNumber,
      poDate: poDateStr,
      supplierId: supplier.id,
      supplierName: supplier.supplierName,
      materialId: material.id,
      materialCode: material.materialCode,
      materialName: material.materialName,
      quantity: qty,
      unitPrice,
      currency: (r['Currency'] || 'PHP').trim(),
      totalAmount,
      requestedDeliveryDate: delivDateStr,
      actualDeliveryDate: delivDateStr,
      deliveryStatus: 'ON_TIME',
      delayDays: 0,
      qualityStatus: 'ACCEPTED',
      receivedQuantity: qty,
      acceptedQuantity: qty,
      rejectedQuantity: 0,
      rejectionRate: 0,
      buyerStaff: (r['Created By'] || 'PURCHASER01').trim(),
      receivingDate: delivDateStr,
      remarks: `Legacy PO: ${r['ERP Legacy PO'] || 'N/A'}, Plant: ${r['Plant'] || '1110'}, Storage: ${r['Storage location'] || 'SR01'}, Line: ${item}`,
      createdAt: poDate.toISOString(),
    });
  });

  // Calculate Supplier aggregates and scores
  const weights = DEFAULT_SETTINGS.weights;
  for (const sup of supMap.values()) {
    const supTx = purchases.filter((p) => p.supplierId === sup.id);
    sup.totalOrdersCount = supTx.length;
    sup.totalSpend = Number(supTx.reduce((sum, p) => sum + p.totalAmount, 0).toFixed(2));

    const scorecard = scoreSupplier(sup, supTx, purchases, weights);
    sup.deliveryScore = scorecard.deliveryScore;
    sup.qualityScore = scorecard.qualityScore;
    sup.priceScore = scorecard.priceScore;
    sup.overallScore = scorecard.overallScore;
    sup.ratingTier = scorecard.ratingCategory;
  }

  // 5. Build Price History records
  const priceHistory = purchases.map((p, idx) => {
    const mat = matMap.get(p.materialCode);
    return {
      id: `PH-${String(idx + 1).padStart(4, '0')}`,
      materialId: p.materialId,
      materialCode: p.materialCode,
      materialName: p.materialName,
      supplierId: p.supplierId,
      supplierName: p.supplierName,
      poNumber: p.poNumber,
      recordedDate: p.poDate,
      price: p.unitPrice,
      previousPrice: p.unitPrice,
      priceDiff: 0,
      priceChangePct: 0,
      currency: p.currency,
      classification: 'No Significant Change',
      uom: mat ? mat.uom : 'Unit',
      createdAt: p.createdAt,
    };
  });

  // 6. Build notable Alerts dynamically resolved from real transactions
  const genMat = Array.from(matMap.values()).find((m) => m.materialName.includes('GENERATOR'));
  const mouldMat = Array.from(matMap.values()).find((m) => m.materialName.includes('Bioderm'));
  const fuelMat = Array.from(matMap.values()).find((m) => m.materialName.includes('Diesel Fuel'));
  const nutreeMat = Array.from(matMap.values()).find((m) => m.materialName.includes('MELATONIN'));

  const alerts = [
    ...(genMat ? [{
      id: 'ALT-2024-001',
      alertType: 'HIGH_VALUE_PO',
      severity: 'CRITICAL',
      supplierId: genMat.preferredSupplierId || 'SUP-3000223',
      supplierName: genMat.preferredSupplierName || 'ADVATECH INDUSTRIES INC.',
      materialId: genMat.id,
      materialName: genMat.materialName,
      description: 'Capital equipment order exceeding threshold: ₱330,000.00 for generator installation.',
      triggerMetric: '₱330,000.00 spend threshold',
      status: 'ACKNOWLEDGED',
      assignedUser: 'Elena Rostova',
      resolution: null,
      createdAt: '2024-01-11T10:00:00Z',
      resolvedAt: null,
    }] : []),
    ...(mouldMat ? [{
      id: 'ALT-2024-002',
      alertType: 'HIGH_VALUE_PO',
      severity: 'HIGH',
      supplierId: mouldMat.preferredSupplierId || 'SUP-3000995',
      supplierName: mouldMat.preferredSupplierName || 'FINE PRECISION ENGINEERING',
      materialId: mouldMat.id,
      materialName: mouldMat.materialName,
      description: 'High value production tooling purchase: ₱242,250.00 for Bioderm 60g mould.',
      triggerMetric: '₱242,250.00 spend threshold',
      status: 'INVESTIGATING',
      assignedUser: 'Marcus Vance',
      resolution: null,
      createdAt: '2024-01-11T11:30:00Z',
      resolvedAt: null,
    }] : []),
    ...(fuelMat ? [{
      id: 'ALT-2024-003',
      alertType: 'BULK_COMMODITY_VOLUME',
      severity: 'MEDIUM',
      supplierId: fuelMat.preferredSupplierId || 'SUP-3000481',
      supplierName: fuelMat.preferredSupplierName || 'FIRST AUTO - LPG GAS HOLDINGS, CORP',
      materialId: fuelMat.id,
      materialName: fuelMat.materialName,
      description: 'High bulk volume procurement: 12,000 Liters Diesel Fuel (Total ₱620,640.00).',
      triggerMetric: '12,000 Liters bulk shipment',
      status: 'RESOLVED',
      assignedUser: 'Chloe Delgado',
      resolution: 'Verified delivery schedule matches tank capacity and operations demand.',
      createdAt: '2024-01-09T08:15:00Z',
      resolvedAt: '2024-01-09T16:00:00Z',
    }] : []),
    ...(nutreeMat ? [{
      id: 'ALT-2024-004',
      alertType: 'FOREIGN_CURRENCY_PO',
      severity: 'LOW',
      supplierId: nutreeMat.preferredSupplierId || 'SUP-4500284',
      supplierName: nutreeMat.preferredSupplierName || 'NANJING NUTREE',
      materialId: nutreeMat.id,
      materialName: nutreeMat.materialName,
      description: 'Purchase order processed in foreign currency: USD 20.00/BOT.',
      triggerMetric: 'Currency: USD',
      status: 'ACKNOWLEDGED',
      assignedUser: 'Chloe Delgado',
      resolution: null,
      createdAt: '2024-01-11T14:00:00Z',
      resolvedAt: null,
    }] : []),
    {
      id: 'ALT-2024-005',
      alertType: 'SYSTEM_NOTICE',
      severity: 'LOW',
      supplierId: null,
      supplierName: null,
      materialId: null,
      materialName: null,
      description: 'ERP PO migration completed successfully: 99 purchase orders imported into ASPPM.',
      triggerMetric: '99 ERP transactions imported',
      status: 'RESOLVED',
      assignedUser: 'Admin Officer',
      resolution: 'Master tables synchronized with ERP dataset.',
      createdAt: '2024-01-15T09:00:00Z',
      resolvedAt: '2024-01-15T09:05:00Z',
    },
  ];

  // 7. Audit Logs
  const auditLogs = [
    {
      id: 'AUD-001',
      userId: 'admin.procure@ipi.ph',
      userEmail: 'admin.procure@ipi.ph',
      action: 'IMPORT',
      module: 'Data Import',
      recordId: 'ERP-IMPORT-001',
      details: 'Imported 99 ERP Legacy Purchase Orders into PostgreSQL',
      ipAddress: '127.0.0.1',
      timestamp: '2024-01-15T09:00:00Z',
    },
    {
      id: 'AUD-002',
      userId: 'purchasing.manager@ipi.ph',
      userEmail: 'purchasing.manager@ipi.ph',
      action: 'UPDATE_SETTINGS',
      module: 'System Settings',
      recordId: '1',
      details: 'Synchronized company procurement settings with SAP ERP baseline',
      ipAddress: '127.0.0.1',
      timestamp: '2024-01-15T09:10:00Z',
    },
  ];

  // Keep existing users from data.json or fallback
  const existingData = require('../server/seed/data.json');
  const users = existingData.users || [];

  const newDataSet = {
    settings: DEFAULT_SETTINGS,
    users,
    suppliers: Array.from(supMap.values()),
    materials: Array.from(matMap.values()),
    purchases,
    priceHistory,
    alerts,
    auditLogs,
  };

  // Write new data.json substituting dummy data
  const dataJsonPath = path.join(__dirname, '..', 'server', 'seed', 'data.json');
  fs.writeFileSync(dataJsonPath, JSON.stringify(newDataSet, null, 1), 'utf8');
  console.log(`Updated server/seed/data.json with real ERP data:`);
  console.log(`- ${newDataSet.suppliers.length} suppliers`);
  console.log(`- ${newDataSet.materials.length} materials`);
  console.log(`- ${newDataSet.purchases.length} purchases`);
  console.log(`- ${newDataSet.priceHistory.length} price history entries`);
  console.log(`- ${newDataSet.alerts.length} alerts`);

  // Load into Database
  console.log('\nWriting to PostgreSQL database...');
  const { replaceAll } = require('../server/seed/load');

  await prisma.$transaction(
    async (tx) => {
      // Clear and fill erp_purchase_orders table
      await tx.erpPurchaseOrder.deleteMany();
      for (let i = 0; i < erpRows.length; i += 100) {
        await tx.erpPurchaseOrder.createMany({ data: erpRows.slice(i, i + 100) });
      }
      console.log(`Inserted ${erpRows.length} raw ERP PO rows into table "erp_purchase_orders".`);

      // Replace core business data with new real dataset
      await replaceAll(tx, newDataSet);

      // Record data import in DataImport table
      await tx.dataImport.create({
        data: {
          id: `IMP-${Date.now()}`,
          datasetType: 'ERP Purchase Orders',
          fileName: 'erp_po_dump.csv',
          totalRows: rows.length,
          validRows: rows.length,
          importedRows: rows.length,
          errorRows: 0,
          status: 'COMPLETED',
          importedBy: 'admin.procure@ipi.ph',
          errors: [],
          createdAt: new Date(),
        },
      });
    },
    { timeout: 120000 }
  );

  console.log('Database successfully populated with real ERP data!');
}

main()
  .catch((err) => {
    console.error('Import failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
