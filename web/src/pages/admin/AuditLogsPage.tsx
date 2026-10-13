import React, { useState } from 'react';
import { ShieldCheck, Filter, Download, Clock, Eye, Info } from 'lucide-react';
import { dbService } from '../../services/db';
import { AuditLogItem } from '../../types';
import { DataTable, Column } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';

export const AuditLogsPage: React.FC = () => {
  const [logs] = useState<AuditLogItem[]>(() => dbService.getAuditLogs());
  const [filterModule, setFilterModule] = useState<string>('ALL');
  const [filterAction, setFilterAction] = useState<string>('ALL');
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const filteredLogs = logs.filter(l => {
    const matchMod = filterModule === 'ALL' || l.module === filterModule;
    const matchAct = filterAction === 'ALL' || l.action === filterAction;
    return matchMod && matchAct;
  });

  const columns: Column<AuditLogItem>[] = [
    {
      key: 'timestamp',
      header: 'Timestamp',
      sortable: true,
      className: 'font-mono text-xs text-slate-500 w-40',
      render: (l) => l.timestamp.replace('T', ' ').substring(0, 19),
    },
    {
      key: 'userEmail',
      header: 'Acting User',
      sortable: true,
      render: (l) => (
        <span className="font-semibold text-slate-800 text-xs block truncate max-w-[170px]">
          {l.userEmail}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      sortable: true,
      align: 'center',
      render: (l) => {
        const variants: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'neutral'> = {
          CREATE: 'success',
          UPDATE: 'primary',
          DELETE: 'danger',
          LOGIN: 'neutral',
          RESOLVE_ALERT: 'warning',
          UPDATE_SETTINGS: 'primary',
          IMPORT: 'purple' as any,
        };
        return <Badge variant={variants[l.action] || 'neutral'}>{l.action}</Badge>;
      },
    },
    {
      key: 'module',
      header: 'Subsystem / Module',
      sortable: true,
      render: (l) => <span className="font-medium text-slate-700 text-xs">{l.module}</span>,
    },
    {
      key: 'recordId',
      header: 'Target Record',
      className: 'font-mono text-xs text-slate-500 w-28',
      render: (l) => l.recordId || '—',
    },
    {
      key: 'details',
      header: 'Change Diff / Narrative',
      render: (l) => (
        <button
          onClick={() => setSelectedLog(l)}
          className="text-left text-slate-600 hover:text-[#002F87] text-xs truncate max-w-sm block transition-colors font-medium cursor-pointer"
          title="Click to inspect event details"
        >
          {l.details}
        </button>
      ),
    },
    {
      key: 'inspect',
      header: 'Inspect',
      align: 'right',
      render: (l) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setSelectedLog(l)}
          icon={<Eye className="w-3.5 h-3.5 text-slate-500" />}
        >
          View
        </Button>
      ),
    },
  ];

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'Acting User', 'Action', 'Module', 'Record ID', 'Details'];
    const rows = filteredLogs.map(l => [
      l.timestamp,
      `"${l.userEmail}"`,
      l.action,
      `"${l.module}"`,
      l.recordId,
      `"${l.details.replace(/"/g, '""')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const modulesList = ['ALL', 'Purchases', 'Suppliers', 'Materials', 'Alerts', 'System Settings', 'User Management', 'Data Ingestion'];
  const actionsList = ['ALL', 'CREATE', 'UPDATE', 'DELETE', 'RESOLVE_ALERT', 'UPDATE_SETTINGS', 'IMPORT', 'LOGIN'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">
            System Regulatory Audit Trail & Governance Logs
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable log of all data transactions, system configuration adjustments, role elevations, and alert resolutions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            icon={<Download className="w-3.5 h-3.5" />}
          >
            Export Audit Trail (CSV)
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-400 font-semibold uppercase text-[10px] mr-1">Module:</span>
          {modulesList.map(mod => (
            <button
              key={mod}
              onClick={() => setFilterModule(mod)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                filterModule === mod
                  ? 'bg-[#002F87] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {mod}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-semibold uppercase text-[10px]">Action:</span>
          <select
            value={filterAction}
            onChange={e => setFilterAction(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none"
          >
            {actionsList.map(act => (
              <option key={act} value={act}>{act}</option>
            ))}
          </select>
        </div>
      </div>

      <DataTable
        data={filteredLogs}
        columns={columns}
        searchPlaceholder="Search audit events by user, record ID, or details..."
        searchableKey={(l) => `${l.userEmail} ${l.module} ${l.action} ${l.recordId} ${l.details}`}
        pageSize={12}
      />

      {/* Inspection Modal */}
      {selectedLog && (
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title={`Audit Event: ${selectedLog.id}`}
          subtitle="Cryptographically tracked immutable system audit log entry"
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs text-slate-700">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Timestamp</span>
                <span className="font-mono font-semibold text-slate-800">{selectedLog.timestamp}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Acting Identity</span>
                <span className="font-semibold text-slate-800">{selectedLog.userEmail}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Subsystem Module</span>
                <span className="font-semibold text-slate-800">{selectedLog.module}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Operation Action</span>
                <Badge variant="primary">{selectedLog.action}</Badge>
              </div>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">Target Entity Reference</span>
              <div className="p-2.5 bg-slate-100 rounded-lg font-mono text-xs text-slate-800 break-all border border-slate-200">
                {selectedLog.recordId || 'GLOBAL_SYSTEM_PARAMETER'}
              </div>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">Operation Narrative & Event Diff</span>
              <div className="p-3 bg-slate-900 text-emerald-400 font-mono text-xs rounded-lg overflow-x-auto leading-relaxed border border-slate-800">
                {selectedLog.details}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="primary" size="sm" onClick={() => setSelectedLog(null)}>
                Close Inspector
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
