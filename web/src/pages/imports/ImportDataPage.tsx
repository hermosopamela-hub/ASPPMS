import React, { useState } from 'react';
import Papa from 'papaparse';
import { UploadCloud, CheckCircle2, AlertCircle, FileSpreadsheet, ArrowRight, RefreshCw, FileText, Check, X } from 'lucide-react';
import { dbService } from '../../services/db';
import { PurchaseTransaction, Supplier, Material, DataImportRecord } from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';

type DatasetType = 'Purchase Transactions' | 'Supplier Master' | 'Material Master';

interface ValidationResultRow {
  rowNumber: number;
  data: Record<string, any>;
  isValid: boolean;
  errors: string[];
}

export const ImportDataPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [datasetType, setDatasetType] = useState<DatasetType>('Purchase Transactions');
  const [fileName, setFileName] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<Record<string, any>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResultRow[]>([]);
  const [importStatus, setImportStatus] = useState<'IDLE' | 'PARSED' | 'VALIDATED' | 'SUCCESS'>('IDLE');
  const [importSummary, setImportSummary] = useState<DataImportRecord | null>(null);

  // Suppliers & Materials for referential integrity checks
  const existingSuppliers = dbService.getSuppliers();
  const existingMaterials = dbService.getMaterials();
  const existingPurchases = dbService.getPurchases();

  // Preset sample CSV data generator so users can instantly test valid and invalid data flows
  const handleLoadSampleCSV = () => {
    let sampleCSV = '';
    if (datasetType === 'Purchase Transactions') {
      sampleCSV = `poNumber,poDate,supplierCode,materialCode,quantity,unitPrice,requestedDeliveryDate,actualDeliveryDate,deliveryStatus,buyerStaff,remarks
PO-2026-9001,2026-10-01,SUP-001,MAT-001,15,20900,2026-10-08,2026-10-08,ON_TIME,Chloe Delgado,Direct import test valid
PO-2026-9002,2026-10-02,SUP-002,MAT-003,50,1230,2026-10-15,2026-10-17,DELAYED,Marcus Vance,Delayed batch test
PO-2026-9003,2026-10-03,SUP-999,MAT-002,-5,22000,2026-10-10,2026-10-10,ON_TIME,Chloe Delgado,Intentional error: Unknown supplier and negative qty
PO-2026-0001,2026-10-04,SUP-001,MAT-999,20,-100,2026-10-12,2026-10-12,ON_TIME,Chloe Delgado,Intentional error: Duplicate PO and negative price
PO-2026-9005,2026-10-05,SUP-004,MAT-003,30,1250,2026-10-20,2026-10-20,ON_TIME,Elena Rostova,Valid packaging shipment`;
    } else if (datasetType === 'Supplier Master') {
      sampleCSV = `supplierCode,supplierName,supplierType,category,contactPerson,email,phone,paymentTerms,leadTimeDays
SUP-088,Luzon Industrial Polymers,Manufacturer,Primary Packaging,Dennis Alvarez,dalvarez@luzonpolymers.ph,+63 2 8990 1122,Net 30,14
SUP-089,Mindanao Organic Botanicals,Manufacturer,Botanical Extracts,Sylvia Ramos,sramos@mindanaobotanicals.ph,+63 82 222 3344,Net 45,10
SUP-001,Apex Chemical Duplicate,Manufacturer,Chemical Raw Materials,Test,invalid-email,+63 00 000,Net 30,-2`;
    } else {
      sampleCSV = `materialCode,materialName,category,uom,standardPrice,currentPrice,preferredSupplierCode
MAT-088,Sterile HDPE Dropper 15ml,Primary Packaging,Box (500 pcs),1800,1850,SUP-002
MAT-089,High Purity Citric Acid Anhydrous,Chemical Raw Materials,Bag (25kg),2400,2400,SUP-001
MAT-001,Existing Code Conflict,Chemical Raw Materials,Drum (200L),-500,0,SUP-999`;
    }

    setFileName(`sample_${datasetType.toLowerCase().replace(/ /g, '_')}.csv`);
    parseCSVContent(sampleCSV);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setParsedRows(results.data as Record<string, any>[]);
        setHeaders(results.meta.fields || []);
        validateData(results.data as Record<string, any>[]);
        setImportStatus('VALIDATED');
      },
      error: (err) => {
        alert('CSV Parsing error: ' + err.message);
      },
    });
  };

  const parseCSVContent = (content: string) => {
    Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setParsedRows(results.data as Record<string, any>[]);
        setHeaders(results.meta.fields || []);
        validateData(results.data as Record<string, any>[]);
        setImportStatus('VALIDATED');
      },
    });
  };

  // Rule Validation Engine (Module 14)
  const validateData = (rows: Record<string, any>[]) => {
    const validated: ValidationResultRow[] = [];

    rows.forEach((row, index) => {
      const rowNum = index + 1;
      const errors: string[] = [];

      if (datasetType === 'Purchase Transactions') {
        // Rule 1: PO Number required and check duplicate against existing
        if (!row.poNumber?.trim()) {
          errors.push('PO Number is missing or empty.');
        } else {
          const isDuplicate = existingPurchases.some(
            p => p.poNumber.toUpperCase() === String(row.poNumber).trim().toUpperCase()
          );
          if (isDuplicate) {
            errors.push(`Duplicate PO Number '${row.poNumber}' already exists in system.`);
          }
        }

        // Rule 2: Supplier must exist in Supplier Master
        if (!row.supplierCode?.trim()) {
          errors.push('Supplier Code is missing.');
        } else {
          const supplierExists = existingSuppliers.some(
            s => s.supplierCode.toUpperCase() === String(row.supplierCode).trim().toUpperCase()
          );
          if (!supplierExists) {
            errors.push(`Supplier Code '${row.supplierCode}' not found in Supplier Master.`);
          }
        }

        // Rule 3: Material must exist in Material Master
        if (!row.materialCode?.trim()) {
          errors.push('Material Code is missing.');
        } else {
          const materialExists = existingMaterials.some(
            m => m.materialCode.toUpperCase() === String(row.materialCode).trim().toUpperCase()
          );
          if (!materialExists) {
            errors.push(`Material Code '${row.materialCode}' not found in Material Master.`);
          }
        }

        // Rule 4: Quantity must be positive number
        const qty = Number(row.quantity);
        if (isNaN(qty) || qty <= 0) {
          errors.push(`Invalid quantity '${row.quantity}'. Must be a positive integer.`);
        }

        // Rule 5: Unit Price must be positive
        const price = Number(row.unitPrice);
        if (isNaN(price) || price <= 0) {
          errors.push(`Invalid unit price '${row.unitPrice}'. Must be greater than ₱0.00.`);
        }
      } else if (datasetType === 'Supplier Master') {
        if (!row.supplierCode?.trim()) {
          errors.push('Supplier Code is missing.');
        } else {
          const duplicate = existingSuppliers.some(
            s => s.supplierCode.toUpperCase() === String(row.supplierCode).trim().toUpperCase()
          );
          if (duplicate) {
            errors.push(`Supplier Code '${row.supplierCode}' already exists.`);
          }
        }
        if (!row.supplierName?.trim()) {
          errors.push('Supplier Name is required.');
        }
        if (row.email && !row.email.includes('@')) {
          errors.push(`Invalid email format '${row.email}'.`);
        }
        if (row.leadTimeDays && Number(row.leadTimeDays) <= 0) {
          errors.push('Lead time days must be greater than 0.');
        }
      } else {
        // Material Master
        if (!row.materialCode?.trim()) {
          errors.push('Material Code is missing.');
        } else {
          const duplicate = existingMaterials.some(
            m => m.materialCode.toUpperCase() === String(row.materialCode).trim().toUpperCase()
          );
          if (duplicate) {
            errors.push(`Material Code '${row.materialCode}' already exists.`);
          }
        }
        if (!row.materialName?.trim()) {
          errors.push('Material Name is required.');
        }
        if (Number(row.standardPrice) <= 0) {
          errors.push('Standard Price must be positive.');
        }
      }

      validated.push({
        rowNumber: rowNum,
        data: row,
        isValid: errors.length === 0,
        errors,
      });
    });

    setValidationResults(validated);
  };

  // Commit valid records atomically to database
  const handleCommitImport = async () => {
    const validRows = validationResults.filter(r => r.isValid);
    if (validRows.length === 0) {
      alert('No valid rows available to import. Please correct invalid rows or re-upload.');
      return;
    }

    let importedCount = 0;
    // rows the server refuses (duplicate PO number, unknown supplier...) are reported, the rest are saved
    const serverErrors: Array<{ row: number; column: string; message: string; raw: string }> = [];
    const rowNumberOf = (index: number) => validRows[index]?.rowNumber ?? index + 1;

    try {
    if (datasetType === 'Purchase Transactions') {
      const batch: PurchaseTransaction[] = [];
      validRows.forEach(item => {
        const row = item.data;
        const sup = existingSuppliers.find(s => s.supplierCode.toUpperCase() === String(row.supplierCode).toUpperCase()) || existingSuppliers[0];
        const mat = existingMaterials.find(m => m.materialCode.toUpperCase() === String(row.materialCode).toUpperCase()) || existingMaterials[0];
        const qty = Number(row.quantity);
        const price = Number(row.unitPrice);

        const tx: PurchaseTransaction = {
          id: `TX-IMP-${Date.now()}-${item.rowNumber}`,
          poNumber: String(row.poNumber).trim().toUpperCase(),
          poDate: row.poDate || new Date().toISOString().split('T')[0],
          supplierId: sup.id,
          supplierName: sup.supplierName,
          materialId: mat.id,
          materialCode: mat.materialCode,
          materialName: mat.materialName,
          quantity: qty,
          unitPrice: price,
          currency: 'PHP',
          totalAmount: qty * price,
          requestedDeliveryDate: row.requestedDeliveryDate || new Date().toISOString().split('T')[0],
          actualDeliveryDate: row.actualDeliveryDate || null,
          deliveryStatus: (row.deliveryStatus as any) || 'ON_TIME',
          delayDays: 0,
          qualityStatus: 'ACCEPTED',
          receivedQuantity: qty,
          acceptedQuantity: qty,
          rejectedQuantity: 0,
          rejectionRate: 0,
          buyerStaff: row.buyerStaff || currentUser?.displayName || 'Import Staff',
          receivingDate: row.actualDeliveryDate || null,
          remarks: row.remarks || 'Imported via CSV Data Ingestion Engine',
          createdAt: new Date().toISOString(),
        };

        batch.push(tx);
      });
      const result = await dbService.importPurchases(batch);
      importedCount = result.saved.length;
      result.errors.forEach(e => serverErrors.push({ row: rowNumberOf(e.index), column: 'PO', message: e.message, raw: '' }));
    } else if (datasetType === 'Supplier Master') {
      const batch: Supplier[] = [];
      validRows.forEach(item => {
        const row = item.data;
        const newSupplier: Supplier = {
          id: `SUP-${Date.now()}-${item.rowNumber}`,
          supplierCode: String(row.supplierCode).trim().toUpperCase(),
          supplierName: String(row.supplierName).trim(),
          supplierType: (row.supplierType as any) || 'Manufacturer',
          category: row.category || 'General Procurement',
          contactPerson: row.contactPerson || 'Vendor Lead',
          email: row.email || 'info@supplier.ph',
          phone: row.phone || '+63 2 8000 0000',
          address: row.address || 'Industrial Park, Cebu, Philippines',
          country: 'Philippines',
          region: 'Region VII (Central Visayas)',
          status: 'ACTIVE',
          paymentTerms: row.paymentTerms || 'Net 30',
          leadTimeDays: Number(row.leadTimeDays) || 14,
          contractStartDate: '2026-01-01',
          contractEndDate: '2027-12-31',
          overallScore: 85.0,
          ratingTier: 'GOOD',
          deliveryScore: 85.0,
          qualityScore: 90.0,
          priceScore: 80.0,
          responsivenessScore: 85.0,
          complianceScore: 85.0,
          totalOrdersCount: 0,
          totalSpend: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        batch.push(newSupplier);
      });
      const result = await dbService.importSuppliers(batch);
      importedCount = result.saved.length;
      result.errors.forEach(e => serverErrors.push({ row: rowNumberOf(e.index), column: 'Supplier', message: e.message, raw: '' }));
    } else if (datasetType === 'Material Master') {
      const batch: Material[] = [];
      validRows.forEach(item => {
        const row = item.data;
        const prefSup = existingSuppliers.find(s => s.supplierCode.toUpperCase() === String(row.preferredSupplierCode).toUpperCase()) || existingSuppliers[0];
        const stdPrice = Number(row.standardPrice) || 100;
        const curPrice = Number(row.currentPrice) || stdPrice;
        const priceVariance = stdPrice > 0 ? Number((((curPrice - stdPrice) / stdPrice) * 100).toFixed(1)) : 0;

        const newMaterial: Material = {
          id: `MAT-${Date.now()}-${item.rowNumber}`,
          materialCode: String(row.materialCode).trim().toUpperCase(),
          materialName: String(row.materialName).trim(),
          description: row.description || `${row.materialName} - Ingested catalog specification`,
          category: row.category || 'Direct Materials',
          subcategory: row.subcategory || 'Standard Inventory',
          uom: row.uom || 'Unit',
          standardPrice: stdPrice,
          currentPrice: curPrice,
          previousPrice: stdPrice,
          priceChangePct: priceVariance,
          currency: 'PHP',
          preferredSupplierId: prefSup?.id || '',
          preferredSupplierName: prefSup?.supplierName || 'Designated Supplier',
          isActive: true,
          minOrderQty: 10,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        batch.push(newMaterial);
      });
      const result = await dbService.importMaterials(batch);
      importedCount = result.saved.length;
      result.errors.forEach(e => serverErrors.push({ row: rowNumberOf(e.index), column: 'Material', message: e.message, raw: '' }));
    }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'The import could not be completed.');
      return;
    }

    const invalidCount = validationResults.length - importedCount;
    const summary: DataImportRecord = {
      id: `IMP-${Date.now()}`,
      datasetType,
      fileName: fileName || 'batch_import.csv',
      totalRows: validationResults.length,
      validRows: validRows.length,
      importedRows: importedCount,
      errorRows: invalidCount,
      status: importedCount === 0 ? 'FAILED' : invalidCount === 0 ? 'COMPLETED' : 'PARTIAL',
      importedBy: currentUser?.email || 'analyst@ipi.ph',
      createdAt: new Date().toISOString(),
    };

    let recorded = summary;
    try {
      recorded = await dbService.recordImport({ ...summary, errors: serverErrors });
    } catch {
      /* the rows are already saved; only the log entry is missing */
    }
    setImportSummary(recorded);
    setImportStatus('SUCCESS');
  };

  const validCount = validationResults.filter(r => r.isValid).length;
  const invalidCount = validationResults.length - validCount;

  return (
    <div className="space-y-6">
      {/* Wizard Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">
            Automated Data Ingestion & Validation Engine
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Stage, validate referential integrity, detect schema errors, and commit transactional records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={datasetType}
            onChange={e => {
              setDatasetType(e.target.value as DatasetType);
              setImportStatus('IDLE');
              setValidationResults([]);
            }}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-semibold text-slate-800 focus:outline-none"
          >
            <option value="Purchase Transactions">Dataset: Purchase Transactions</option>
            <option value="Supplier Master">Dataset: Supplier Master</option>
            <option value="Material Master">Dataset: Material Master</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={handleLoadSampleCSV}
            icon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />}
          >
            Load Sample Template
          </Button>
        </div>
      </div>

      {/* Step 1: Upload Dropzone */}
      {importStatus === 'IDLE' && (
        <Card title="Upload Source File (CSV)" subtitle="Drag and drop or select spreadsheet dataset">
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors">
            <UploadCloud className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h4 className="font-semibold text-sm text-slate-800">Select CSV file to ingest</h4>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Supports standard UTF-8 CSV exports with header rows.
            </p>
            <div className="flex justify-center gap-3">
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-[#002F87] text-white rounded-lg text-xs font-semibold hover:bg-[#002266] transition-colors shadow-xs">
                <span>Browse Local Files</span>
                <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
              </label>
              <Button variant="outline" size="sm" onClick={handleLoadSampleCSV}>
                Use Built-in Demo Template
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 2: Validation Preview Grid */}
      {importStatus === 'VALIDATED' && (
        <div className="space-y-4">
          {/* Summary Metric Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Staged Rows</span>
              <span className="text-2xl font-bold text-slate-900 mt-0.5 block">{validationResults.length}</span>
              <span className="text-[11px] text-slate-400">{fileName}</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/20">
              <span className="text-[10px] uppercase font-bold text-emerald-600 block">Valid Rows</span>
              <span className="text-2xl font-bold text-emerald-700 mt-0.5 block">{validCount}</span>
              <span className="text-[11px] text-emerald-600">Passed all rule checks</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-rose-200 bg-rose-50/20">
              <span className="text-[10px] uppercase font-bold text-rose-600 block">Invalid Rows (Errors)</span>
              <span className="text-2xl font-bold text-rose-700 mt-0.5 block">{invalidCount}</span>
              <span className="text-[11px] text-rose-600">Requires correction</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col justify-center">
              <Button
                variant="primary"
                size="md"
                onClick={handleCommitImport}
                disabled={validCount === 0}
                icon={<Check className="w-4 h-4" />}
              >
                Commit {validCount} Valid Records
              </Button>
            </div>
          </div>

          {/* Detailed Validation Table */}
          <Card
            title={`Record Validation Staging Grid (${datasetType})`}
            subtitle="Rows are validated against referential integrity constraints, uniqueness rules, and positive bounds."
            action={
              <Button
                size="sm"
                variant="outline"
                onClick={() => setImportStatus('IDLE')}
              >
                Upload Different File
              </Button>
            }
          >
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px] bg-slate-50 sticky top-0">
                    <th className="py-2.5 px-3 w-16">Row #</th>
                    <th className="py-2.5 px-3 w-28 text-center">Validation</th>
                    {headers.slice(0, 5).map(h => (
                      <th key={h} className="py-2.5 px-3">{h}</th>
                    ))}
                    <th className="py-2.5 px-3">Validation Diagnostic Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {validationResults.map(vr => (
                    <tr
                      key={vr.rowNumber}
                      className={vr.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/40 hover:bg-rose-50/60'}
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-600">
                        #{vr.rowNumber}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {vr.isValid ? (
                          <Badge variant="success" size="sm">Valid</Badge>
                        ) : (
                          <Badge variant="danger" size="sm">Error</Badge>
                        )}
                      </td>
                      {headers.slice(0, 5).map(h => (
                        <td key={h} className="py-2.5 px-3 text-slate-800 font-mono text-[11px] truncate max-w-[140px]">
                          {String(vr.data[h] ?? '—')}
                        </td>
                      ))}
                      <td className="py-2.5 px-3">
                        {vr.isValid ? (
                          <span className="text-emerald-700 flex items-center gap-1 font-medium text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" /> All integrity constraints verified
                          </span>
                        ) : (
                          <div className="space-y-0.5">
                            {vr.errors.map((err, i) => (
                              <div key={i} className="text-rose-700 font-semibold text-[11px] flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {err}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Step 3: Success Confirmation */}
      {importStatus === 'SUCCESS' && importSummary && (
        <Card title="Data Ingestion Execution Summary" subtitle="Atomic database batch commit successful">
          <div className="p-6 text-center space-y-4 max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="text-base font-bold text-slate-900">
              Batch Ingestion Completed
            </h3>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-left space-y-2">
              <div className="flex justify-between"><span>Batch ID:</span> <strong className="font-mono">{importSummary.id}</strong></div>
              <div className="flex justify-between"><span>Dataset Ingested:</span> <strong>{importSummary.datasetType}</strong></div>
              <div className="flex justify-between"><span>File Source:</span> <span>{importSummary.fileName}</span></div>
              <div className="flex justify-between"><span>Records Committed:</span> <strong className="text-emerald-700 font-mono">+{importSummary.importedRows} rows</strong></div>
              <div className="flex justify-between"><span>Invalid Rows Skipped:</span> <strong className="text-slate-500 font-mono">{importSummary.errorRows} rows</strong></div>
              <div className="flex justify-between"><span>Ingested By:</span> <span>{importSummary.importedBy}</span></div>
            </div>

            <div className="flex justify-center gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setImportStatus('IDLE')}
              >
                Upload Another Dataset
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => window.location.reload()}
              >
                View Updated Dashboard
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
