import React, { useState, useMemo } from 'react';
import { Building2, Award, Clock, ShieldAlert, CheckCircle2, AlertTriangle, TrendingDown, TrendingUp, Filter, BarChart3, ArrowRight } from 'lucide-react';
import { dbService } from '../../services/db';
import { Supplier, PurchaseTransaction } from '../../types';
import { Card } from '../../components/common/Card';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';

export const SupplierAnalyticsPage: React.FC = () => {
  const suppliers = dbService.getSuppliers();
  const purchases = dbService.getPurchases();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const categories = useMemo(() => {
    const set = new Set<string>();
    suppliers.forEach(s => set.add(s.category));
    return Array.from(set);
  }, [suppliers]);

  const filteredSuppliers = useMemo(() => {
    if (selectedCategory === 'ALL') return suppliers;
    return suppliers.filter(s => s.category === selectedCategory);
  }, [suppliers, selectedCategory]);

  // Delivery KPIs
  const avgOTD = useMemo(() => {
    if (filteredSuppliers.length === 0) return 0;
    return Number((filteredSuppliers.reduce((sum, s) => sum + s.deliveryScore, 0) / filteredSuppliers.length).toFixed(1));
  }, [filteredSuppliers]);

  // Quality KPIs
  const avgQuality = useMemo(() => {
    if (filteredSuppliers.length === 0) return 0;
    return Number((filteredSuppliers.reduce((sum, s) => sum + s.qualityScore, 0) / filteredSuppliers.length).toFixed(1));
  }, [filteredSuppliers]);

  // Tier breakdown
  const tierDistribution = useMemo(() => {
    const dist = { EXCELLENT: 0, GOOD: 0, SATISFACTORY: 0, NEEDS_IMPROVEMENT: 0, POOR: 0 };
    filteredSuppliers.forEach(s => {
      dist[s.ratingTier] = (dist[s.ratingTier] || 0) + 1;
    });
    return dist;
  }, [filteredSuppliers]);

  // At-Risk Suppliers Matrix (Score < 75 or Delivery < 75 or Quality < 85)
  const atRiskSuppliers = useMemo(() => {
    return filteredSuppliers
      .filter(s => s.overallScore < 75 || s.deliveryScore < 75 || s.qualityScore < 85 || s.status === 'PROBATION')
      .sort((a, b) => a.overallScore - b.overallScore);
  }, [filteredSuppliers]);

  // Top Performing Vendors
  const topPerformers = useMemo(() => {
    return [...filteredSuppliers].sort((a, b) => b.overallScore - a.overallScore).slice(0, 5);
  }, [filteredSuppliers]);

  return (
    <div className="space-y-6">
      {/* Filter Ribbon */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">
            Supplier Performance & Risk Analytics
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Macro-level delivery reliability, quality pass rates, tier distribution, and vendor vulnerability matrix.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-semibold text-slate-800 focus:outline-none"
          >
            <option value="ALL">All Supply Categories ({suppliers.length})</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 1: KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Average Delivery OTD"
          value={`${avgOTD}%`}
          subtitle="Fleet-wide on-time rate"
          icon={<Clock className="w-5 h-5 text-blue-600" />}
          variant={avgOTD >= 90 ? 'success' : 'warning'}
        />

        <StatCard
          title="Average Quality Score"
          value={`${avgQuality}%`}
          subtitle="QC receiving pass rate"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
          variant={avgQuality >= 90 ? 'success' : 'warning'}
        />

        <StatCard
          title="Vulnerable / At-Risk Vendors"
          value={atRiskSuppliers.length}
          subtitle="Score <75 or probation status"
          icon={<ShieldAlert className="w-5 h-5 text-rose-600" />}
          variant={atRiskSuppliers.length > 0 ? 'danger' : 'success'}
        />

        <StatCard
          title="Top Tier (Excellent)"
          value={tierDistribution.EXCELLENT}
          subtitle="Composite score 90-100"
          icon={<Award className="w-5 h-5 text-[#002F87]" />}
          variant="success"
        />
      </div>

      {/* Row 2: Performance Tier Distribution & Dimensional Averages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tier Distribution Bar Breakdown */}
        <Card
          title="Supplier Performance Tier Distribution"
          subtitle="Segmentation according to configured scoring threshold grades"
        >
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-emerald-800 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Tier 1: Excellent (90 - 100)
                </span>
                <strong className="text-slate-900 font-tabular-nums">{tierDistribution.EXCELLENT} Suppliers</strong>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${(tierDistribution.EXCELLENT / filteredSuppliers.length) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-blue-800 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  Tier 2: Good (80 - 89.9)
                </span>
                <strong className="text-slate-900 font-tabular-nums">{tierDistribution.GOOD} Suppliers</strong>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full" style={{ width: `${(tierDistribution.GOOD / filteredSuppliers.length) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                  Tier 3: Satisfactory (70 - 79.9)
                </span>
                <strong className="text-slate-900 font-tabular-nums">{tierDistribution.SATISFACTORY} Suppliers</strong>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-slate-400 h-full rounded-full" style={{ width: `${(tierDistribution.SATISFACTORY / filteredSuppliers.length) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-amber-800 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  Tier 4: Needs Improvement (60 - 69.9)
                </span>
                <strong className="text-slate-900 font-tabular-nums">{tierDistribution.NEEDS_IMPROVEMENT} Suppliers</strong>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full" style={{ width: `${(tierDistribution.NEEDS_IMPROVEMENT / filteredSuppliers.length) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-rose-800 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  Tier 5: Poor / High Risk (&lt; 60)
                </span>
                <strong className="text-slate-900 font-tabular-nums">{tierDistribution.POOR} Suppliers</strong>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-rose-500 h-full rounded-full" style={{ width: `${(tierDistribution.POOR / filteredSuppliers.length) * 100}%` }} />
              </div>
            </div>
          </div>
        </Card>

        {/* Top 5 Performing Suppliers */}
        <Card
          title="Top 5 Performance Leaders"
          subtitle="Highest ranked vendors across all 5 evaluation dimensions"
        >
          <div className="space-y-3">
            {topPerformers.map((s, idx) => (
              <div key={s.id} className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-md bg-[#EFF4FC] text-[#002F87] font-bold text-xs flex items-center justify-center border border-[#DBE8FC]">
                    #{idx + 1}
                  </span>
                  <div>
                    <span className="font-semibold text-xs text-slate-900 block truncate max-w-[180px]">{s.supplierName}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{s.category} • {s.supplierCode}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-sm text-slate-900 font-tabular-nums block">{s.overallScore}</span>
                  <span className="text-[10px] text-emerald-600 font-medium">OTD: {s.deliveryScore}% | QC: {s.qualityScore}%</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Row 3: Supplier Vulnerability & Risk Matrix */}
      <Card
        title="Supplier Risk & Mitigation Watchlist"
        subtitle="Suppliers exhibiting performance score degradation, chronic shipping delays, or elevated QC defect rates"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px] bg-slate-50">
                <th className="py-2.5 px-3">Supplier Name / Code</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 text-center">Composite Score</th>
                <th className="py-2.5 px-3 text-right">Delivery (OTD)</th>
                <th className="py-2.5 px-3 text-right">Quality Pass %</th>
                <th className="py-2.5 px-3 text-right">Annual Spend</th>
                <th className="py-2.5 px-3">Identified Risk Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {atRiskSuppliers.length > 0 ? (
                atRiskSuppliers.map(s => {
                  let reason = '';
                  if (s.deliveryScore < 60) reason = 'Severe shipping transit delays (OTD < 60%)';
                  else if (s.qualityScore < 80) reason = 'Excessive receiving defect rejections';
                  else if (s.overallScore < 70) reason = 'Sub-threshold multi-factor performance scorecard';
                  else if (s.status === 'PROBATION') reason = 'Vendor currently placed on formal probation status';
                  else reason = 'Near contractual expiration date with performance flags';

                  return (
                    <tr key={s.id} className="hover:bg-rose-50/30 transition-colors">
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-900 block">{s.supplierName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{s.supplierCode}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">{s.category}</td>
                      <td className="py-3 px-3 text-center">
                        <Badge variant={s.overallScore < 60 ? 'danger' : 'warning'} size="sm">
                          {s.overallScore} / 100
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-right font-tabular-nums text-rose-600 font-semibold">
                        {s.deliveryScore}%
                      </td>
                      <td className="py-3 px-3 text-right font-tabular-nums text-amber-700 font-semibold">
                        {s.qualityScore}%
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-medium text-slate-900">
                        ₱{s.totalSpend.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-rose-700 font-medium">
                        {reason}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400">
                    No suppliers currently meet risk classification criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
