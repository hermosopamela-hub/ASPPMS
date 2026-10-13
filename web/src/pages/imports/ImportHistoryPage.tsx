import React, { useState } from 'react';
import { UploadCloud, CheckCircle, AlertTriangle, FileText, Download } from 'lucide-react';
import { dbService } from '../../services/db';
import { DataImportRecord } from '../../types';
import { DataTable, Column } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';

export const ImportHistoryPage: React.FC = () => {
  const [history] = useState<DataImportRecord[]>(() => {
    const list = dbService.getImportHistory();
    if (list.length === 0) {
      // Seed initial historical import record for audit
      return [
        {
          id: 'IMP-2026-0881',
          datasetType: 'Supplier Master',
          fileName: 'vendor_registry_q3.csv',
          totalRows: 20,
          validRows: 20,
          importedRows: 20,
          errorRows: 0,
          status: 'COMPLETED',
          importedBy: 'purchasing.analyst@ipi.ph',
          createdAt: '2026-10-01T08:30:00Z',
        },
        {
          id: 'IMP-2026-0882',
          datasetType: 'Material Master',
          fileName: 'materials_catalog_full.csv',
          totalRows: 50,
          validRows: 50,
          importedRows: 50,
          errorRows: 0,
          status: 'COMPLETED',
          importedBy: 'purchasing.analyst@ipi.ph',
          createdAt: '2026-10-01T08:45:00Z',
        },
        {
          id: 'IMP-2026-0883',
          datasetType: 'Purchase Transactions',
          fileName: 'q3_po_manifest_import.csv',
          totalRows: 125,
          validRows: 125,
          importedRows: 125,
          errorRows: 0,
          status: 'COMPLETED',
          importedBy: 'purchasing.analyst@ipi.ph',
          createdAt: '2026-10-02T10:15:00Z',
        },
      ];
    }
    return list;
  });

  const columns: Column<DataImportRecord>[] = [
    {
      key: 'id',
      header: 'Batch ID',
      sortable: true,
      className: 'font-mono text-xs font-semibold text-slate-800 w-32',
    },
    {
      key: 'datasetType',
      header: 'Dataset Ingested',
      sortable: true,
      render: (h) => (
        <div>
          <span className="font-semibold text-slate-900 block">{h.datasetType}</span>
          <span className="text-[11px] text-slate-400 font-mono">{h.fileName}</span>
        </div>
      ),
    },
    {
      key: 'totalRows',
      header: 'Total Rows',
      sortable: true,
      align: 'right',
      render: (h) => (
        <span className="font-mono text-xs font-tabular-nums text-slate-800">
          {h.totalRows}
        </span>
      ),
    },
    {
      key: 'importedRows',
      header: 'Imported',
      sortable: true,
      align: 'right',
      render: (h) => (
        <span className="font-mono text-xs font-bold text-emerald-700 font-tabular-nums">
          +{h.importedRows}
        </span>
      ),
    },
    {
      key: 'errorRows',
      header: 'Errors',
      sortable: true,
      align: 'right',
      render: (h) => (
        <span className={`font-mono text-xs font-tabular-nums ${h.errorRows > 0 ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
          {h.errorRows}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      align: 'center',
      render: (h) => (
        <Badge variant={h.status === 'COMPLETED' ? 'success' : h.status === 'PARTIAL' ? 'warning' : 'danger'}>
          {h.status}
        </Badge>
      ),
    },
    {
      key: 'importedBy',
      header: 'Staff',
      sortable: true,
      render: (h) => <span className="text-xs text-slate-600">{h.importedBy}</span>,
    },
    {
      key: 'createdAt',
      header: 'Timestamp',
      sortable: true,
      className: 'font-mono text-xs text-slate-500 w-32',
      render: (h) => h.createdAt.replace('T', ' ').substring(0, 19),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">
            Data Ingestion Batch Audit History
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit logs of all historical spreadsheet uploads, row commits, and error skips.
          </p>
        </div>
      </div>

      <DataTable
        data={history}
        columns={columns}
        searchPlaceholder="Search import batches by ID, file name, or user..."
        searchableKey={(h) => `${h.id} ${h.fileName} ${h.datasetType} ${h.importedBy}`}
        pageSize={10}
      />
    </div>
  );
};
