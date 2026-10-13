import React from 'react';
import { 
  History, 
  Database, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  FileText,
  UserCheck,
  UploadCloud,
  ChevronRight
} from 'lucide-react';
import { AuditLogItem } from '../../types';
import { Badge } from '../common/Badge';

export interface DataCategoryFreshness {
  category: string;
  lastUpdated: string | null; // ISO string or null for "Unknown"
  freshnessThresholdHours: number; // e.g. 24 or 48 hours
  totalRecords: number;
}

interface RecentActivityAndFreshnessProps {
  recentActivities: AuditLogItem[];
  freshnessCategories: DataCategoryFreshness[];
  onNavigateToAudit?: () => void;
  onNavigateToDataImport?: () => void;
}

export const RecentActivityAndFreshnessPanel: React.FC<RecentActivityAndFreshnessProps> = ({
  recentActivities,
  freshnessCategories,
  onNavigateToAudit,
  onNavigateToDataImport,
}) => {
  const now = new Date();

  // Helper to format ISO date or return 'Unknown'
  const formatTimeOrUnknown = (iso: string | null) => {
    if (!iso) return 'Unknown';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return 'Unknown';
      return d.toLocaleString(undefined, { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return 'Unknown';
    }
  };

  const getFreshnessStatus = (item: DataCategoryFreshness) => {
    if (!item.lastUpdated) {
      return { 
        isStale: true, 
        message: 'No recorded sync timestamp', 
        badge: 'Unknown',
        variant: 'neutral' as const 
      };
    }

    try {
      const updateDate = new Date(item.lastUpdated);
      const diffHours = (now.getTime() - updateDate.getTime()) / (1000 * 60 * 60);

      if (diffHours > item.freshnessThresholdHours) {
        return {
          isStale: true,
          message: `Exceeds ${item.freshnessThresholdHours}h freshness window (${Math.round(diffHours)}h ago)`,
          badge: 'Stale Data Warning',
          variant: 'warning' as const
        };
      }

      return {
        isStale: false,
        message: `Fresh (${Math.max(1, Math.round(diffHours))}h ago)`,
        badge: 'Current / Synced',
        variant: 'success' as const
      };
    } catch {
      return { 
        isStale: true, 
        message: 'Invalid timestamp', 
        badge: 'Unknown', 
        variant: 'neutral' as const 
      };
    }
  };

  const getActionBadgeVariant = (action: AuditLogItem['action']) => {
    switch (action) {
      case 'CREATE': return 'primary' as const;
      case 'UPDATE': return 'info' as const;
      case 'DELETE': return 'danger' as const;
      case 'RESOLVE_ALERT': return 'success' as const;
      case 'IMPORT': return 'warning' as const;
      default: return 'neutral' as const;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Panel 1: Recent System Activity */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[#002F87]" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Recent System Activity
              </h4>
            </div>
            {onNavigateToAudit && (
              <button
                onClick={onNavigateToAudit}
                className="text-xs font-semibold text-[#002F87] hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                Audit Log <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="mt-3 space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {recentActivities.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No recent activity logged.</p>
            ) : (
              recentActivities.slice(0, 7).map((log) => (
                <div key={log.id} className="flex items-start justify-between gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors text-xs border border-transparent hover:border-slate-100">
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={getActionBadgeVariant(log.action)} size="sm">
                        {log.action}
                      </Badge>
                      <span className="font-semibold text-slate-800 truncate">
                        {log.module}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">
                      {log.details}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <span>User: <strong className="text-slate-600">{log.userEmail}</strong></span>
                      <span>•</span>
                      <span className="font-mono">{new Date(log.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="pt-3 mt-2 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Enterprise Audit Trail Active</span>
          <span>Zero Credential Exposure Enforced</span>
        </div>
      </div>

      {/* Panel 2: Data Freshness Status */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-[#44B330]" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Data Freshness Status
              </h4>
            </div>
            {onNavigateToDataImport && (
              <button
                onClick={onNavigateToDataImport}
                className="text-xs font-semibold text-[#002F87] hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                Import Management <UploadCloud className="w-3.5 h-3.5 ml-0.5" />
              </button>
            )}
          </div>

          <div className="mt-3 space-y-2.5">
            {freshnessCategories.map((cat) => {
              const status = getFreshnessStatus(cat);

              return (
                <div 
                  key={cat.category}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    status.isStale 
                      ? 'bg-amber-50/50 border-amber-200/90' 
                      : 'bg-slate-50/70 border-slate-200/70'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-slate-900 truncate">
                        {cat.category}
                      </span>
                      <Badge variant={status.variant} size="sm">
                        {status.badge}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                      <span>Last sync: <strong className="font-mono text-slate-700">{formatTimeOrUnknown(cat.lastUpdated)}</strong></span>
                      <span>•</span>
                      <span>{cat.totalRecords.toLocaleString()} records</span>
                    </div>
                  </div>

                  {status.isStale && (
                    <div className="shrink-0 flex items-center text-amber-700 text-xs gap-1 font-medium bg-amber-100/80 px-2 py-1 rounded-md" title={status.message}>
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Stale Sync</span>
                    </div>
                  )}
                  {!status.isStale && (
                    <div className="shrink-0 flex items-center text-emerald-700 text-xs gap-1 font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-3 mt-2 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Configured SLA Freshness: 24h - 48h</span>
          <span className="text-slate-500">Auto-audited against master sync table</span>
        </div>
      </div>
    </div>
  );
};
