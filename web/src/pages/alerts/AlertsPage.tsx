import React, { useState } from 'react';
import { Bell, ShieldAlert, CheckCircle, Clock, AlertTriangle, Filter, Check, MessageSquare } from 'lucide-react';
import { dbService } from '../../services/db';
import { AlertItem, AlertSeverity, AlertStatus } from '../../types';
import { DataTable, Column } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { useAuth } from '../../context/AuthContext';

export const AlertsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [alerts, setAlerts] = useState<AlertItem[]>(() => dbService.getAlerts());
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('OPEN');

  const [scanFeedback, setScanFeedback] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [newStatus, setNewStatus] = useState<AlertStatus>('INVESTIGATING');

  const handleRunScan = async () => {
    try {
      const result = await dbService.executeRuleScan();
      setAlerts(dbService.getAlerts());
      setScanFeedback(result.summary);
    } catch (err) {
      setScanFeedback(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
    setTimeout(() => setScanFeedback(''), 5000);
  };

  const filteredAlerts = alerts.filter(a => {
    const matchSev = filterSeverity === 'ALL' || a.severity === filterSeverity;
    const matchStat = 
      filterStatus === 'ALL' ? true :
      filterStatus === 'OPEN' ? (a.status === 'NEW' || a.status === 'ACKNOWLEDGED' || a.status === 'INVESTIGATING') :
      a.status === filterStatus;
    return matchSev && matchStat;
  });

  const handleUpdateAlert = async () => {
    if (!selectedAlert) return;
    try {
      await dbService.updateAlertStatus(
        selectedAlert.id,
        newStatus,
        resolutionNote || selectedAlert.resolution,
        currentUser?.displayName || 'Procurement Officer'
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      return;
    }
    setAlerts(dbService.getAlerts());
    setSelectedAlert(null);
    setResolutionNote('');
  };

  const columns: Column<AlertItem>[] = [
    {
      key: 'severity',
      header: 'Severity',
      sortable: true,
      align: 'center',
      className: 'w-24',
      render: (a) => {
        const variants: Record<AlertSeverity, 'danger' | 'warning' | 'info' | 'neutral'> = {
          CRITICAL: 'danger',
          HIGH: 'danger',
          MEDIUM: 'warning',
          LOW: 'info',
        };
        return <Badge variant={variants[a.severity]}>{a.severity}</Badge>;
      },
    },
    {
      key: 'alertType',
      header: 'Alert Category',
      sortable: true,
      render: (a) => (
        <div>
          <button
            onClick={() => {
              setSelectedAlert(a);
              setNewStatus(a.status);
              setResolutionNote(a.resolution || '');
            }}
            className="font-semibold text-slate-900 hover:text-[#002F87] text-left block"
          >
            {a.alertType}
          </button>
          <span className="text-[11px] text-slate-400 font-mono">{a.id}</span>
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Event Narrative & Impact',
      render: (a) => (
        <span className="text-slate-600 text-xs block line-clamp-2 max-w-md">
          {a.description}
        </span>
      ),
    },
    {
      key: 'supplierName',
      header: 'Associated Entity',
      render: (a) => (
        <span className="text-slate-700 text-xs font-medium">
          {a.supplierName || a.materialName || 'System'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      align: 'center',
      render: (a) => {
        const variants: Record<AlertStatus, 'danger' | 'warning' | 'info' | 'success' | 'neutral'> = {
          NEW: 'danger',
          ACKNOWLEDGED: 'warning',
          INVESTIGATING: 'info',
          RESOLVED: 'success',
          DISMISSED: 'neutral',
        };
        return <Badge variant={variants[a.status]}>{a.status}</Badge>;
      },
    },
    {
      key: 'createdAt',
      header: 'Triggered Date',
      sortable: true,
      className: 'font-mono text-xs text-slate-500 w-28',
      render: (a) => a.createdAt.split('T')[0],
    },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      render: (a) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setSelectedAlert(a);
            setNewStatus(a.status);
            setResolutionNote(a.resolution || '');
          }}
        >
          Review
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#002F87]/20 focus:border-[#002F87] shadow-2xs"
          >
            <option value="OPEN">Open Alerts ({alerts.filter(a => a.status !== 'RESOLVED' && a.status !== 'DISMISSED').length})</option>
            <option value="ALL">All Alerts ({alerts.length})</option>
            <option value="RESOLVED">Resolved ({alerts.filter(a => a.status === 'RESOLVED').length})</option>
          </select>

          <select
            value={filterSeverity}
            onChange={e => setFilterSeverity(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#002F87]/20 focus:border-[#002F87] shadow-2xs"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleRunScan}
          icon={<ShieldAlert className="w-3.5 h-3.5" />}
        >
          Run Anomaly Detection Scan
        </Button>
      </div>

      {scanFeedback && (
        <div className="p-3 bg-[#EFF4FC] border border-[#C8DBFC] rounded-xl flex items-center gap-2 text-xs font-semibold text-[#002F87]">
          <CheckCircle className="w-4 h-4 text-[#44B330] shrink-0" />
          <span>{scanFeedback}</span>
        </div>
      )}

      <DataTable
        data={filteredAlerts}
        columns={columns}
        searchPlaceholder="Search alerts by type, supplier, description, or ID..."
        searchableKey={(a) => `${a.alertType} ${a.description} ${a.supplierName || ''} ${a.id}`}
        pageSize={10}
      />

      {/* Alert Investigation & Resolution Modal */}
      {selectedAlert && (
        <Modal
          isOpen={!!selectedAlert}
          onClose={() => setSelectedAlert(null)}
          title={`Alert Investigation: ${selectedAlert.alertType}`}
          subtitle={`Alert ID: ${selectedAlert.id} • Triggered: ${selectedAlert.createdAt}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs text-slate-700">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Trigger Condition:</span>
                <Badge variant={selectedAlert.severity === 'CRITICAL' ? 'danger' : 'warning'}>
                  {selectedAlert.severity} SEVERITY
                </Badge>
              </div>
              <p className="text-slate-800 font-medium">{selectedAlert.description}</p>
              {selectedAlert.triggerMetric && (
                <div className="pt-1 text-[11px] text-slate-500">
                  Detected Metric: <strong className="text-slate-800">{selectedAlert.triggerMetric}</strong>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="font-semibold text-slate-800 block mb-1">Workflow Status</label>
                <select
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value as AlertStatus)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-[#002F87]/20 focus:border-[#002F87] focus:outline-none"
                >
                  <option value="NEW">New (Unreviewed)</option>
                  <option value="ACKNOWLEDGED">Acknowledged</option>
                  <option value="INVESTIGATING">Investigating with Supplier</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="DISMISSED">Dismissed (False Positive)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-800 block mb-1">
                  Investigation Findings & Corrective Action
                </label>
                <textarea
                  rows={4}
                  value={resolutionNote}
                  onChange={e => setResolutionNote(e.target.value)}
                  placeholder="Record cause analysis, communication with vendor, and resolution rationale..."
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-[#002F87]/20 focus:border-[#002F87] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setSelectedAlert(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleUpdateAlert}>
                Save Audit Record
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
