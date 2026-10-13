import React, { useState, useMemo } from 'react';
import { Award, Trophy, ArrowUpDown, Filter, Building2, Download, AlertCircle } from 'lucide-react';
import { dbService } from '../../services/db';
import { Supplier } from '../../types';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';

export const SupplierRankingPage: React.FC = () => {
  const [suppliers] = useState<Supplier[]>(() => dbService.getSuppliers());
  const [sortBy, setSortBy] = useState<'overall' | 'delivery' | 'quality' | 'price' | 'spend'>('overall');
  const [filterTier, setFilterTier] = useState<string>('ALL');

  const sortedSuppliers = useMemo(() => {
    let list = [...suppliers];
    if (filterTier !== 'ALL') {
      list = list.filter(s => s.ratingTier === filterTier);
    }

    return list.sort((a, b) => {
      if (sortBy === 'overall') return b.overallScore - a.overallScore;
      if (sortBy === 'delivery') return b.deliveryScore - a.deliveryScore;
      if (sortBy === 'quality') return b.qualityScore - a.qualityScore;
      if (sortBy === 'price') return b.priceScore - a.priceScore;
      if (sortBy === 'spend') return b.totalSpend - a.totalSpend;
      return 0;
    });
  }, [suppliers, sortBy, filterTier]);

  const top3 = sortedSuppliers.slice(0, 3);

  const handleExportCSV = () => {
    const headers = ['Rank', 'Code', 'Supplier Name', 'Category', 'Rating Tier', 'Overall Score', 'Delivery %', 'Quality %', 'Price Score', 'Spend PHP'];
    const rows = sortedSuppliers.map((s, idx) => [
      idx + 1,
      s.supplierCode,
      `"${s.supplierName}"`,
      `"${s.category}"`,
      s.ratingTier,
      s.overallScore,
      s.deliveryScore,
      s.qualityScore,
      s.priceScore,
      s.totalSpend
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `supplier_rankings_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-600 uppercase">Rank Metric:</span>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800 focus:outline-none"
          >
            <option value="overall">Composite Performance Score</option>
            <option value="delivery">On-Time Delivery (OTD %)</option>
            <option value="quality">Quality Acceptance Rate %</option>
            <option value="price">Price Competitiveness Score</option>
            <option value="spend">Total Procurement Spend (PHP)</option>
          </select>

          <select
            value={filterTier}
            onChange={e => setFilterTier(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Rating Tiers</option>
            <option value="EXCELLENT">Tier: Excellent (90-100)</option>
            <option value="GOOD">Tier: Good (80-89)</option>
            <option value="SATISFACTORY">Tier: Satisfactory (70-79)</option>
            <option value="NEEDS_IMPROVEMENT">Tier: Needs Improvement (60-69)</option>
            <option value="POOR">Tier: Poor (&lt; 60)</option>
          </select>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCSV}
          icon={<Download className="w-3.5 h-3.5" />}
        >
          Export Rankings
        </Button>
      </div>

      {/* Top 3 Podium Cards */}
      {sortedSuppliers.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {top3.map((sup, idx) => (
            <div
              key={sup.id}
              className={`p-4 rounded-xl border relative overflow-hidden bg-white shadow-2xs ${
                idx === 0 ? 'border-amber-300 ring-2 ring-amber-400/20' : 'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                    idx === 0 ? 'bg-amber-400 text-amber-950' :
                    idx === 1 ? 'bg-slate-300 text-slate-800' :
                    'bg-amber-700/80 text-amber-100'
                  }`}>
                    #{idx + 1}
                  </div>
                  <div>
                    <span className="font-semibold text-xs text-slate-900 block truncate max-w-[160px]">{sup.supplierName}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{sup.supplierCode}</span>
                  </div>
                </div>
                <Badge variant={sup.overallScore >= 90 ? 'success' : 'primary'} size="sm">
                  {sup.ratingTier}
                </Badge>
              </div>

              <div className="mt-3 flex items-baseline justify-between border-t border-slate-100 pt-3">
                <span className="text-xs text-slate-500">Score</span>
                <span className="text-xl font-bold font-tabular-nums text-slate-900">{sup.overallScore} <span className="text-xs text-slate-400">/ 100</span></span>
              </div>

              <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[11px] bg-slate-50 p-2 rounded-lg">
                <div>
                  <span className="text-slate-400 block">Delivery</span>
                  <strong className="text-slate-800 font-tabular-nums">{sup.deliveryScore}%</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Quality</span>
                  <strong className="text-emerald-600 font-tabular-nums">{sup.qualityScore}%</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Price</span>
                  <strong className="text-purple-600 font-tabular-nums">{sup.priceScore}%</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Leaderboard Table */}
      <Card
        title="Comprehensive Supplier Performance Leaderboard"
        subtitle="Ranked across weighted dimensions: Delivery (30%), Quality (30%), Price (20%), Responsiveness (10%), Compliance (10%)"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px] bg-slate-50">
                <th className="py-2.5 px-3 text-center w-12">Rank</th>
                <th className="py-2.5 px-3">Supplier Name / Code</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 text-center">Score</th>
                <th className="py-2.5 px-3 text-right">Delivery %</th>
                <th className="py-2.5 px-3 text-right">Quality %</th>
                <th className="py-2.5 px-3 text-right">Price Score</th>
                <th className="py-2.5 px-3 text-right">Total Spend</th>
                <th className="py-2.5 px-3 text-center">Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedSuppliers.map((s, idx) => (
                <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-3 text-center font-bold text-slate-500 font-mono">
                    #{idx + 1}
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-semibold text-slate-900 block">{s.supplierName}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{s.supplierCode}</span>
                  </td>
                  <td className="py-3 px-3 text-slate-600">{s.category}</td>
                  <td className="py-3 px-3 text-center">
                    <span className="font-bold text-sm font-tabular-nums text-slate-900">{s.overallScore}</span>
                  </td>
                  <td className="py-3 px-3 text-right font-tabular-nums">
                    <span className={s.deliveryScore >= 90 ? 'text-emerald-600 font-semibold' : 'text-slate-700'}>
                      {s.deliveryScore}%
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-tabular-nums">
                    <span className={s.qualityScore >= 90 ? 'text-emerald-600 font-semibold' : 'text-slate-700'}>
                      {s.qualityScore}%
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-tabular-nums text-slate-800">
                    {s.priceScore}
                  </td>
                  <td className="py-3 px-3 text-right font-tabular-nums font-semibold text-slate-900">
                    ₱{s.totalSpend.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <Badge
                      variant={
                        s.overallScore >= 90 ? 'success' :
                        s.overallScore >= 80 ? 'primary' :
                        s.overallScore >= 70 ? 'neutral' :
                        s.overallScore >= 60 ? 'warning' : 'danger'
                      }
                      size="sm"
                    >
                      {s.ratingTier}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
