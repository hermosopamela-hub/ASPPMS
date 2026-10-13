import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  ArrowRight, 
  Sliders, 
  Copy, 
  Check, 
  DollarSign, 
  Award, 
  Clock, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';
import { dbService } from '../../services/db';
import { Supplier, Material } from '../../types';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { calculateOverallScore } from '../../services/calculationEngine';

interface WhatIfSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSupplierId?: string;
  initialMaterialId?: string;
}

export const WhatIfSimulatorModal: React.FC<WhatIfSimulatorModalProps> = ({
  isOpen,
  onClose,
  initialSupplierId,
  initialMaterialId,
}) => {
  const suppliers = dbService.getSuppliers();
  const materials = dbService.getMaterials();
  const settings = dbService.getSettings();

  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(
    initialSupplierId || suppliers[0]?.id || ''
  );
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>(
    initialMaterialId || materials[0]?.id || ''
  );

  const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId) || suppliers[0];
  const selectedMaterial = materials.find(m => m.id === selectedMaterialId) || materials[0];

  // Simulation Sliders State
  const [priceDiscountPct, setPriceDiscountPct] = useState<number>(-5.0); // e.g. -5% discount
  const [simulatedOTD, setSimulatedOTD] = useState<number>(Math.min(100, Math.max(50, selectedSupplier ? selectedSupplier.deliveryScore + 5 : 90)));
  const [simulatedQuality, setSimulatedQuality] = useState<number>(Math.min(100, Math.max(50, selectedSupplier ? selectedSupplier.qualityScore + 3 : 95)));
  const [projectedAnnualVolume, setProjectedAnnualVolume] = useState<number>(5000);
  const [copiedMemo, setCopiedMemo] = useState(false);

  // Compute Baseline vs Simulated Price
  const baselineUnitPrice = selectedMaterial?.currentPrice || 100;
  const simulatedUnitPrice = Number((baselineUnitPrice * (1 + priceDiscountPct / 100)).toFixed(2));
  const priceSavingsPerUnit = Number((baselineUnitPrice - simulatedUnitPrice).toFixed(2));
  const projectedAnnualSavings = Number((priceSavingsPerUnit * projectedAnnualVolume).toFixed(2));
  const simulatedAnnualSpend = Number((simulatedUnitPrice * projectedAnnualVolume).toFixed(2));

  // Compute Simulated Scores
  // Peer price comparison benchmark
  const peerPrices = materials.map(m => m.currentPrice);
  const peerAvg = peerPrices.reduce((a, b) => a + b, 0) / peerPrices.length;
  const simulatedPriceRatio = simulatedUnitPrice / peerAvg;
  const simulatedPriceScore = Math.max(0, Math.min(100, Number((100 - (simulatedPriceRatio - 1.0) * 100).toFixed(1))));

  const simulatedOverall = useMemo(() => {
    return calculateOverallScore(
      {
        deliveryScore: simulatedOTD,
        qualityScore: simulatedQuality,
        priceScore: simulatedPriceScore,
        responsivenessScore: selectedSupplier?.responsivenessScore || 85,
        complianceScore: selectedSupplier?.complianceScore || 90,
      },
      settings.weights
    );
  }, [simulatedOTD, simulatedQuality, simulatedPriceScore, selectedSupplier, settings.weights]);

  // Projected Rank Shift
  const currentRank = useMemo(() => {
    const sorted = [...suppliers].sort((a, b) => b.overallScore - a.overallScore);
    const index = sorted.findIndex(s => s.id === selectedSupplier?.id);
    return index >= 0 ? index + 1 : 1;
  }, [suppliers, selectedSupplier]);

  const projectedRank = useMemo(() => {
    const list = suppliers.map(s => s.id === selectedSupplier?.id ? simulatedOverall.overallScore : s.overallScore);
    const sorted = [...list].sort((a, b) => b - a);
    const index = sorted.indexOf(simulatedOverall.overallScore);
    return index >= 0 ? index + 1 : 1;
  }, [suppliers, selectedSupplier, simulatedOverall.overallScore]);

  const scoreDelta = Number((simulatedOverall.overallScore - (selectedSupplier?.overallScore || 0)).toFixed(1));

  // Generate Negotiation Briefing Memo
  const negotiationMemo = useMemo(() => {
    if (!selectedSupplier || !selectedMaterial) return '';
    return `=== STRATEGIC SOURCING & NEGOTIATION BRIEFING ===
Vendor: ${selectedSupplier.supplierName} (${selectedSupplier.supplierCode})
Category: ${selectedSupplier.category} | Current Tier: ${selectedSupplier.ratingTier} (Score: ${selectedSupplier.overallScore}/100)
Target Item: ${selectedMaterial.materialName} (${selectedMaterial.materialCode})

1. COMMERCIAL TARGETS:
- Current Unit Price: ₱${baselineUnitPrice.toLocaleString()}
- Target Negotiated Price: ₱${simulatedUnitPrice.toLocaleString()} (${priceDiscountPct >= 0 ? '+' : ''}${priceDiscountPct}% variance)
- Target Annual Quantity: ${projectedAnnualVolume.toLocaleString()} ${selectedMaterial.uom}
- Projected Annual Net Cost Savings: ₱${projectedAnnualSavings.toLocaleString()}

2. SERVICE LEVEL AGREEMENT (SLA) IMPROVEMENTS:
- Current OTD: ${selectedSupplier.deliveryScore}% -> Target SLA Commitment: ${simulatedOTD}%
- Current QC Quality Pass: ${selectedSupplier.qualityScore}% -> Target Receiving Quality Standard: ${simulatedQuality}%

3. VENDOR STRATEGIC INCENTIVE:
- Vendor Composite Score increases by ${scoreDelta > 0 ? '+' : ''}${scoreDelta} pts (${selectedSupplier.overallScore} -> ${simulatedOverall.overallScore}/100)
- Projected Leaderboard Rank advances from #${currentRank} to #${projectedRank}
- Vendor Rating advances to tier "${simulatedOverall.ratingCategory}" (Preferred Supplier status qualification)
- Commercial commitment of ₱${simulatedAnnualSpend.toLocaleString()} contract volume for term adherence.`;
  }, [selectedSupplier, selectedMaterial, baselineUnitPrice, simulatedUnitPrice, priceDiscountPct, projectedAnnualVolume, projectedAnnualSavings, simulatedOTD, simulatedQuality, scoreDelta, simulatedOverall, currentRank, projectedRank, simulatedAnnualSpend]);

  const handleCopyMemo = () => {
    navigator.clipboard.writeText(negotiationMemo);
    setCopiedMemo(true);
    setTimeout(() => setCopiedMemo(false), 3000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Strategic What-If Scenario & Negotiation Simulator"
      subtitle="Simulate commercial concessions, SLA performance improvements, and score leaderboard shifts"
      maxWidth="xl"
    >
      <div className="space-y-6 text-xs text-slate-700">
        {/* Top Entity Pickers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
          <div>
            <label className="font-semibold text-slate-800 block mb-1">Target Supplier</label>
            <select
              value={selectedSupplierId}
              onChange={e => {
                setSelectedSupplierId(e.target.value);
                const s = suppliers.find(sup => sup.id === e.target.value);
                if (s) {
                  setSimulatedOTD(s.deliveryScore);
                  setSimulatedQuality(s.qualityScore);
                }
              }}
              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none"
            >
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>
                  {s.supplierName} ({s.supplierCode}) - Score: {s.overallScore}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-800 block mb-1">Benchmark Material Line</label>
            <select
              value={selectedMaterialId}
              onChange={e => setSelectedMaterialId(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none"
            >
              {materials.map(m => (
                <option key={m.id} value={m.id}>
                  {m.materialName} ({m.materialCode}) - ₱{m.currentPrice.toLocaleString()}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Dynamic Simulation Controls & Live Score Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Sliders (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-[#002F87]" />
              Hypothetical Negotiation Variables
            </h4>

            {/* Slider 1: Price Discount % */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">1. Price Concession / Discount</span>
                <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                  priceDiscountPct < 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {priceDiscountPct > 0 ? `+${priceDiscountPct}%` : `${priceDiscountPct}%`}
                </span>
              </div>
              <input
                type="range"
                min="-25"
                max="15"
                step="0.5"
                value={priceDiscountPct}
                onChange={e => setPriceDiscountPct(Number(e.target.value))}
                className="w-full accent-[#002F87] cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>-25% (Major Discount)</span>
                <span>Current Baseline (0%)</span>
                <span>+15% (Price Hike)</span>
              </div>
            </div>

            {/* Slider 2: On-Time Delivery Rate */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">2. Target Delivery SLA (OTD %)</span>
                <span className="font-mono font-bold text-xs bg-[#EFF4FC] text-[#002F87] border border-[#DBE8FC] px-2 py-0.5 rounded">
                  {simulatedOTD}% (Baseline: {selectedSupplier?.deliveryScore}%)
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="100"
                step="1"
                value={simulatedOTD}
                onChange={e => setSimulatedOTD(Number(e.target.value))}
                className="w-full accent-[#002F87] cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>50% (High Delays)</span>
                <span>85% (Standard)</span>
                <span>100% (Flawless Transit)</span>
              </div>
            </div>

            {/* Slider 3: Quality Acceptance Rate */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">3. Target QC Acceptance Rate (%)</span>
                <span className="font-mono font-bold text-xs bg-[#EFF4FC] text-[#002F87] border border-[#DBE8FC] px-2 py-0.5 rounded">
                  {simulatedQuality}% (Baseline: {selectedSupplier?.qualityScore}%)
                </span>
              </div>
              <input
                type="range"
                min="60"
                max="100"
                step="1"
                value={simulatedQuality}
                onChange={e => setSimulatedQuality(Number(e.target.value))}
                className="w-full accent-[#002F87] cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>60% (High Defect)</span>
                <span>90% (Acceptable)</span>
                <span>100% (Zero Defect)</span>
              </div>
            </div>

            {/* Projected Order Quantity */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-4">
              <div>
                <span className="font-semibold text-slate-800 block">Annual Contract Commitment Volume</span>
                <span className="text-[11px] text-slate-400">Used for annual savings & total spend projection</span>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="100"
                  step="500"
                  value={projectedAnnualVolume}
                  onChange={e => setProjectedAnnualVolume(Math.max(1, Number(e.target.value)))}
                  className="w-24 bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-mono text-right text-xs font-semibold text-slate-900"
                />
                <span className="text-slate-500 font-medium">{selectedMaterial?.uom || 'Units'}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Live Simulated Outcome Cards (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Simulated Performance Impact
            </h4>

            {/* Scorecard Comparison Box */}
            <div className="bg-[#002F87] text-white rounded-xl p-4 space-y-4 shadow-sm border border-[#00246B]">
              <div className="flex items-center justify-between border-b border-white/20 pb-3">
                <div>
                  <span className="text-[11px] text-blue-100 uppercase font-semibold">Vendor Rating</span>
                  <div className="text-xl font-bold">{simulatedOverall.ratingCategory}</div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-blue-100 uppercase font-semibold">Leaderboard Rank</span>
                  <div className="text-base font-bold text-[#44B330]">
                    #{projectedRank} <span className="text-xs text-blue-200 font-normal">(was #{currentRank})</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-2.5 rounded-lg bg-black/15 backdrop-blur-xs">
                  <span className="text-[10px] text-blue-100 block">Baseline Score</span>
                  <span className="text-lg font-mono font-bold">{selectedSupplier?.overallScore}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-500/25 border border-emerald-400/40">
                  <span className="text-[10px] text-emerald-100 block">Simulated Score</span>
                  <span className="text-lg font-mono font-bold text-white">
                    {simulatedOverall.overallScore}
                  </span>
                  <span className="text-[10px] block font-semibold text-emerald-200">
                    {scoreDelta > 0 ? `+${scoreDelta}` : scoreDelta} pts
                  </span>
                </div>
              </div>

              {/* Sub-scores breakdown */}
              <div className="space-y-1.5 text-[11px] pt-1">
                <div className="flex justify-between text-blue-100">
                  <span>Delivery Score (30%):</span>
                  <span className="font-mono font-bold text-white">{simulatedOTD} pts</span>
                </div>
                <div className="flex justify-between text-blue-100">
                  <span>Quality Score (30%):</span>
                  <span className="font-mono font-bold text-white">{simulatedQuality} pts</span>
                </div>
                <div className="flex justify-between text-blue-100">
                  <span>Price Competitiveness (20%):</span>
                  <span className="font-mono font-bold text-white">{simulatedPriceScore} pts</span>
                </div>
              </div>
            </div>

            {/* Financial Impact Box */}
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 block">
                Financial Impact & Cost Avoidance
              </span>
              <div className="flex justify-between items-baseline pt-1">
                <span className="text-slate-600">Simulated Unit Price:</span>
                <span className="font-mono font-bold text-slate-900">
                  ₱{simulatedUnitPrice.toLocaleString()} <span className="text-slate-400 line-through text-[10px]">₱{baselineUnitPrice.toLocaleString()}</span>
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-slate-600">Projected Annual Spend:</span>
                <span className="font-mono font-semibold text-slate-800">
                  ₱{simulatedAnnualSpend.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-baseline border-t border-emerald-200 pt-2 text-emerald-800 font-bold">
                <span>Annual Net Cost Savings:</span>
                <span className="font-mono text-sm text-emerald-700">
                  {projectedAnnualSavings >= 0 ? `₱${projectedAnnualSavings.toLocaleString()}` : `-₱${Math.abs(projectedAnnualSavings).toLocaleString()}`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Negotiation Memo Preview & Action */}
        <div className="p-4 bg-slate-900 rounded-xl text-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              Auto-Generated Executive Negotiation Briefing
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyMemo}
              className="bg-slate-800 hover:bg-slate-700 text-white border-slate-700 text-xs"
              icon={copiedMemo ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            >
              {copiedMemo ? 'Copied Brief to Clipboard!' : 'Copy Negotiation Memo'}
            </Button>
          </div>

          <pre className="text-[11px] font-mono text-emerald-400 bg-slate-950 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-40 border border-slate-800">
            {negotiationMemo}
          </pre>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
          <Button variant="primary" size="md" onClick={onClose}>
            Close Scenario Simulator
          </Button>
        </div>
      </div>
    </Modal>
  );
};
