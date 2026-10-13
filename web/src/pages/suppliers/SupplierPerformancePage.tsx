import React, { useState } from 'react';
import { Award, RefreshCw, BarChart2, ShieldCheck, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';
import { dbService } from '../../services/db';
import { Supplier } from '../../types';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { WhatIfSimulatorModal } from '../../components/analytics/WhatIfSimulatorModal';

export const SupplierPerformancePage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => dbService.getSuppliers());
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(suppliers[0]?.id || '');
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);

  const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId) || suppliers[0];

  const handleRecalculate = async () => {
    try {
      await dbService.recalculateAllSuppliers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      return;
    }
    setSuppliers(dbService.getSuppliers());
    alert('Automated recalculation completed across all supplier performance scorecards.');
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">
            Automated Supplier Performance Scoring Engine
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time evaluation based on Delivery (30%), Quality (30%), Price (20%), Responsiveness (10%), and Compliance (10%).
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRecalculate}
          icon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Recalculate All
        </Button>
      </div>

      {/* Main Scorecard View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Supplier Selector List */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-2 mb-2">
            Suppliers Evaluated ({suppliers.length})
          </h3>
          <div className="space-y-1 max-h-[600px] overflow-y-auto">
            {suppliers.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedSupplierId(s.id)}
                className={`w-full text-left p-3 rounded-lg text-xs transition-colors flex items-center justify-between ${
                  selectedSupplierId === s.id
                    ? 'bg-[#EFF4FC] border border-[#DBE8FC] text-[#002F87] font-semibold'
                    : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="truncate mr-2">
                  <span className="block truncate">{s.supplierName}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{s.supplierCode}</span>
                </div>
                <Badge
                  variant={s.overallScore >= 90 ? 'success' : s.overallScore >= 80 ? 'primary' : s.overallScore >= 70 ? 'neutral' : 'danger'}
                  size="sm"
                >
                  {s.overallScore}
                </Badge>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Detailed Scorecard Snapshot (2 cols) */}
        {selectedSupplier && (
          <div className="lg:col-span-2 space-y-6">
            <Card
              title={`Scorecard: ${selectedSupplier.supplierName}`}
              subtitle={`Vendor Code: ${selectedSupplier.supplierCode} • ${selectedSupplier.category}`}
              action={
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsSimulatorOpen(true)}
                  icon={<Sparkles className="w-3.5 h-3.5" />}
                >
                  Simulate What-If Scenario
                </Button>
              }
            >
              {/* Scorecard Hero Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
                <div className="text-center">
                  <span className="text-slate-400 text-[10px] uppercase font-semibold block">Composite Score</span>
                  <span className="text-3xl font-extrabold text-slate-900 mt-1 block">{selectedSupplier.overallScore}</span>
                  <Badge variant={selectedSupplier.overallScore >= 80 ? 'success' : 'warning'} size="sm" className="mt-1">
                    {selectedSupplier.ratingTier}
                  </Badge>
                </div>
                <div className="text-center">
                  <span className="text-slate-400 text-[10px] uppercase font-semibold block">Delivery Score</span>
                  <span className="text-2xl font-bold text-slate-800 mt-1 block">{selectedSupplier.deliveryScore}%</span>
                  <span className="text-[10px] text-slate-500">Weight: 30%</span>
                </div>
                <div className="text-center">
                  <span className="text-slate-400 text-[10px] uppercase font-semibold block">Quality Acceptance</span>
                  <span className="text-2xl font-bold text-emerald-600 mt-1 block">{selectedSupplier.qualityScore}%</span>
                  <span className="text-[10px] text-slate-500">Weight: 30%</span>
                </div>
                <div className="text-center">
                  <span className="text-slate-400 text-[10px] uppercase font-semibold block">Price Index</span>
                  <span className="text-2xl font-bold text-purple-600 mt-1 block">{selectedSupplier.priceScore}</span>
                  <span className="text-[10px] text-slate-500">Weight: 20%</span>
                </div>
              </div>

              {/* Dimensional Evaluation Progress Bars */}
              <div className="space-y-4 text-xs">
                <div>
                  <div className="flex justify-between text-slate-700 mb-1.5 font-medium">
                    <span>1. Delivery Performance (Weight 30%)</span>
                    <strong className="font-tabular-nums">{selectedSupplier.deliveryScore}% (Points: {(selectedSupplier.deliveryScore * 0.3).toFixed(1)})</strong>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${selectedSupplier.deliveryScore}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-700 mb-1.5 font-medium">
                    <span>2. Quality Acceptance (Weight 30%)</span>
                    <strong className="font-tabular-nums text-emerald-600">{selectedSupplier.qualityScore}% (Points: {(selectedSupplier.qualityScore * 0.3).toFixed(1)})</strong>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${selectedSupplier.qualityScore}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-700 mb-1.5 font-medium">
                    <span>3. Price Competitiveness (Weight 20%)</span>
                    <strong className="font-tabular-nums text-purple-600">{selectedSupplier.priceScore} (Points: {(selectedSupplier.priceScore * 0.2).toFixed(1)})</strong>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-600 rounded-full" style={{ width: `${selectedSupplier.priceScore}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-700 mb-1.5 font-medium">
                    <span>4. Responsiveness SLA (Weight 10%)</span>
                    <strong className="font-tabular-nums">{selectedSupplier.responsivenessScore}% (Points: {(selectedSupplier.responsivenessScore * 0.1).toFixed(1)})</strong>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#002F87] rounded-full" style={{ width: `${selectedSupplier.responsivenessScore}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-700 mb-1.5 font-medium">
                    <span>5. Compliance & Certification (Weight 10%)</span>
                    <strong className="font-tabular-nums">{selectedSupplier.complianceScore}% (Points: {(selectedSupplier.complianceScore * 0.1).toFixed(1)})</strong>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-700 rounded-full" style={{ width: `${selectedSupplier.complianceScore}%` }} />
                  </div>
                </div>
              </div>

              {/* Narrative Summary */}
              <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                <span className="font-semibold text-slate-900 block">Analytical Performance Review:</span>
                <p>
                  {selectedSupplier.supplierName} holds a composite rating of <strong>{selectedSupplier.overallScore}/100 ({selectedSupplier.ratingTier})</strong>.
                  Delivery reliability is currently measured at <strong>{selectedSupplier.deliveryScore}%</strong> with a standard operational lead time of {selectedSupplier.leadTimeDays} days.
                  Contract status is valid through {selectedSupplier.contractEndDate}.
                </p>
              </div>
            </Card>
          </div>
        )}
      </div>
      {isSimulatorOpen && (
        <WhatIfSimulatorModal
          isOpen={isSimulatorOpen}
          onClose={() => setIsSimulatorOpen(false)}
          initialSupplierId={selectedSupplier?.id}
        />
      )}
    </div>
  );
};
