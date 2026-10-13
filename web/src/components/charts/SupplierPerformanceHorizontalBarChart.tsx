import React, { useState } from 'react';
import { ExternalLink, ArrowUpDown, ChevronUp, ChevronDown, Info } from 'lucide-react';
import { Badge } from '../common/Badge';

export interface SupplierPerformanceScoreItem {
  id: string;
  name: string;
  code: string;
  score: number | null; // null represents "Not Evaluated"
  deliveryScore?: number;
  qualityScore?: number;
  priceScore?: number;
  evalPeriod: string; // e.g. "2026-Q3", "2026-Q2", "2026-YTD"
  status: string;
  category: string;
  hasQualifyingAlert: boolean;
}

interface SupplierPerformanceChartProps {
  suppliers: SupplierPerformanceScoreItem[];
  acceptableThreshold?: number; // e.g. 70
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
  availablePeriods: string[];
  onNavigateToSupplier: (supplierId: string) => void;
}

export const SupplierPerformanceHorizontalBarChart: React.FC<SupplierPerformanceChartProps> = ({
  suppliers,
  acceptableThreshold = 70,
  selectedPeriod,
  onPeriodChange,
  availablePeriods,
  onNavigateToSupplier,
}) => {
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [hoveredSupplier, setHoveredSupplier] = useState<SupplierPerformanceScoreItem | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Classify score using configurable initial defaults
  const getClassification = (score: number | null) => {
    if (score === null || score === undefined) return { label: 'Not Evaluated', variant: 'neutral' as const, color: '#94a3b8' };
    if (score >= 90) return { label: 'Excellent', variant: 'success' as const, color: '#10b981' };
    if (score >= 80) return { label: 'Good', variant: 'primary' as const, color: '#002F87' };
    if (score >= 70) return { label: 'Needs Improvement', variant: 'warning' as const, color: '#f59e0b' };
    return { label: 'Poor (Below Threshold)', variant: 'danger' as const, color: '#ef4444' };
  };

  // Sort suppliers: evaluated ones sorted by score, not evaluated placed at bottom
  const sortedSuppliers = [...suppliers].sort((a, b) => {
    if (a.score === null && b.score === null) return 0;
    if (a.score === null) return 1;
    if (b.score === null) return -1;
    return sortOrder === 'desc' ? b.score - a.score : a.score - b.score;
  });

  return (
    <div className="space-y-4">
      {/* Controls Bar: Evaluation Period Filter & Sort Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 text-xs">
        <div className="flex items-center gap-2">
          <label className="font-semibold text-slate-600">Evaluation Period:</label>
          <select
            value={selectedPeriod}
            onChange={(e) => onPeriodChange(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#002F87]"
          >
            {availablePeriods.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#10b981] inline-block" /> 90–100
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#002F87] inline-block" /> 80–89.9
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#f59e0b] inline-block" /> 70–79.9
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#ef4444] inline-block" /> &lt;{acceptableThreshold} (Warning)
            </span>
          </div>

          <button
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors cursor-pointer"
            title="Toggle sort order"
          >
            <ArrowUpDown className="w-3 h-3" />
            <span>Score: {sortOrder === 'desc' ? 'Highest First' : 'Lowest First'}</span>
          </button>
        </div>
      </div>

      {/* Threshold marker note */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
        <span>Performance Benchmarks (Threshold: <strong>{acceptableThreshold}.0</strong>)</span>
        <span className="text-slate-400 italic">Showing {sortedSuppliers.length} suppliers</span>
      </div>

      {/* Horizontal Bar Chart Container */}
      <div 
        className="space-y-3 relative select-none"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }}
      >
        {sortedSuppliers.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            No supplier evaluations recorded for period {selectedPeriod}.
          </div>
        ) : (
          sortedSuppliers.map((supplier) => {
            const classification = getClassification(supplier.score);
            const isBelowThreshold = supplier.score !== null && supplier.score < acceptableThreshold;
            const barWidth = supplier.score !== null ? Math.max(4, Math.min(100, supplier.score)) : 0;

            return (
              <div
                key={supplier.id}
                className={`group relative p-2 rounded-lg transition-all border ${
                  isBelowThreshold 
                    ? 'bg-rose-50/40 border-rose-200/70 hover:bg-rose-50' 
                    : 'bg-slate-50/60 border-transparent hover:bg-slate-100/80 hover:border-slate-200'
                }`}
                onMouseEnter={() => setHoveredSupplier(supplier)}
                onMouseLeave={() => setHoveredSupplier(null)}
              >
                {/* Row Header: Name & Score & Actions */}
                <div className="flex items-center justify-between gap-3 text-xs mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      onClick={() => onNavigateToSupplier(supplier.id)}
                      className="font-semibold text-slate-800 hover:text-[#002F87] transition-colors truncate flex items-center gap-1 group-hover:underline text-left cursor-pointer"
                    >
                      <span>{supplier.name}</span>
                      <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-[#002F87] shrink-0" />
                    </button>
                    <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                      ({supplier.code})
                    </span>
                    {isBelowThreshold && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 animate-pulse">
                        Below SLA
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold font-mono">
                      {supplier.score !== null ? (
                        <span className={isBelowThreshold ? 'text-rose-600' : 'text-slate-900'}>
                          {supplier.score.toFixed(1)} / 100
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Not Evaluated</span>
                      )}
                    </span>
                    <Badge variant={classification.variant} size="sm">
                      {classification.label}
                    </Badge>
                  </div>
                </div>

                {/* Progress Bar with 70 threshold guide line */}
                <div className="relative w-full bg-slate-200/90 h-3 rounded-full overflow-hidden">
                  {/* Vertical dashed guide at threshold % (e.g. 70%) */}
                  <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-rose-500/80 z-10 pointer-events-none" 
                    style={{ left: `${acceptableThreshold}%` }}
                    title={`Configured threshold (${acceptableThreshold}%)`}
                  />
                  {supplier.score !== null ? (
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${barWidth}%`,
                        backgroundColor: classification.color,
                      }}
                    />
                  ) : (
                    <div className="h-full w-full bg-repeating-linear-stripes bg-slate-200 opacity-60" />
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Floating Detailed Tooltip on Hover */}
        {hoveredSupplier && (
          <div
            className="pointer-events-none absolute z-50 p-3 bg-slate-950 text-white rounded-lg shadow-2xl border border-slate-800 text-xs max-w-xs transition-opacity duration-150"
            style={{
              left: Math.min(Math.max(10, mousePos.x + 15), 450),
              top: Math.max(10, mousePos.y - 70),
            }}
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5 mb-1.5">
              <span className="font-bold text-white truncate">{hoveredSupplier.name}</span>
              <span className="text-[10px] text-slate-400 font-mono">{hoveredSupplier.code}</span>
            </div>
            
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Composite Score:</span>
                <span className="font-bold text-white">
                  {hoveredSupplier.score !== null ? `${hoveredSupplier.score.toFixed(1)} / 100` : 'Not Evaluated'}
                </span>
              </div>
              {hoveredSupplier.deliveryScore !== undefined && (
                <div className="flex justify-between text-slate-300">
                  <span>Delivery Score:</span>
                  <span className="font-mono">{hoveredSupplier.deliveryScore.toFixed(1)}%</span>
                </div>
              )}
              {hoveredSupplier.qualityScore !== undefined && (
                <div className="flex justify-between text-slate-300">
                  <span>Quality Score:</span>
                  <span className="font-mono">{hoveredSupplier.qualityScore.toFixed(1)}%</span>
                </div>
              )}
              {hoveredSupplier.priceScore !== undefined && (
                <div className="flex justify-between text-slate-300">
                  <span>Price Competitiveness:</span>
                  <span className="font-mono">{hoveredSupplier.priceScore.toFixed(1)}%</span>
                </div>
              )}
              <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800/80">
                <span>Evaluation Period:</span>
                <span>{hoveredSupplier.evalPeriod}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Threshold Standard:</span>
                <span>{acceptableThreshold}.0 ({hoveredSupplier.score !== null && hoveredSupplier.score >= acceptableThreshold ? 'Compliant' : 'Alert Triggered'})</span>
              </div>
            </div>
            <div className="mt-2 text-[10px] text-[#44B330] flex items-center gap-1 font-medium">
              Click supplier name to view detailed scorecard
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
