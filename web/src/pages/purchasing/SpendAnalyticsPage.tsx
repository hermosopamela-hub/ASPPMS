import React, { useMemo } from 'react';
import { ShoppingCart, DollarSign, TrendingUp, BarChart3, PieChart, Building2, Package, ArrowUpRight } from 'lucide-react';
import { dbService } from '../../services/db';
import { Card } from '../../components/common/Card';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';

export const SpendAnalyticsPage: React.FC = () => {
  const purchases = dbService.getPurchases();
  const suppliers = dbService.getSuppliers();
  const materials = dbService.getMaterials();

  const totalSpend = useMemo(() => {
    return purchases.reduce((sum, p) => sum + p.totalAmount, 0);
  }, [purchases]);

  // Spend by Supplier
  const spendBySupplier = useMemo(() => {
    const map: Record<string, { name: string; spend: number; count: number; score: number }> = {};
    purchases.forEach(p => {
      if (!map[p.supplierId]) {
        map[p.supplierId] = { name: p.supplierName, spend: 0, count: 0, score: 0 };
      }
      map[p.supplierId].spend += p.totalAmount;
      map[p.supplierId].count += 1;
    });
    suppliers.forEach(s => {
      if (map[s.id]) map[s.id].score = s.overallScore;
    });
    return Object.values(map).sort((a, b) => b.spend - a.spend);
  }, [purchases, suppliers]);

  // Spend by Category
  const spendByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    purchases.forEach(p => {
      const mat = materials.find(m => m.id === p.materialId);
      const cat = mat?.category || 'General';
      map[cat] = (map[cat] || 0) + p.totalAmount;
    });
    return Object.entries(map)
      .map(([category, spend]) => ({ category, spend }))
      .sort((a, b) => b.spend - a.spend);
  }, [purchases, materials]);

  // Spend by Material (Top 10)
  const spendByMaterial = useMemo(() => {
    const map: Record<string, { name: string; code: string; spend: number; count: number }> = {};
    purchases.forEach(p => {
      if (!map[p.materialId]) {
        map[p.materialId] = { name: p.materialName, code: p.materialCode, spend: 0, count: 0 };
      }
      map[p.materialId].spend += p.totalAmount;
      map[p.materialId].count += 1;
    });
    return Object.values(map).sort((a, b) => b.spend - a.spend).slice(0, 8);
  }, [purchases]);

  // Pareto Concentration: Top 5 suppliers share
  const top5Spend = spendBySupplier.slice(0, 5).reduce((sum, s) => sum + s.spend, 0);
  const top5Pct = totalSpend > 0 ? Number(((top5Spend / totalSpend) * 100).toFixed(1)) : 0;

  return (
    <div className="space-y-6">
      {/* Top Stat Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Invoiced Spend"
          value={`₱${(totalSpend / 1000000).toFixed(2)}M`}
          subtitle={`${purchases.length} total orders recorded`}
          icon={<DollarSign className="w-5 h-5 text-[#002F87]" />}
        />

        <StatCard
          title="Top 5 Vendor Share"
          value={`${top5Pct}%`}
          subtitle={`₱${(top5Spend / 1000000).toFixed(2)}M of total budget`}
          icon={<Building2 className="w-5 h-5 text-purple-600" />}
          variant={top5Pct > 70 ? 'warning' : 'default'}
        />

        <StatCard
          title="Average Order Value"
          value={`₱${purchases.length > 0 ? Math.round(totalSpend / purchases.length).toLocaleString() : '0'}`}
          subtitle="Mean line item commitment"
          icon={<ShoppingCart className="w-5 h-5 text-emerald-600" />}
        />

        <StatCard
          title="Active Supply Categories"
          value={spendByCategory.length}
          subtitle="Procurement commodity groups"
          icon={<Package className="w-5 h-5 text-blue-600" />}
        />
      </div>

      {/* Row 2: Spend by Supplier Breakdown & Spend by Category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Supplier Spend Concentration */}
        <Card
          title="Procurement Spend by Supplier"
          subtitle="Vendor expenditure ranked by total commitment with composite score overlay"
        >
          <div className="space-y-3.5 max-h-[460px] overflow-y-auto pr-1">
            {spendBySupplier.map(s => {
              const pct = totalSpend > 0 ? Number(((s.spend / totalSpend) * 100).toFixed(1)) : 0;
              return (
                <div key={s.name} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-900 truncate max-w-[200px]">{s.name}</span>
                    <div className="text-right">
                      <span className="font-bold text-slate-900 font-mono">₱{s.spend.toLocaleString()}</span>
                      <span className="text-[10px] text-slate-400 ml-1.5 font-medium">({pct}%)</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className="bg-[#002F87] h-full rounded-full" style={{ width: `${Math.min(100, pct * 3.5)}%` }} />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
                    <span>{s.count} Purchase Orders</span>
                    <span>Scorecard: <strong className="text-slate-700">{s.score}/100</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Category Breakdown */}
        <Card
          title="Procurement Spend by Supply Category"
          subtitle="Commodity allocation across manufacturing and packaging portfolios"
        >
          <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
            {spendByCategory.map(c => {
              const pct = totalSpend > 0 ? Number(((c.spend / totalSpend) * 100).toFixed(1)) : 0;
              return (
                <div key={c.category} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-900">{c.category}</span>
                    <span className="font-mono font-bold text-slate-900">₱{c.spend.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${Math.min(100, pct * 2.5)}%` }} />
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    <span>Share of total procurement spend: <strong className="text-slate-700">{pct}%</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Row 3: Top Materials by Spend */}
      <Card
        title="Top Materials by Purchasing Spend"
        subtitle="Highest-value raw materials and packaging specifications"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px] bg-slate-50">
                <th className="py-2.5 px-3">Material Code</th>
                <th className="py-2.5 px-3">Material Description</th>
                <th className="py-2.5 px-3 text-center">Orders</th>
                <th className="py-2.5 px-3 text-right">Total Invoiced Amount (PHP)</th>
                <th className="py-2.5 px-3 text-right">Spend Share %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {spendByMaterial.map(m => {
                const pct = totalSpend > 0 ? ((m.spend / totalSpend) * 100).toFixed(1) : 0;
                return (
                  <tr key={m.code} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-slate-500">{m.code}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{m.name}</td>
                    <td className="py-2.5 px-3 text-center text-slate-600">{m.count}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold font-tabular-nums text-slate-900">
                      ₱{m.spend.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-tabular-nums text-slate-600">
                      {pct}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
