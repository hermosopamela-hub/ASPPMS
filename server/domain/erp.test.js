// Unit tests for the ERP export mapping. No database needed: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseNumber, parseDate, splitSupplier, materialCodeFor, missingColumns, mapRow } = require('./erp');

const row = (over = {}) => ({
  'ERP Legacy PO': '', 'Purchasing Document': '3911000003', 'Tax Code': 'I1', 'Gross Unit Price': '1,112.00', 'Net Price': '992.86',
  Material: '', 'Order Quantity': '4', 'Order Unit': 'GAL', Item: '2', 'Document Date': '1/5/2024',
  'Supplier/Supplying Plant': '3000824    SCOTTIE INC.', 'Short Text': 'Acrylic Paint White', 'Material Group': 'SU01001', Currency: 'PHP', 'Created By': 'PURCHASER06', ...over,
});

test('numbers: thousands separators, blanks and junk', () => {
  assert.equal(parseNumber('1,112.00'), 1112);
  assert.equal(parseNumber('12,000.000'), 12000);
  assert.equal(parseNumber(''), null);
  assert.equal(parseNumber('abc'), null);
});

test('dates are M/D/YYYY and must be real', () => {
  assert.equal(parseDate('1/5/2024'), '2024-01-05');
  assert.equal(parseDate('12/31/2024'), '2024-12-31');
  assert.equal(parseDate('13/1/2024'), null);
  assert.equal(parseDate('2/30/2024'), null);
  assert.equal(parseDate('2024-01-05'), null);
});

test('supplier text splits into code and name', () => {
  assert.deepEqual(splitSupplier('3000824    SCOTTIE INC.'), { code: '3000824', name: 'SCOTTIE INC.' });
  assert.deepEqual(splitSupplier('3000481    FIRST AUTO - LPG GAS HOLDINGS, CORP'), { code: '3000481', name: 'FIRST AUTO - LPG GAS HOLDINGS, CORP' });
});

test('a line without a material number gets a stable code', () => {
  assert.match(materialCodeFor(row()), /^MAT-SU01001-ACRYLICPAI-[0-9A-F]{6}$/);
  assert.equal(materialCodeFor(row()), materialCodeFor(row({ 'Short Text': 'ACRYLIC  PAINT white' }))); // case and spacing ignored
  assert.notEqual(materialCodeFor(row({ 'Short Text': 'Spray Paint Neon Orange' })), materialCodeFor(row({ 'Short Text': 'Spray Paint Neon Pink' })));
  assert.equal(materialCodeFor(row({ Material: '2000016023' })), '2000016023');
});

test('a row maps to raw record, supplier, material and a pending purchase order', () => {
  const m = mapRow(row(), 'a.csv');
  assert.equal(m.raw.id, 'ERP-3911000003-2');
  assert.equal(m.raw.sourceFile, 'a.csv');
  assert.equal(m.supplier.id, 'SUP-3000824');
  assert.match(m.material.id, /^MAT-SU01001-ACRYLICPAI-/);
  assert.equal(m.purchase.poNumber, 'PO-3911000003-02');
  assert.equal(m.purchase.unitPrice, 1112);
  assert.equal(m.purchase.requestedDeliveryDate, '2024-01-12');
  assert.equal(m.purchase.deliveryStatus, 'PENDING');
});

test('bad rows say what is wrong', () => {
  assert.throws(() => mapRow(row({ 'Document Date': 'soon' })), /Document Date/);
  assert.throws(() => mapRow(row({ 'Order Quantity': '0' })), /Order Quantity/);
  assert.throws(() => mapRow(row({ 'Gross Unit Price': '', 'Net Price': '' })), /Price/);
  assert.throws(() => mapRow(row({ Item: 'x' })), /Item/);
});

test('missing columns are listed', () => {
  assert.deepEqual(missingColumns(Object.keys(row())), []);
  assert.deepEqual(missingColumns(['Purchasing Document', 'Item']).includes('Document Date'), true);
});
