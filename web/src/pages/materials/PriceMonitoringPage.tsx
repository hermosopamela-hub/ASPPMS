import React, { useState, useMemo } from 'react';
import { DollarSign, ArrowUpRight, ArrowDownRight, Minus, Filter, Download, AlertTriangle, TrendingUp } from 'lucide-react';
import { dbService } from '../../services/db';
import { Material, PriceClassification } from '../../types';
import { DataTable, Column } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';

export const PriceMonitoringPage: React.FC = () => {
  const [materials] = useState<Material[]>(() => dbService.getMaterials());
  const [filterClass, setFilterClass] = useState<string>('ALL');

  const filteredMaterials = useMemo(() => {
    if (filterClass === 'ALL') return materials;
    if (filterClass === 'INCREASES') return materials.filter(m => m.priceChangePct > 0);
    if (filterClass === 'SIGNIFICANT_INCREASE') return materials.filter(m => m.priceChangePct >= 10.0);
    if (filterClass === 'MODERATE_INCREASE') return materials.filter(m => m.priceChangePct >= 3.0 && m.priceChangePct < 10.0);
    if (filterClass === 'DECREASES') return materials.filter(m => m.priceChangePct < 0);
    if (filterClass === 'STABLE') return materials.filter(m => m.priceChangePct >= -1.0 && m.priceChangePct <= 1.0);
    return materials;
  }, [materials, filterClass]);

  const significantHikes = materials.filter(m => m.priceChangePct >= 10.0);
  const moderateHikes = materials.filter(m => m.priceChangePct >= 3.0 && m.priceChangePct < 10.0);
  const decreases = materials.filter(m => m.priceChangePct <= -3.0);
  const stable = materials.filter(m => m.priceChangePct >= -1.0 && m.priceChangePct <= 1.0);

  const columns: Column<Material>[] = [
    {
      key: 'materialCode',
      header: 'Code',
      sortable: true,
      className: 'font-mono text-xs text-slate-500 w-24',
    },
    {
      key: 'materialName',
      header: 'Material / Specification',
      sortable: true,
      render: (m) => (
        <div>
          <span className="font-semibold text-slate-900 block">{m.materialName}</span>
          <span className="text-[11px] text-slate-400 block">{m.category} • {m.uom}</span>
        </div>
      ),
    },
    {
      key: 'preferredSupplierName',
      header: 'Quoted Supplier',
      sortable: true,
      render: (m) => <span className="text-slate-700 text-xs font-medium">{m.preferredSupplierName}</span>,
    },
    {
      key: 'standardPrice',
      header: 'Benchmark Standard',
      sortable: true,
      align: 'right',
      render: (m) => (
        <span className="font-mono text-xs text-slate-500 font-tabular-nums">
          ₱{m.standardPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'currentPrice',
      header: 'Current Price',
      sortable: true,
      align: 'right',
      render: (m) => (
        <span className="font-mono text-xs font-semibold text-slate-900 font-tabular-nums">
          ₱{m.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'priceDiff',
      header: 'Absolute Delta',
      sortable: true,
      align: 'right',
      render: (m) => {
        const diff = m.currentPrice - m.standardPrice;
        return (
          <span className={`font-mono text-xs font-tabular-nums ${diff > 0 ? 'text-rose-600' : diff < 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
            {diff > 0 ? `+₱${diff.toLocaleString()}` : diff < 0 ? `-₱${Math.abs(diff).toLocaleString()}` : '₱0.00'}
          </span>
        );
      },
    },
    {
      key: 'priceChangePct',
      header: 'Variance %',
      sortable: true,
      align: 'right',
      render: (m) => {
        const isUp = m.priceChangePct > 0;
        const isDown = m.priceChangePct < 0;
        return (
          <div className="inline-flex items-center gap-0.5 font-bold text-xs font-tabular-nums">
            {isUp && (
              <span className="text-rose-600 flex items-center">
                <ArrowUpRight className="w-3.5 h-3.5" /> +{m.priceChangePct}%
              </span>
            )}
            {isDown && (
              <span className="text-emerald-600 flex items-center">
                <ArrowDownRight className="w-3.5 h-3.5" /> {m.priceChangePct}%
              </span>
            )}
            {!isUp && !isDown && (
              <span className="text-slate-400 flex items-center">
                <Minus className="w-3.5 h-3.5" /> 0.0%
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'classification',
      header: 'Classification',
      render: (m) => {
        if (m.priceChangePct >= 10.0) {
          return <Badge variant="danger" size="sm">Significant Increase</Badge>;
        }
        if (m.priceChangePct >= 3.0) {
          return <Badge variant="warning" size="sm">Moderate Increase</Badge>;
        }
        if (m.priceChangePct <= -10.0) {
          return <Badge variant="success" size="sm">Significant Decrease</Badge>;
        }
        if (m.priceChangePct <= -3.0) {
          return <Badge variant="success" size="sm">Moderate Decrease</Badge>;
        }
        return <Badge variant="neutral" size="sm">Stable</Badge>;
      },
    },
  ];

  const handleExportCSV = () => {
    const headers = ['Code', 'Material Name', 'Category', 'UOM', 'Benchmark Standard PHP', 'Current Price PHP', 'Absolute Delta PHP', 'Variance %', 'Supplier'];
    const rows = filteredMaterials.map(m => [
      m.materialCode,
      `"${m.materialName}"`,
      `"${m.category}"`,
      m.uom,
      m.standardPrice,
      m.currentPrice,
      m.currentPrice - m.standardPrice,
      m.priceChangePct,
      `"${m.preferredSupplierName}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `price_monitoring_matrix_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* KPI Ribbons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-rose-200/80 bg-rose-50/20">
          <span className="text-[10px] uppercase font-bold text-rose-600 block">Critical Price Hikes (≥10%)</span>
          <span className="text-2xl font-extrabold text-rose-700 mt-1 block">{significantHikes.length} items</span>
          <span className="text-xs text-rose-500 mt-0.5 block">Requires immediate renegotiation</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200/80 bg-amber-50/20">
          <span className="text-[10px] uppercase font-bold text-amber-600 block">Moderate Increases (3-10%)</span>
          <span className="text-2xl font-extrabold text-amber-700 mt-1 block">{moderateHikes.length} items</span>
          <span className="text-xs text-amber-500 mt-0.5 block">Watchlist for escalation</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200/80 bg-emerald-50/20">
          <span className="text-[10px] uppercase font-bold text-emerald-600 block">Price Reductions (≤-3%)</span>
          <span className="text-2xl font-extrabold text-emerald-700 mt-1 block">{decreases.length} items</span>
          <span className="text-xs text-emerald-600 mt-0.5 block">Favorable cost savings</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Stable Material Line</span>
          <span className="text-2xl font-extrabold text-slate-800 mt-1 block">{stable.length} items</span>
          <span className="text-xs text-slate-400 mt-0.5 block">Within ±1.0% variance</span>
        </div>
      </div>

      {/* Filters & Export */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filterClass}
            onChange={e => setFilterClass(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#002F87]/20 focus:border-[#002F87] shadow-2xs"
          >
            <option value="ALL">All Price Movements ({materials.length})</option>
            <option value="SIGNIFICANT_INCREASE">Critical Hikes Only (≥10%)</option>
            <option value="MODERATE_INCREASE">Moderate Hikes (3% - 10%)</option>
            <option value="DECREASES">Price Decreases (Savings)</option>
            <option value="STABLE">Stable (±1%)</option>
          </select>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCSV}
          icon={<Download className="w-3.5 h-3.5" />}
        >
          Export Price Monitor
        </Button>
      </div>

      <DataTable
        data={filteredMaterials}
        columns={columns}
        searchPlaceholder="Search materials by name, SKU, or supplier..."
        searchableKey={(m) => `${m.materialName} ${m.materialCode} ${m.preferredSupplierName}`}
        pageSize={12}
      />
    </div>
  );
};
