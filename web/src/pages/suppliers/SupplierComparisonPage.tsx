import React, { useState } from 'react';
import { Building2, Check, ArrowRight, ShieldCheck, Clock, CheckCircle2, Sparkles } from 'lucide-react';
import { dbService } from '../../services/db';
import { Supplier } from '../../types';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { WhatIfSimulatorModal } from '../../components/analytics/WhatIfSimulatorModal';

export const SupplierComparisonPage: React.FC = () => {
  const suppliers = dbService.getSuppliers();
  const [selectedId1, setSelectedId1] = useState<string>(suppliers[0]?.id || '');
  const [selectedId2, setSelectedId2] = useState<string>(suppliers[1]?.id || '');
  const [selectedId3, setSelectedId3] = useState<string>(suppliers[2]?.id || '');
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simulatorSupplierId, setSimulatorSupplierId] = useState<string>('');

  const sup1 = suppliers.find(s => s.id === selectedId1);
  const sup2 = suppliers.find(s => s.id === selectedId2);
  const sup3 = suppliers.find(s => s.id === selectedId3);

  const comparedSuppliers = [sup1, sup2, sup3].filter(Boolean) as Supplier[];

  return (
    <div className="space-y-6">
      {/* Top Selector Card */}
      <Card
        title="Multi-Supplier Comparative Evaluation Matrix"
        subtitle="Select up to three suppliers for head-to-head performance, terms, and reliability benchmarking"
        action={
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setSimulatorSupplierId(selectedId1);
              setIsSimulatorOpen(true);
            }}
            icon={<Sparkles className="w-3.5 h-3.5" />}
          >
            Launch Scenario Simulator
          </Button>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="font-semibold text-slate-800 block mb-1">Supplier Slot 1</label>
            <select
              value={selectedId1}
              onChange={e => setSelectedId1(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-slate-900 focus:outline-none"
            >
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.supplierName} ({s.supplierCode})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-800 block mb-1">Supplier Slot 2</label>
            <select
              value={selectedId2}
              onChange={e => setSelectedId2(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-slate-900 focus:outline-none"
            >
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.supplierName} ({s.supplierCode})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-800 block mb-1">Supplier Slot 3</label>
            <select
              value={selectedId3}
              onChange={e => setSelectedId3(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-slate-900 focus:outline-none"
            >
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.supplierName} ({s.supplierCode})</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {comparedSuppliers.map((sup, idx) => (
          <div key={sup.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-5">
            {/* Header */}
            <div className="border-b border-slate-100 pb-3">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Slot {idx + 1}</span>
              <h3 className="font-bold text-base text-slate-900 mt-0.5 truncate">{sup.supplierName}</h3>
              <p className="text-xs text-slate-500">{sup.category} • {sup.supplierType}</p>
              <div className="mt-2 flex items-center justify-between">
                <Badge variant={sup.status === 'ACTIVE' ? 'success' : 'warning'} size="sm">
                  {sup.status}
                </Badge>
                <Badge variant={sup.overallScore >= 90 ? 'success' : sup.overallScore >= 80 ? 'primary' : 'warning'} size="sm">
                  {sup.ratingTier}
                </Badge>
              </div>
            </div>

            {/* Overall Score */}
            <div className="bg-slate-50 p-3.5 rounded-xl text-center">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Overall Weighted Score</span>
              <span className="text-3xl font-extrabold text-slate-900 font-tabular-nums block mt-1">
                {sup.overallScore}
              </span>
              <span className="text-xs text-slate-500">out of 100 points</span>
            </div>

            {/* Metrics Breakdown */}
            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between text-slate-600 mb-1">
                  <span>Delivery Reliability (OTD %):</span>
                  <strong className="font-tabular-nums text-slate-900">{sup.deliveryScore}%</strong>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full" style={{ width: `${sup.deliveryScore}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-600 mb-1">
                  <span>Quality Acceptance Rate:</span>
                  <strong className="font-tabular-nums text-emerald-600">{sup.qualityScore}%</strong>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${sup.qualityScore}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-600 mb-1">
                  <span>Price Competitiveness:</span>
                  <strong className="font-tabular-nums text-purple-600">{sup.priceScore}%</strong>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-purple-600 h-full rounded-full" style={{ width: `${sup.priceScore}%` }} />
                </div>
              </div>
            </div>

            {/* Commercial terms */}
            <div className="border-t border-slate-100 pt-3 space-y-2 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Standard Lead Time:</span>
                <strong className="text-slate-800">{sup.leadTimeDays} Days</strong>
              </div>
              <div className="flex justify-between">
                <span>Payment Terms:</span>
                <strong className="text-slate-800">{sup.paymentTerms}</strong>
              </div>
              <div className="flex justify-between">
                <span>Total Spend (PHP):</span>
                <strong className="text-slate-900 font-tabular-nums">₱{sup.totalSpend.toLocaleString()}</strong>
              </div>
              <div className="flex justify-between">
                <span>Contract Expiry:</span>
                <span className="font-mono text-slate-700">{sup.contractEndDate}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {isSimulatorOpen && (
        <WhatIfSimulatorModal
          isOpen={isSimulatorOpen}
          onClose={() => setIsSimulatorOpen(false)}
          initialSupplierId={simulatorSupplierId}
        />
      )}
    </div>
  );
};
