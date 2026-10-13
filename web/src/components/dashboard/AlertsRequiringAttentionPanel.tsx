import React, { useState } from 'react';
import { 
  Bell, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  ExternalLink,
  Check,
  UserCheck,
  Search,
  Filter
} from 'lucide-react';
import { AlertItem, AlertSeverity, AlertStatus } from '../../types';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { useAuth } from '../../context/AuthContext';

interface AlertsRequiringAttentionProps {
  alerts: AlertItem[];
  onUpdateAlertStatus: (alertId: string, status: AlertStatus, resolution?: string) => void;
  onNavigateToRecord: (type: 'supplier' | 'material' | 'alerts', id?: string) => void;
}

export const AlertsRequiringAttentionPanel: React.FC<AlertsRequiringAttentionProps> = ({
  alerts,
  onUpdateAlertStatus,
  onNavigateToRecord,
}) => {
  const { currentUser } = useAuth();
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'NEW' | 'ACKNOWLEDGED' | 'RESOLVED'>('ALL');
  const [resolvingAlertId, setResolvingAlertId] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState('');

  // Filter alerts by status
  const displayedAlerts = alerts.filter(a => {
    if (filterStatus === 'ALL') return true;
    return a.status === filterStatus;
  });

  const getSeverityBadgeVariant = (severity: AlertSeverity): 'danger' | 'warning' | 'primary' | 'neutral' => {
    switch (severity) {
      case 'CRITICAL': return 'danger';
      case 'HIGH': return 'warning';
      case 'MEDIUM': return 'primary';
      case 'LOW': default: return 'neutral';
    }
  };

  const getStatusBadgeVariant = (status: AlertStatus): 'danger' | 'warning' | 'success' | 'neutral' => {
    switch (status) {
      case 'NEW': return 'danger';
      case 'ACKNOWLEDGED': case 'INVESTIGATING': return 'warning';
      case 'RESOLVED': return 'success';
      case 'DISMISSED': default: return 'neutral';
    }
  };

  const handleAcknowledge = (alertId: string) => {
    onUpdateAlertStatus(alertId, 'ACKNOWLEDGED');
  };

  const handleOpenResolve = (alertId: string) => {
    setResolvingAlertId(alertId);
    setResolutionText('');
  };

  const handleConfirmResolve = () => {
    if (!resolvingAlertId) return;
    onUpdateAlertStatus(resolvingAlertId, 'RESOLVED', resolutionText || 'Resolved by purchasing officer');
    setResolvingAlertId(null);
    setResolutionText('');
  };

  return (
    <div className="space-y-3">
      {/* Header filter strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-slate-500">Filter by Status:</span>
          {(['ALL', 'NEW', 'ACKNOWLEDGED', 'RESOLVED'] as const).map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                filterStatus === st
                  ? 'bg-[#002F87] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'ALL' ? 'All Alerts' : st}
              {st !== 'ALL' && (
                <span className="ml-1 opacity-70">
                  ({alerts.filter(a => a.status === st).length})
                </span>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={() => onNavigateToRecord('alerts')}
          className="text-xs font-semibold text-[#002F87] hover:underline flex items-center gap-1 cursor-pointer"
        >
          View Full Alerts Console <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      {/* Alert list */}
      {displayedAlerts.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
          <p className="font-semibold text-slate-700">No alerts matching "{filterStatus}"</p>
          <p className="text-[11px] text-slate-400 mt-0.5">All monitored conditions are within acceptable thresholds.</p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
          {displayedAlerts.map(alert => (
            <div
              key={alert.id}
              className={`p-3.5 rounded-xl border transition-all ${
                alert.status === 'NEW' 
                  ? 'bg-rose-50/40 border-rose-200/90 shadow-2xs' 
                  : alert.status === 'ACKNOWLEDGED'
                  ? 'bg-amber-50/30 border-amber-200/80'
                  : 'bg-white border-slate-200/80 opacity-80'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div className="space-y-1 flex-1 min-w-0">
                  {/* Row 1: Alert type & badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">
                      {alert.alertType}
                    </span>
                    <Badge variant={getSeverityBadgeVariant(alert.severity)} size="sm">
                      {alert.severity}
                    </Badge>
                    <Badge variant={getStatusBadgeVariant(alert.status)} size="sm">
                      {alert.status}
                    </Badge>
                  </div>

                  {/* Row 2: Description */}
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {alert.description}
                  </p>

                  {/* Row 3: Involved entities & date detected */}
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1">
                    {alert.supplierName && (
                      <button
                        onClick={() => onNavigateToRecord('supplier', alert.supplierId)}
                        className="font-semibold text-[#002F87] hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        Supplier: {alert.supplierName}
                        <ExternalLink className="w-2.5 h-2.5 ml-0.5 opacity-60" />
                      </button>
                    )}
                    {alert.materialName && (
                      <button
                        onClick={() => onNavigateToRecord('material', alert.materialId)}
                        className="font-semibold text-[#002F87] hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        Material: {alert.materialName}
                        <ExternalLink className="w-2.5 h-2.5 ml-0.5 opacity-60" />
                      </button>
                    )}
                    <span className="flex items-center gap-1 text-slate-400">
                      <Clock className="w-3 h-3" />
                      Detected: {alert.createdAt ? new Date(alert.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : 'Unknown'}
                    </span>
                    {alert.assignedUser && (
                      <span className="text-slate-500">
                        Handler: <strong>{alert.assignedUser}</strong>
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Action Buttons (Acknowledge / Resolve) */}
                <div className="flex items-center gap-1.5 shrink-0 self-start mt-2 sm:mt-0">
                  {alert.status === 'NEW' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAcknowledge(alert.id)}
                      icon={<Clock className="w-3 h-3 text-amber-600" />}
                    >
                      Acknowledge
                    </Button>
                  )}
                  {alert.status !== 'RESOLVED' && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleOpenResolve(alert.id)}
                      icon={<Check className="w-3 h-3 text-white" />}
                    >
                      Resolve
                    </Button>
                  )}
                  {alert.status === 'RESOLVED' && (
                    <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
                    </span>
                  )}
                </div>
              </div>

              {/* In-place resolution note modal/input if resolving this alert */}
              {resolvingAlertId === alert.id && (
                <div className="mt-3 p-3 bg-white rounded-lg border border-slate-300 shadow-sm space-y-2">
                  <label className="text-xs font-semibold text-slate-800 block">
                    Record Resolution Notes / Corrective Actions Taken:
                  </label>
                  <textarea
                    rows={2}
                    value={resolutionText}
                    onChange={(e) => setResolutionText(e.target.value)}
                    placeholder="Enter root cause analysis, negotiated price concession, or corrective action..."
                    className="w-full text-xs p-2 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#002F87]"
                  />
                  <div className="flex justify-end gap-2 text-xs">
                    <button
                      onClick={() => setResolvingAlertId(null)}
                      className="px-2.5 py-1 text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmResolve}
                      className="px-3 py-1 bg-[#44B330] hover:bg-[#3ca02a] text-white font-semibold rounded-md shadow-2xs cursor-pointer"
                    >
                      Confirm Resolution & Log Audit
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
