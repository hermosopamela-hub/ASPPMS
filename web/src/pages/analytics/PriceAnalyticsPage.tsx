import React, { useMemo, useState } from 'react';
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, ArrowUpRight, ArrowDownRight, Filter, BarChart3, Package } from 'lucide-react';
import { dbService } from '../../services/db';
import { Material, PriceHistoryRecord } from '../../types';
import { Card } from '../../components/common/Card';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';

export const PriceAnalyticsPage: React.FC = () => {
  const materials = dbService.getMaterials();
  const priceHistory = dbService.getPriceHistory();
  const purchases = dbService.getPurchases();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const categories = useMemo(() => {
    const set = new Set<string>();
    materials.forEach(m => set.add(m.category));
    return Array.from(set);
  }, [materials]);

  const filteredMaterials = useMemo(() => {
    if (selectedCategory === 'ALL') return materials;
    return materials.filter(m => m.category === selectedCategory);
  }, [materials, selectedCategory]);

  // Aggregate Price Movements
  const totalIncreased = filteredMaterials.filter(m => m.priceChangePct > 0);
  const totalDecreased = filteredMaterials.filter(m => m.priceChangePct < 0);
  const totalStable = filteredMaterials.filter(m => m.priceChangePct === 0);

  // Volatility calculations for all materials
  const materialVolatilities = useMemo(() => {
    return filteredMaterials.map(mat => {
      const records = priceHistory.filter(p => p.materialId === mat.id);
      if (records.length === 0) {
        return {
          material: mat,
          volatilityCV: 0,
          recordCount: 0,
          lowestPrice: mat.currentPrice,
          highestPrice: mat.currentPrice,
          priceSpread: 0,
        };
      }

      const prices = records.map(r => r.price);
      const lowest = Math.min(...prices);
      const highest = Math.max(...prices);
      const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
      const variance = prices.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / prices.length;
      const stdDev = Math.sqrt(variance);
      const cv = avg > 0 ? Number(((stdDev / avg) * 100).toFixed(1)) : 0;

      return {
        material: mat,
        volatilityCV: cv,
        recordCount: records.length,
        lowestPrice: lowest,
        highestPrice: highest,
        priceSpread: highest - lowest,
      };
    }).sort((a, b) => b.volatilityCV - a.volatilityCV);
  }, [filteredMaterials, priceHistory]);

  // Estimated Procurement Inflation / Deflation Budget Impact
  const budgetImpact = useMemo(() => {
    let netDelta = 0;
    purchases.forEach(p => {
      const mat = materials.find(m => m.id === p.materialId);
      if (mat) {
        const delta = (p.unitPrice - mat.standardPrice) * p.quantity;
        netDelta += delta;
      }
    });
    return Math.round(netDelta);
  }, [purchases, materials]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">
            Material Price Volatility & Inflation Analytics
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Statistical price distribution, standard benchmark variances, and market price fluctuations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-semibold text-slate-800 focus:outline-none"
          >
            <option value="ALL">All Commodity Categories ({materials.length})</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 1: KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Inflationary Cost Impact"
          value={`+₱${(budgetImpact / 1000).toLocaleString()}k`}
          subtitle="Net variance against benchmark"
          icon={<DollarSign className="w-5 h-5 text-rose-600" />}
          variant={budgetImpact > 0 ? 'danger' : 'success'}
        />

        <StatCard
          title="Price Increase Count"
          value={totalIncreased.length}
          subtitle={`Across ${filteredMaterials.length} monitored items`}
          icon={<TrendingUp className="w-5 h-5 text-rose-600" />}
          variant="warning"
        />

        <StatCard
          title="Price Decrease Count"
          value={totalDecreased.length}
          subtitle="Cost-saving opportunities"
          icon={<TrendingDown className="w-5 h-5 text-emerald-600" />}
          variant="success"
        />

        <StatCard
          title="Stable Materials"
          value={totalStable.length}
          subtitle="Unchanged benchmark rate"
          icon={<Package className="w-5 h-5 text-blue-600" />}
        />
      </div>

      {/* Row 2: Most Volatile Materials Table */}
      <Card
        title="Top Most Volatile Materials (Coefficient of Variation % CV)"
        subtitle="Ranked by price volatility index based on historical PO unit price dispersion"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px] bg-slate-50">
                <th className="py-2.5 px-3">Material Code / SKU</th>
                <th className="py-2.5 px-3">Material Specification</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 text-right">Standard (PHP)</th>
                <th className="py-2.5 px-3 text-right">Lowest Paid</th>
                <th className="py-2.5 px-3 text-right">Highest Paid</th>
                <th className="py-2.5 px-3 text-right">Price Spread</th>
                <th className="py-2.5 px-3 text-center">Volatility Index (% CV)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {materialVolatilities.slice(0, 10).map(v => (
                <tr key={v.material.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 px-3 font-mono font-medium text-slate-600">
                    {v.material.materialCode}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">
                    {v.material.materialName}
                    <span className="block text-[10px] text-slate-400 font-normal">{v.material.uom}</span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">{v.material.category}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-600 font-tabular-nums">
                    ₱{v.material.standardPrice.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-semibold font-tabular-nums">
                    ₱{v.lowestPrice.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-rose-700 font-semibold font-tabular-nums">
                    ₱{v.highestPrice.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-900 font-medium font-tabular-nums">
                    ₱{v.priceSpread.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <Badge
                      variant={v.volatilityCV >= 10 ? 'danger' : v.volatilityCV >= 5 ? 'warning' : 'neutral'}
                      size="sm"
                    >
                      {v.volatilityCV}% CV
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
