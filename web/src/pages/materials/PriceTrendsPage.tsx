import React, { useState, useMemo } from 'react';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Calendar, Filter, BarChart3, Clock, DollarSign } from 'lucide-react';
import { dbService } from '../../services/db';
import { Material, PriceHistoryRecord } from '../../types';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';

export const PriceTrendsPage: React.FC = () => {
  const materials = dbService.getMaterials();
  const [selectedMatId, setSelectedMatId] = useState<string>(materials[0]?.id || '');

  const selectedMaterial = materials.find(m => m.id === selectedMatId) || materials[0];

  // Get price history records for selected material
  const priceRecords = useMemo(() => {
    return dbService.getPriceHistory({ materialId: selectedMatId });
  }, [selectedMatId]);

  // Statistical calculations
  const stats = useMemo(() => {
    if (priceRecords.length === 0) {
      return {
        lowest: selectedMaterial?.currentPrice || 0,
        highest: selectedMaterial?.currentPrice || 0,
        average: selectedMaterial?.currentPrice || 0,
        volatilityCV: 0,
      };
    }

    const prices = priceRecords.map(p => p.price);
    const lowest = Math.min(...prices);
    const highest = Math.max(...prices);
    const average = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);

    // Standard deviation and coefficient of variation
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - average, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);
    const volatilityCV = average > 0 ? Number(((stdDev / average) * 100).toFixed(1)) : 0;

    return { lowest, highest, average, volatilityCV };
  }, [priceRecords, selectedMaterial]);

  return (
    <div className="space-y-6">
      {/* Material Selector Header */}
      <Card
        title="Material Price Trend Analytics"
        subtitle="Track historical price timeline, volatility index, and purchase price shifts"
      >
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex-1 max-w-md">
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Select Material to Analyze:
            </label>
            <select
              value={selectedMatId}
              onChange={e => setSelectedMatId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#002F87]/20 focus:border-[#002F87]"
            >
              {materials.map(m => (
                <option key={m.id} value={m.id}>
                  {m.materialName} ({m.materialCode} • {m.category})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Benchmark Standard</span>
              <span className="text-base font-bold text-slate-700 font-mono">₱{selectedMaterial.standardPrice.toLocaleString()}</span>
            </div>
            <div className="text-right pl-3 border-l border-slate-200">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Active Current Price</span>
              <span className="text-lg font-bold text-slate-900 font-mono">₱{selectedMaterial.currentPrice.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Statistical Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Lowest Paid Price</span>
          <span className="text-xl font-bold font-tabular-nums text-emerald-600 mt-1 block">
            ₱{stats.lowest.toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Historical trough</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Average Paid Price</span>
          <span className="text-xl font-bold font-tabular-nums text-slate-800 mt-1 block">
            ₱{stats.average.toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Weighted peer mean</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Highest Paid Price</span>
          <span className="text-xl font-bold font-tabular-nums text-rose-600 mt-1 block">
            ₱{stats.highest.toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Peak PO recorded</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Price Volatility Index</span>
          <span className="text-xl font-bold font-tabular-nums text-[#002F87] mt-1 block">
            {stats.volatilityCV}% CV
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {stats.volatilityCV > 10 ? 'High volatility' : 'Stable volatility'}
          </span>
        </div>
      </div>

      {/* Historical Timeline Table */}
      <Card
        title={`Purchase Price History Timeline for ${selectedMaterial.materialName}`}
        subtitle={`${priceRecords.length} historical price events captured across purchase orders`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px] bg-slate-50">
                <th className="py-2.5 px-3">Date Recorded</th>
                <th className="py-2.5 px-3">PO Number</th>
                <th className="py-2.5 px-3">Quoting Supplier</th>
                <th className="py-2.5 px-3 text-right">Unit Price Paid</th>
                <th className="py-2.5 px-3 text-right">Prior Benchmark</th>
                <th className="py-2.5 px-3 text-right">Price Variance</th>
                <th className="py-2.5 px-3 text-center">Classification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {priceRecords.length > 0 ? (
                priceRecords.map(pr => (
                  <tr key={pr.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-slate-600">{pr.recordedDate}</td>
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-800">{pr.poNumber}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">{pr.supplierName}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold font-tabular-nums text-slate-900">
                      ₱{pr.price.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-500 font-tabular-nums">
                      ₱{pr.previousPrice.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-tabular-nums">
                      <span className={`inline-flex items-center gap-0.5 font-bold ${
                        pr.priceChangePct > 0 ? 'text-rose-600' : pr.priceChangePct < 0 ? 'text-emerald-600' : 'text-slate-500'
                      }`}>
                        {pr.priceChangePct > 0 ? `+${pr.priceChangePct}%` : `${pr.priceChangePct}%`}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <Badge
                        variant={
                          pr.classification.includes('Significant Increase') ? 'danger' :
                          pr.classification.includes('Moderate Increase') ? 'warning' :
                          pr.classification.includes('Decrease') ? 'success' : 'neutral'
                        }
                        size="sm"
                      >
                        {pr.classification}
                      </Badge>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No historical purchase transactions recorded yet for this material.
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
