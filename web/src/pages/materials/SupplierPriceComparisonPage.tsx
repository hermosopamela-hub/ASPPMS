import React, { useState, useMemo } from 'react';
import { Package, Building2, CheckCircle2, AlertTriangle, ShieldCheck, DollarSign, Award, ArrowRight, Sparkles } from 'lucide-react';
import { dbService } from '../../services/db';
import { Material } from '../../types';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { WhatIfSimulatorModal } from '../../components/analytics/WhatIfSimulatorModal';

export const SupplierPriceComparisonPage: React.FC = () => {
  const materials = dbService.getMaterials();
  const [selectedMatId, setSelectedMatId] = useState<string>(materials[0]?.id || '');
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);

  const selectedMaterial = materials.find(m => m.id === selectedMatId) || materials[0];

  // Get suppliers supplying this material
  const suppliersComparison = useMemo(() => {
    return dbService.getSuppliersForMaterial(selectedMatId);
  }, [selectedMatId]);

  // Analytical Decision Logic (Requirement 21: Multi-dimensional, not solely lowest price)
  const recommendation = useMemo(() => {
    if (suppliersComparison.length === 0) return null;

    // Find lowest price
    const lowestPriceVendor = [...suppliersComparison].sort((a, b) => a.quotedPrice - b.quotedPrice)[0];
    // Find highest overall performance score
    const bestPerformanceVendor = [...suppliersComparison].sort((a, b) => b.overallScore - a.overallScore)[0];

    // Determine balanced recommendation
    let bestBalanced = bestPerformanceVendor;
    let rationale = '';

    if (lowestPriceVendor.supplierId === bestPerformanceVendor.supplierId) {
      bestBalanced = lowestPriceVendor;
      rationale = `${lowestPriceVendor.supplierName} offers both the lowest quoted price (₱${lowestPriceVendor.quotedPrice.toLocaleString()}) and the highest overall performance rating (${lowestPriceVendor.overallScore}/100, Tier: ${lowestPriceVendor.ratingTier}). Unanimous optimal choice.`;
    } else {
      // If lowest price vendor has poor quality or delivery (<75%), recommend higher quality vendor
      if (lowestPriceVendor.deliveryScore < 75 || lowestPriceVendor.qualityScore < 85) {
        bestBalanced = bestPerformanceVendor;
        rationale = `While ${lowestPriceVendor.supplierName} quotes a lower price (₱${lowestPriceVendor.quotedPrice.toLocaleString()}), their delivery reliability (${lowestPriceVendor.deliveryScore}%) or quality pass rate (${lowestPriceVendor.qualityScore}%) carries operational disruption risks. Analytical recommendation favors ${bestPerformanceVendor.supplierName} (Score: ${bestPerformanceVendor.overallScore}/100, Quality: ${bestPerformanceVendor.qualityScore}%) to preserve supply chain continuity.`;
      } else {
        rationale = `${bestPerformanceVendor.supplierName} leads in operational reliability (${bestPerformanceVendor.overallScore}/100), while ${lowestPriceVendor.supplierName} provides a potential cost saving at ₱${lowestPriceVendor.quotedPrice.toLocaleString()} with acceptable delivery performance (${lowestPriceVendor.deliveryScore}%). Decision should balance urgency versus volume margin.`;
      }
    }

    return {
      vendor: bestBalanced,
      rationale,
      lowestPriceVendor,
      bestPerformanceVendor,
    };
  }, [suppliersComparison]);

  return (
    <div className="space-y-6">
      {/* Material Selector Card */}
      <Card
        title="Cross-Supplier Material Price & Decision Benchmarking"
        subtitle="Compare all qualified vendors quoting this material across price, delivery SLA, QC quality, and composite ratings"
        action={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsSimulatorOpen(true)}
            icon={<Sparkles className="w-3.5 h-3.5" />}
          >
            Simulate Price & SLA Terms
          </Button>
        }
      >
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex-1 max-w-md">
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Select Material to Compare Vendors:
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

          <div className="flex items-center gap-4 text-xs">
            <div className="text-right">
              <span className="text-slate-400 text-[10px] uppercase font-semibold block">Benchmark Standard Price</span>
              <span className="font-mono text-base font-bold text-slate-800">
                ₱{selectedMaterial.standardPrice.toLocaleString()} / {selectedMaterial.uom}
              </span>
            </div>
            <div className="text-right pl-4 border-l border-slate-200">
              <span className="text-slate-400 text-[10px] uppercase font-semibold block">Designated Preferred Supplier</span>
              <span className="font-semibold text-[#002F87] text-xs block">
                {selectedMaterial.preferredSupplierName}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Comparative Matrix Table */}
      <Card
        title={`Supplier Pricing & Quality Matrix for ${selectedMaterial.materialName}`}
        subtitle={`${suppliersComparison.length} suppliers offering this item catalog SKU`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px] bg-slate-50">
                <th className="py-2.5 px-3">Supplier Name / Code</th>
                <th className="py-2.5 px-3 text-center">Status / Tag</th>
                <th className="py-2.5 px-3 text-right">Quoted Unit Price</th>
                <th className="py-2.5 px-3 text-right">Variance vs Standard</th>
                <th className="py-2.5 px-3 text-center">Lead Time</th>
                <th className="py-2.5 px-3 text-right">Delivery (OTD)</th>
                <th className="py-2.5 px-3 text-right">Quality Pass %</th>
                <th className="py-2.5 px-3 text-center">Overall Score</th>
                <th className="py-2.5 px-3">Payment Terms</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {suppliersComparison.map(sup => (
                <tr key={sup.supplierId} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-3">
                    <span className="font-semibold text-slate-900 block">{sup.supplierName}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{sup.supplierCode}</span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    {sup.isPreferred ? (
                      <Badge variant="primary" size="sm">Preferred</Badge>
                    ) : (
                      <Badge variant="neutral" size="sm">Alternate</Badge>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-sm text-slate-900 font-tabular-nums">
                    ₱{sup.quotedPrice.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right font-tabular-nums">
                    <span className={`font-semibold ${sup.priceVarianceVsStd > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {sup.priceVarianceVsStd > 0 ? `+${sup.priceVarianceVsStd}%` : `${sup.priceVarianceVsStd}%`}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center text-slate-700">
                    {sup.leadTimeDays} Days
                  </td>
                  <td className="py-3 px-3 text-right font-tabular-nums">
                    <span className={sup.deliveryScore >= 90 ? 'text-emerald-600 font-semibold' : 'text-slate-700'}>
                      {sup.deliveryScore}%
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-tabular-nums">
                    <span className={sup.qualityScore >= 90 ? 'text-emerald-600 font-semibold' : 'text-slate-700'}>
                      {sup.qualityScore}%
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <Badge variant={sup.overallScore >= 90 ? 'success' : sup.overallScore >= 80 ? 'primary' : 'warning'} size="sm">
                      {sup.overallScore} / 100
                    </Badge>
                  </td>
                  <td className="py-3 px-3 text-slate-600">
                    {sup.paymentTerms}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Analytical Recommendation Banner (Requirement 21) */}
      {recommendation && (
        <div className="bg-[#EFF4FC] border border-[#C8DBFC] rounded-xl p-5 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 text-[#002F87]">
            <Award className="w-5 h-5 text-[#002F87]" />
            <h4 className="font-bold text-sm tracking-tight uppercase">
              Analytical Procurement Recommendation
            </h4>
            <span className="text-[10px] bg-[#DBE8FC] text-[#002F87] px-2 py-0.5 rounded font-mono font-bold">
              Multi-Dimensional Decision Engine
            </span>
          </div>

          <p className="text-xs text-slate-800 leading-relaxed">
            {recommendation.rationale}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#C8DBFC]/60 text-xs text-slate-800">
            <div className="bg-white/90 p-3 rounded-lg border border-[#DBE8FC]">
              <span className="text-[10px] uppercase font-semibold text-[#002F87] block">Lowest Quoted Unit Price</span>
              <span className="font-bold text-slate-900 mt-0.5 block">{recommendation.lowestPriceVendor.supplierName}</span>
              <span className="text-emerald-700 font-mono font-semibold">₱{recommendation.lowestPriceVendor.quotedPrice.toLocaleString()} (Delivery: {recommendation.lowestPriceVendor.deliveryScore}%)</span>
            </div>

            <div className="bg-white/90 p-3 rounded-lg border border-[#DBE8FC]">
              <span className="text-[10px] uppercase font-semibold text-[#002F87] block">Highest Operational Reliability</span>
              <span className="font-bold text-slate-900 mt-0.5 block">{recommendation.bestPerformanceVendor.supplierName}</span>
              <span className="text-[#002F87] font-mono font-semibold">Score: {recommendation.bestPerformanceVendor.overallScore}/100 (Quality: {recommendation.bestPerformanceVendor.qualityScore}%)</span>
            </div>
          </div>
        </div>
      )}
      {isSimulatorOpen && (
        <WhatIfSimulatorModal
          isOpen={isSimulatorOpen}
          onClose={() => setIsSimulatorOpen(false)}
          initialMaterialId={selectedMatId}
          initialSupplierId={recommendation?.vendor?.supplierId}
        />
      )}
    </div>
  );
};
