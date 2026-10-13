import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  Filter, 
  Calendar, 
  Eye, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  ShieldCheck, 
  Building2, 
  Package, 
  ShoppingCart, 
  Sparkles,
  X,
  FileCheck,
  ChevronRight,
  Layers
} from 'lucide-react';
import { dbService } from '../../services/db';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';
import { 
  ReportOptions, 
  downloadProcurementPdf, 
  getProcurementPdfBlobUrl 
} from '../../services/pdfReportGenerator';

interface ReportConfig {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  category: 'Supplier' | 'Price' | 'Purchasing' | 'Governance';
  icon: React.ReactNode;
}

export const ReportsPage: React.FC = () => {
  const { currentUser, currentRole } = useAuth();

  const [selectedReportId, setSelectedReportId] = useState<string>('supplier_performance');
  const [dateRange, setDateRange] = useState<string>('Year-to-Date (2026)');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [includeKpis, setIncludeKpis] = useState<boolean>(true);
  const [includeSignatures, setIncludeSignatures] = useState<boolean>(true);
  
  // PDF Preview Modal State
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [downloadSuccessToast, setDownloadSuccessToast] = useState<string | null>(null);

  // Datasets from DB
  const allSuppliers = dbService.getSuppliers();
  const allMaterials = dbService.getMaterials();
  const allPurchases = dbService.getPurchases();
  const alerts = dbService.getAlerts();

  // Categories list
  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    allSuppliers.forEach(s => set.add(s.category));
    allMaterials.forEach(m => set.add(m.category));
    return Array.from(set);
  }, [allSuppliers, allMaterials]);

  // Filtered Datasets based on selected category
  const filteredSuppliers = useMemo(() => {
    if (selectedCategory === 'ALL') return allSuppliers;
    return allSuppliers.filter(s => s.category === selectedCategory);
  }, [allSuppliers, selectedCategory]);

  const filteredMaterials = useMemo(() => {
    if (selectedCategory === 'ALL') return allMaterials;
    return allMaterials.filter(m => m.category === selectedCategory);
  }, [allMaterials, selectedCategory]);

  const filteredPurchases = useMemo(() => {
    if (selectedCategory === 'ALL') return allPurchases;
    // Match by supplier category
    const supplierIds = new Set(filteredSuppliers.map(s => s.id));
    return allPurchases.filter(p => supplierIds.has(p.supplierId));
  }, [allPurchases, filteredSuppliers, selectedCategory]);

  const reportList: ReportConfig[] = [
    {
      id: 'supplier_performance',
      number: 1,
      title: 'Supplier Performance Evaluation Report',
      subtitle: 'Comprehensive performance scorecards across Delivery (30%), Quality (30%), Price (20%), and Compliance',
      category: 'Supplier',
      icon: <Building2 className="w-4 h-4 text-[#002F87]" />,
    },
    {
      id: 'supplier_ranking',
      number: 2,
      title: 'Supplier Scorecard Ranking & Tier Audit',
      subtitle: 'Evaluation leaderboard categorized from Tier 1 Excellent down to High-Risk vendors',
      category: 'Supplier',
      icon: <CheckCircle2 className="w-4 h-4 text-[#44B330]" />,
    },
    {
      id: 'price_change',
      number: 3,
      title: 'Material Price Variance & Inflation Audit',
      subtitle: 'Identifies all material price deviations (>10%) against corporate standard baselines',
      category: 'Price',
      icon: <TrendingUp className="w-4 h-4 text-[#002F87]" />,
    },
    {
      id: 'purchasing_summary',
      number: 4,
      title: 'Purchasing PO Spend & Transaction Ledger',
      subtitle: 'Historical transaction ledger, order volume allocations, and total spend distribution',
      category: 'Purchasing',
      icon: <ShoppingCart className="w-4 h-4 text-[#44B330]" />,
    },
    {
      id: 'delivery_performance',
      number: 5,
      title: 'Delivery SLA Fulfillment & Logistics Report',
      subtitle: 'On-time delivery percentages, average shipment transit delays, and lead-time adherence',
      category: 'Supplier',
      icon: <ShieldCheck className="w-4 h-4 text-[#002F87]" />,
    },
    {
      id: 'quality_performance',
      number: 6,
      title: 'Quality Inspection & Defect Acceptance Audit',
      subtitle: 'Receiving inspection pass rates, QA defect percentages, and supplier return audits',
      category: 'Supplier',
      icon: <CheckCircle2 className="w-4 h-4 text-[#44B330]" />,
    },
    {
      id: 'supplier_risk',
      number: 7,
      title: 'High-Risk Vendor & Contract Expiration Audit',
      subtitle: 'Vendors scored below 75.0, probationary suppliers, and expiring procurement agreements',
      category: 'Governance',
      icon: <AlertTriangle className="w-4 h-4 text-rose-600" />,
    },
  ];

  const currentReport = reportList.find(r => r.id === selectedReportId) || reportList[0];

  // Prepare Report Options helper
  const getReportPayload = (): ReportOptions => {
    return {
      reportId: currentReport.id,
      reportTitle: currentReport.title,
      reportSubtitle: currentReport.subtitle,
      dateRange: dateRange,
      categoryFilter: selectedCategory,
      includeKpis: includeKpis,
      includeSignatures: includeSignatures,
      generatedBy: {
        name: currentUser?.displayName || 'Elena Rostova',
        role: currentUser?.role?.replace(/_/g, ' ') || 'Purchasing Manager',
        department: currentUser?.department || 'Strategic Procurement',
      },
    };
  };

  const getDatasetPayload = () => {
    return {
      suppliers: filteredSuppliers,
      materials: filteredMaterials,
      purchases: filteredPurchases,
      alerts: alerts,
    };
  };

  // Handle direct PDF Download
  const handleExportPdf = () => {
    setIsGenerating(true);
    try {
      const options = getReportPayload();
      const data = getDatasetPayload();
      downloadProcurementPdf(options, data);

      setDownloadSuccessToast(`Successfully exported ${currentReport.title} as PDF!`);
      setTimeout(() => setDownloadSuccessToast(null), 4000);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle live PDF Preview Modal
  const handlePreviewPdf = () => {
    setIsGenerating(true);
    try {
      const options = getReportPayload();
      const data = getDatasetPayload();
      const blobUrl = getProcurementPdfBlobUrl(options, data);
      setPreviewPdfUrl(blobUrl);
    } catch (err) {
      console.error('Failed to preview PDF:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle CSV Export
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: any[][] = [];

    if (selectedReportId === 'supplier_performance' || selectedReportId === 'supplier_ranking') {
      headers = ['Supplier Code', 'Supplier Name', 'Category', 'Status', 'Delivery %', 'Quality %', 'Price Score', 'Overall Score', 'Rating Tier', 'Total Spend PHP'];
      rows = filteredSuppliers.map(s => [
        s.supplierCode,
        `"${s.supplierName}"`,
        `"${s.category}"`,
        s.status,
        s.deliveryScore,
        s.qualityScore,
        s.priceScore,
        s.overallScore,
        s.ratingTier,
        s.totalSpend,
      ]);
    } else if (selectedReportId === 'price_change') {
      headers = ['Material Code', 'Material Name', 'Category', 'Standard Price PHP', 'Current Price PHP', 'Variance %', 'Preferred Supplier'];
      rows = filteredMaterials.map(m => [
        m.materialCode,
        `"${m.materialName}"`,
        `"${m.category}"`,
        m.standardPrice,
        m.currentPrice,
        m.priceChangePct,
        `"${m.preferredSupplierName}"`,
      ]);
    } else if (selectedReportId === 'purchasing_summary') {
      headers = ['PO Number', 'PO Date', 'Supplier', 'Material Name', 'Qty', 'Unit Price PHP', 'Total Spend PHP', 'Delivery SLA'];
      rows = filteredPurchases.map(p => [
        p.poNumber,
        p.poDate,
        `"${p.supplierName}"`,
        `"${p.materialName}"`,
        p.quantity,
        p.unitPrice,
        p.totalAmount,
        p.deliveryStatus,
      ]);
    } else {
      headers = ['Supplier Code', 'Supplier Name', 'Category', 'Score', 'Status', 'Contract End'];
      rows = filteredSuppliers.map(s => [
        s.supplierCode,
        `"${s.supplierName}"`,
        `"${s.category}"`,
        s.overallScore,
        s.status,
        s.contractEndDate,
      ]);
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `IPI_${selectedReportId}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {downloadSuccessToast && (
        <div className="fixed top-20 right-6 z-50 bg-[#002F87] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs animate-bounce border border-[#44B330]">
          <FileCheck className="w-4 h-4 text-[#44B330]" />
          <span className="font-semibold">{downloadSuccessToast}</span>
        </div>
      )}

      {/* Header Banner - 60% White / 30% Blue branding */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-[#EFF4FC] text-[#002F87] border border-[#DBE8FC] text-[11px] font-bold">
              IPI Document Engine
            </span>
            <span className="text-slate-400 text-xs">•</span>
            <span className="text-xs text-slate-500 font-medium">
              Standard Corporate Reporting Standard (A4)
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
            Enterprise Procurement & Supplier PDF Reporting
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Generate publication-ready, audit-compliant PDF documents with official IPI branding, KPI executive summaries, structured scorecards, and authorization sign-offs.
          </p>
        </div>

        {/* Global Quick Action */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="md"
            onClick={handlePreviewPdf}
            icon={<Eye className="w-4 h-4 text-[#002F87]" />}
            disabled={isGenerating}
          >
            Live PDF Preview
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleExportPdf}
            icon={<Download className="w-4 h-4 text-[#44B330]" />}
            disabled={isGenerating}
          >
            {isGenerating ? 'Compiling PDF...' : 'Export Official PDF'}
          </Button>
        </div>
      </div>

      {/* Main Two-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Report Selection & Config (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Report Catalog Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Procurement Report Directory
              </h3>
              <span className="text-[10px] font-semibold text-[#002F87] bg-[#EFF4FC] px-2 py-0.5 rounded-full border border-[#DBE8FC]">
                {reportList.length} Templates
              </span>
            </div>

            <div className="space-y-1.5">
              {reportList.map(r => {
                const isSelected = selectedReportId === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedReportId(r.id)}
                    className={`w-full text-left p-3 rounded-xl text-xs transition-all flex items-start gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-[#EFF4FC] border border-[#C8DBFC] shadow-2xs'
                        : 'border border-transparent hover:bg-slate-50 hover:border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                      isSelected ? 'bg-white shadow-2xs' : 'bg-slate-100'
                    }`}>
                      {r.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`font-semibold truncate ${
                          isSelected ? 'text-[#002F87]' : 'text-slate-900'
                        }`}>
                          {r.title}
                        </span>
                        <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${
                          isSelected ? 'text-[#002F87]' : 'text-slate-300'
                        }`} />
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        {r.subtitle}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-mono">
                          Doc Ref: #{r.number}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                          {r.category}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Report Configuration & Customization */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
              PDF Document Customization
            </h3>

            {/* Date Scope */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Reporting Horizon / Scope
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={dateRange}
                  onChange={e => setDateRange(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#002F87]/20 focus:border-[#002F87]"
                >
                  <option value="Year-to-Date (2026)">Year-to-Date (2026)</option>
                  <option value="Q3 2026 (July - September)">Q3 2026 (July - September)</option>
                  <option value="Q2 2026 (April - June)">Q2 2026 (April - June)</option>
                  <option value="All Historical Scope (2025-2026)">All Historical Scope (2025-2026)</option>
                </select>
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Product / Supply Category Filter
              </label>
              <div className="relative">
                <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#002F87]/20 focus:border-[#002F87]"
                >
                  <option value="ALL">All Categories (Enterprise-wide)</option>
                  {categoryOptions.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Toggles */}
            <div className="pt-2 border-t border-slate-100 space-y-2.5">
              <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeKpis}
                  onChange={e => setIncludeKpis(e.target.checked)}
                  className="rounded border-slate-300 text-[#002F87] focus:ring-[#002F87]/30 cursor-pointer"
                />
                <span className="font-medium">Include Executive KPI Summary Cards</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeSignatures}
                  onChange={e => setIncludeSignatures(e.target.checked)}
                  className="rounded border-slate-300 text-[#002F87] focus:ring-[#002F87]/30 cursor-pointer"
                />
                <span className="font-medium">Include Executive Sign-off Block</span>
              </label>
            </div>

            {/* User Attribution */}
            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
              <span className="block text-slate-400 font-semibold uppercase text-[10px]">Sign-off Attribution:</span>
              <span className="font-medium text-slate-800">{currentUser?.displayName}</span>
              <span className="text-slate-400 block">{currentUser?.role?.replace(/_/g, ' ')} · IPI Philippines</span>
            </div>
          </div>
        </div>

        {/* Right Column: Live Report Preview & Generator (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <Card
            title={currentReport.title}
            subtitle={currentReport.subtitle}
            action={
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePrint}
                  icon={<Printer className="w-3.5 h-3.5" />}
                  title="Direct Printer Spool"
                >
                  Print
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExportCSV}
                  icon={<Download className="w-3.5 h-3.5 text-slate-600" />}
                  title="Download Raw CSV"
                >
                  Raw CSV
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleExportPdf}
                  icon={<Download className="w-3.5 h-3.5 text-[#44B330]" />}
                  disabled={isGenerating}
                >
                  {isGenerating ? 'Compiling...' : 'Export PDF'}
                </Button>
              </div>
            }
          >
            {/* Quick KPI Stat Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80 mb-4">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200/70">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Records</span>
                <span className="text-base font-bold text-slate-900 block mt-0.5">
                  {selectedReportId === 'price_change' ? filteredMaterials.length :
                   selectedReportId === 'purchasing_summary' ? filteredPurchases.length :
                   filteredSuppliers.length} Items
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200/70">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Scope Horizon</span>
                <span className="text-xs font-semibold text-slate-800 block mt-1 truncate">
                  {dateRange}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200/70">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Security Classification</span>
                <span className="text-xs font-bold text-rose-700 block mt-1">
                  Confidential
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200/70">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">PDF Output Format</span>
                <span className="text-xs font-bold text-[#002F87] block mt-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#44B330]"></span>
                  ISO A4 Vector
                </span>
              </div>
            </div>

            {/* Live Data Preview Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              {selectedReportId === 'supplier_performance' || selectedReportId === 'supplier_ranking' ? (
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#002F87] text-white">
                    <tr className="uppercase font-semibold text-[10px]">
                      <th className="py-2.5 px-3">Supplier Code</th>
                      <th className="py-2.5 px-3">Supplier Name</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3 text-center">Score</th>
                      <th className="py-2.5 px-3 text-right">Delivery %</th>
                      <th className="py-2.5 px-3 text-right">Quality %</th>
                      <th className="py-2.5 px-3 text-right">Spend (PHP)</th>
                      <th className="py-2.5 px-3 text-center">Tier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredSuppliers.slice(0, 10).map((s, idx) => (
                      <tr key={s.id} className={idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}>
                        <td className="py-2 px-3 font-mono font-medium text-slate-700">{s.supplierCode}</td>
                        <td className="py-2 px-3 font-semibold text-slate-900">{s.supplierName}</td>
                        <td className="py-2 px-3 text-slate-600">{s.category}</td>
                        <td className="py-2 px-3 text-center font-bold text-slate-900">{s.overallScore}</td>
                        <td className="py-2 px-3 text-right font-tabular-nums">{s.deliveryScore}%</td>
                        <td className="py-2 px-3 text-right font-tabular-nums">{s.qualityScore}%</td>
                        <td className="py-2 px-3 text-right font-tabular-nums font-medium">₱{s.totalSpend.toLocaleString()}</td>
                        <td className="py-2 px-3 text-center">
                          <Badge variant={s.overallScore >= 90 ? 'success' : s.overallScore >= 80 ? 'primary' : s.overallScore >= 70 ? 'neutral' : 'danger'} size="sm">
                            {s.ratingTier}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : selectedReportId === 'price_change' ? (
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#002F87] text-white">
                    <tr className="uppercase font-semibold text-[10px]">
                      <th className="py-2.5 px-3">Material SKU</th>
                      <th className="py-2.5 px-3">Material Name</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3 text-right">Standard (PHP)</th>
                      <th className="py-2.5 px-3 text-right">Current (PHP)</th>
                      <th className="py-2.5 px-3 text-right">Variance %</th>
                      <th className="py-2.5 px-3">Preferred Supplier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredMaterials.slice(0, 10).map((m, idx) => (
                      <tr key={m.id} className={idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}>
                        <td className="py-2 px-3 font-mono font-medium text-slate-700">{m.materialCode}</td>
                        <td className="py-2 px-3 font-semibold text-slate-900">{m.materialName}</td>
                        <td className="py-2 px-3 text-slate-600">{m.category}</td>
                        <td className="py-2 px-3 text-right font-tabular-nums">₱{m.standardPrice.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right font-tabular-nums font-bold text-slate-900">₱{m.currentPrice.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right font-tabular-nums font-bold">
                          <span className={m.priceChangePct > 0 ? 'text-rose-600' : 'text-[#28781A]'}>
                            {m.priceChangePct > 0 ? `+${m.priceChangePct}%` : `${m.priceChangePct}%`}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-700 truncate max-w-[150px]">{m.preferredSupplierName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#002F87] text-white">
                    <tr className="uppercase font-semibold text-[10px]">
                      <th className="py-2.5 px-3">PO Number</th>
                      <th className="py-2.5 px-3">PO Date</th>
                      <th className="py-2.5 px-3">Supplier Name</th>
                      <th className="py-2.5 px-3">Material</th>
                      <th className="py-2.5 px-3 text-right">Quantity</th>
                      <th className="py-2.5 px-3 text-right">Spend (PHP)</th>
                      <th className="py-2.5 px-3 text-center">Fulfillment SLA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredPurchases.slice(0, 10).map((p, idx) => (
                      <tr key={p.id} className={idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}>
                        <td className="py-2 px-3 font-mono font-medium text-[#002F87]">{p.poNumber}</td>
                        <td className="py-2 px-3 text-slate-500">{p.poDate}</td>
                        <td className="py-2 px-3 font-semibold text-slate-900">{p.supplierName}</td>
                        <td className="py-2 px-3 text-slate-700">{p.materialName}</td>
                        <td className="py-2 px-3 text-right font-tabular-nums">{p.quantity.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right font-tabular-nums font-bold text-slate-900">₱{p.totalAmount.toLocaleString()}</td>
                        <td className="py-2 px-3 text-center">
                          <Badge variant={p.deliveryStatus === 'ON_TIME' ? 'success' : 'danger'} size="sm">
                            {p.deliveryStatus}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Bottom Note */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-400 gap-2">
              <span>Showing sample preview rows. The exported PDF generates all verified rows with formal headers, page numbering, and executive sign-off blocks.</span>
              <button
                onClick={handlePreviewPdf}
                className="text-[#002F87] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              >
                Inspect Full Document in Preview Modal &rarr;
              </button>
            </div>
          </Card>
        </div>
      </div>

      {/* Interactive PDF Preview Modal */}
      {previewPdfUrl && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl h-[88vh] flex flex-col overflow-hidden animate-scale-up">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#EFF4FC] border border-[#DBE8FC] flex items-center justify-center text-[#002F87]">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    PDF Preview: {currentReport.title}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Official IPI Corporate Vector PDF (ISO A4 Format)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleExportPdf}
                  icon={<Download className="w-3.5 h-3.5 text-[#44B330]" />}
                >
                  Download PDF File
                </Button>
                <button
                  onClick={() => setPreviewPdfUrl(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  title="Close Preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body / iFrame PDF Viewer */}
            <div className="flex-1 bg-slate-200 relative">
              <iframe
                src={previewPdfUrl}
                title="Procurement Report PDF Preview"
                className="w-full h-full border-none"
              />
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-200 bg-white flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#44B330]"></span>
                <span>Vector elements rendered at 300 DPI for high-definition print and executive distribution</span>
              </div>
              <button
                onClick={() => setPreviewPdfUrl(null)}
                className="text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
