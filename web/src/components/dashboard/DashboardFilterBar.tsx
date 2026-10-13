import React from 'react';
import { Filter, RotateCcw, Calendar, Building2, Tag, ShieldAlert, Award } from 'lucide-react';

export interface DashboardGlobalFilters {
  reportingPeriod: string; // e.g. '2026-Q3' | '2026-Q2' | '2026-YTD' | 'ALL'
  supplierId: string; // 'ALL' or specific supplier ID
  materialCategory: string; // 'ALL' or specific category
  supplierStatus: string; // 'ALL' | 'ACTIVE' | 'PROBATION' | 'INACTIVE'
  performanceClassification: string; // 'ALL' | 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT' | 'POOR' | 'NOT_EVALUATED'
}

interface DashboardFilterBarProps {
  filters: DashboardGlobalFilters;
  onChangeFilter: <K extends keyof DashboardGlobalFilters>(key: K, value: DashboardGlobalFilters[K]) => void;
  onResetFilters: () => void;
  availablePeriods: string[];
  suppliers: { id: string; name: string }[];
  categories: string[];
  activeFilterCount: number;
}

export const DashboardFilterBar: React.FC<DashboardFilterBarProps> = ({
  filters,
  onChangeFilter,
  onResetFilters,
  availablePeriods,
  suppliers,
  categories,
  activeFilterCount,
}) => {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
      {/* Top row: Label, Active Count, Reset Button */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2 text-slate-800">
          <div className="p-1 rounded-md bg-[#EFF4FC] text-[#002F87]">
            <Filter className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Global Dashboard Filters
          </span>
          <span className="text-[11px] text-slate-400">
            (Synchronizes all KPI cards, performance distributions, alerts, and trend charts)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#EFF4FC] text-[#002F87]">
              {activeFilterCount} active filter{activeFilterCount > 1 ? 's' : ''}
            </span>
          )}

          <button
            onClick={onResetFilters}
            className={`flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeFilterCount > 0
                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/70'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Filters</span>
          </button>
        </div>
      </div>

      {/* Inputs Grid: 5 Global Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
        {/* 1. Reporting Period */}
        <div>
          <label className="text-[11px] font-semibold text-slate-600 block mb-1">
            Reporting Period:
          </label>
          <select
            value={filters.reportingPeriod}
            onChange={(e) => onChangeFilter('reportingPeriod', e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#002F87]"
          >
            {availablePeriods.map(p => (
              <option key={p} value={p}>{p === 'ALL' ? 'All Fiscal Periods' : p}</option>
            ))}
          </select>
        </div>

        {/* 2. Specific Supplier */}
        <div>
          <label className="text-[11px] font-semibold text-slate-600 block mb-1">
            Supplier Filter:
          </label>
          <select
            value={filters.supplierId}
            onChange={(e) => onChangeFilter('supplierId', e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#002F87] truncate"
          >
            <option value="ALL">All Suppliers</option>
            {suppliers.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* 3. Material Category */}
        <div>
          <label className="text-[11px] font-semibold text-slate-600 block mb-1">
            Material Category:
          </label>
          <select
            value={filters.materialCategory}
            onChange={(e) => onChangeFilter('materialCategory', e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#002F87]"
          >
            <option value="ALL">All Categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* 4. Supplier Status */}
        <div>
          <label className="text-[11px] font-semibold text-slate-600 block mb-1">
            Supplier Status:
          </label>
          <select
            value={filters.supplierStatus}
            onChange={(e) => onChangeFilter('supplierStatus', e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#002F87]"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="PROBATION">Probation Only</option>
            <option value="INACTIVE">Inactive / Suspended</option>
          </select>
        </div>

        {/* 5. Performance Classification */}
        <div>
          <label className="text-[11px] font-semibold text-slate-600 block mb-1">
            Performance Rating:
          </label>
          <select
            value={filters.performanceClassification}
            onChange={(e) => onChangeFilter('performanceClassification', e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#002F87]"
          >
            <option value="ALL">All Classifications</option>
            <option value="EXCELLENT">Excellent (90–100)</option>
            <option value="GOOD">Good (80–89.9)</option>
            <option value="NEEDS_IMPROVEMENT">Needs Improvement (70–79.9)</option>
            <option value="POOR">Poor (&lt;70, Below Threshold)</option>
            <option value="NOT_EVALUATED">Not Evaluated</option>
          </select>
        </div>
      </div>

      {/* Selected Period Badge */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
        <span className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-[#002F87]" />
          Active Evaluation Scope: <strong className="text-slate-800">{filters.reportingPeriod}</strong>
        </span>
        <span className="text-slate-400 italic">
          Card 6 (Pending Data Updates) shows pending imports across all catalogs.
        </span>
      </div>
    </div>
  );
};
