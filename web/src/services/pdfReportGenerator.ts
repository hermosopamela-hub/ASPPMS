import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Supplier, Material, PurchaseTransaction, AlertItem } from '../types';

export interface ReportOptions {
  reportId: string;
  reportTitle: string;
  reportSubtitle: string;
  dateRange: string;
  categoryFilter?: string;
  includeKpis: boolean;
  includeSignatures: boolean;
  generatedBy: {
    name: string;
    role: string;
    department?: string;
  };
}

export interface ReportDataset {
  suppliers: Supplier[];
  materials: Material[];
  purchases: PurchaseTransaction[];
  alerts: AlertItem[];
}

/**
 * Draws the official IPI vector logo and corporate title lockup on the PDF
 */
function drawIpiHeader(doc: jsPDF, title: string, subtitle: string, options: ReportOptions) {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Top corporate brand bar (IPI Blue 30% brand presence)
  doc.setFillColor(0, 47, 135); // #002F87
  doc.rect(0, 0, pageWidth, 5, 'F');

  // Green accent hairline (10% brand accent)
  doc.setFillColor(68, 179, 48); // #44B330
  doc.rect(0, 5, pageWidth, 1.5, 'F');

  // IPI Vector Emblem (left side)
  const emblemX = 14;
  const emblemY = 12;

  // Left Green Leaf
  doc.setFillColor(68, 179, 48);
  doc.triangle(
    emblemX + 1, emblemY + 1,
    emblemX + 8, emblemY + 7,
    emblemX + 1, emblemY + 8,
    'F'
  );
  doc.triangle(
    emblemX + 8, emblemY + 7,
    emblemX + 1, emblemY + 8,
    emblemX + 8, emblemY + 14,
    'F'
  );

  // Right Green Leaf
  doc.triangle(
    emblemX + 9, emblemY + 7,
    emblemX + 16, emblemY + 1,
    emblemX + 16, emblemY + 8,
    'F'
  );
  doc.triangle(
    emblemX + 9, emblemY + 7,
    emblemX + 16, emblemY + 8,
    emblemX + 9, emblemY + 14,
    'F'
  );

  // Bottom Blue Base / Shield
  doc.setFillColor(0, 47, 135);
  doc.triangle(
    emblemX + 1, emblemY + 10,
    emblemX + 8, emblemY + 16,
    emblemX + 1, emblemY + 17,
    'F'
  );
  doc.triangle(
    emblemX + 9, emblemY + 16,
    emblemX + 16, emblemY + 10,
    emblemX + 16, emblemY + 17,
    'F'
  );
  doc.rect(emblemX + 5, emblemY + 15, 7, 2, 'F');

  // "IPI" Acronym Wordmark
  doc.setTextColor(0, 47, 135);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('IPI', emblemX + 20, emblemY + 13);

  // Company Full Name & Tagline
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('INTERNATIONAL PHARMACEUTICALS, INC.', emblemX + 42, emblemY + 7);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(68, 179, 48); // IPI Green
  doc.text('Your Wellness. Our Passion.', emblemX + 42, emblemY + 11.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('Procurement Operations & Supply Intelligence Governance System', emblemX + 42, emblemY + 15.5);

  // Right side: Report Metadata & Confidentiality Tag
  const rightX = pageWidth - 14;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(185, 28, 28); // red confidential
  doc.text('STRICTLY CONFIDENTIAL · INTERNAL USE ONLY', rightX, emblemY + 5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  const now = new Date();
  const dateFormatted = now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.text(`Generated: ${dateFormatted}`, rightX, emblemY + 9.5, { align: 'right' });
  doc.text(`Fiscal Scope: ${options.dateRange} | Currency: PHP (₱)`, rightX, emblemY + 13.5, { align: 'right' });
  doc.text(`Prepared By: ${options.generatedBy.name} (${options.generatedBy.role})`, rightX, emblemY + 17.5, { align: 'right' });

  // Divider Line
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.5);
  doc.line(14, emblemY + 22, pageWidth - 14, emblemY + 22);

  // Report Title Banner (30% Blue Bar or Crisp Title)
  doc.setFillColor(239, 244, 252); // #EFF4FC IPI Blue light
  doc.roundedRect(14, emblemY + 25, pageWidth - 28, 14, 2, 2, 'F');
  doc.setDrawColor(200, 219, 252);
  doc.roundedRect(14, emblemY + 25, pageWidth - 28, 14, 2, 2, 'S');

  // Title text inside banner
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 47, 135); // IPI Blue
  doc.text(title.toUpperCase(), 18, emblemY + 32);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(subtitle, 18, emblemY + 36.5);

  return emblemY + 43; // Returns Y position for content to start
}

/**
 * Draws executive KPI Summary cards across the page
 */
function drawKpiBoxes(
  doc: jsPDF,
  startY: number,
  kpis: Array<{ label: string; value: string; subtext: string; highlight?: boolean }>
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const totalWidth = pageWidth - margin * 2;
  const count = kpis.length;
  const gap = 3;
  const boxWidth = (totalWidth - gap * (count - 1)) / count;
  const boxHeight = 16;

  kpis.forEach((kpi, index) => {
    const x = margin + index * (boxWidth + gap);

    // Box background (60% White surface)
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, startY, boxWidth, boxHeight, 1.5, 1.5, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, startY, boxWidth, boxHeight, 1.5, 1.5, 'S');

    // Top hairline accent (Green if highlight, else Blue)
    if (kpi.highlight) {
      doc.setFillColor(68, 179, 48); // IPI Green
    } else {
      doc.setFillColor(0, 47, 135); // IPI Blue
    }
    doc.rect(x, startY, boxWidth, 1, 'F');

    // Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label.toUpperCase(), x + 3, startY + 4.5);

    // Value
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    if (kpi.highlight) {
      doc.setTextColor(40, 120, 26);
    } else {
      doc.setTextColor(15, 23, 42);
    }
    doc.text(kpi.value, x + 3, startY + 10.5);

    // Subtext
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(148, 163, 184);
    doc.text(kpi.subtext, x + 3, startY + 14);
  });

  return startY + boxHeight + 4;
}

/**
 * Draws executive sign-off / approval signature block at bottom
 */
function drawSignaturesBlock(doc: jsPDF, finalY: number) {
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Check if there is enough space on the current page (needs ~35mm)
  let y = finalY + 8;
  if (y + 35 > pageHeight - 15) {
    doc.addPage();
    y = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(0, 47, 135);
  doc.text('EXECUTIVE VERIFICATION & AUDIT SIGN-OFF', 14, y);

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(14, y + 2, pageWidth - 14, y + 2);

  const blockY = y + 6;
  const colWidth = (pageWidth - 28) / 3;

  const signatures = [
    { title: 'PREPARED BY', name: 'Procurement Analyst', org: 'Analytics & Sourcing Division' },
    { title: 'VERIFIED BY', name: 'Purchasing Assistant Manager', org: 'Vendor Relations & Review' },
    { title: 'APPROVED BY', name: 'Purchasing Manager', org: 'Strategic Procurement Executive' },
  ];

  signatures.forEach((sig, i) => {
    const x = 14 + i * colWidth;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(sig.title, x, blockY);

    // Signature line
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.line(x, blockY + 12, x + colWidth - 8, blockY + 12);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(sig.name, x, blockY + 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(sig.org, x, blockY + 19.5);
    doc.text('Date: ________________________', x, blockY + 23);
  });
}

/**
 * Adds running page footers to all pages
 */
function addRunningFooters(doc: jsPDF) {
  const totalPages = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Footer divider line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(14, pageHeight - 11, pageWidth - 14, pageHeight - 11);

    // Left: System Branding
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      'International Pharmaceuticals, Inc. (IPI) · Automated Supplier Performance & Price Monitoring Intelligence System',
      14,
      pageHeight - 7
    );

    // Right: Pagination
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 47, 135);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, pageHeight - 7, { align: 'right' });
  }
}

/**
 * Main PDF Generation Engine
 */
export function generateProcurementPdf(options: ReportOptions, data: ReportDataset): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const { suppliers, materials, purchases, alerts } = data;
  let startY = drawIpiHeader(doc, options.reportTitle, options.reportSubtitle, options);

  // Generate Table Data and KPIs based on reportId
  let head: string[][] = [];
  let body: (string | number)[][] = [];
  let columnStyles: Record<number, any> = {};

  switch (options.reportId) {
    case 'supplier_performance': {
      const avgScore = suppliers.length > 0 
        ? (suppliers.reduce((acc, s) => acc + s.overallScore, 0) / suppliers.length).toFixed(1)
        : '0.0';
      const excCount = suppliers.filter(s => s.overallScore >= 90).length;
      const atRiskCount = suppliers.filter(s => s.overallScore < 70).length;
      const totalSpend = suppliers.reduce((acc, s) => acc + s.totalSpend, 0);

      if (options.includeKpis) {
        startY = drawKpiBoxes(doc, startY, [
          { label: 'Total Suppliers', value: `${suppliers.length}`, subtext: 'Active cataloged vendors' },
          { label: 'Fleet Mean Score', value: `${avgScore} / 100`, subtext: 'Delivery, Quality & Price', highlight: Number(avgScore) >= 80 },
          { label: 'Excellence Tier', value: `${excCount} Vendors`, subtext: 'Rating score ≥ 90.0', highlight: true },
          { label: 'At-Risk Watchlist', value: `${atRiskCount} Vendors`, subtext: 'Score < 70.0 or Probation' },
          { label: 'Cumulative Spend', value: `₱${(totalSpend / 1000000).toFixed(2)}M`, subtext: 'Recorded procurement POs' },
        ]);
      }

      head = [['Code', 'Supplier Name', 'Category', 'Delivery', 'Quality', 'Price', 'Overall', 'Rating Tier', 'Spend (PHP)']];
      body = suppliers.map(s => [
        s.supplierCode,
        s.supplierName,
        s.category,
        `${s.deliveryScore}%`,
        `${s.qualityScore}%`,
        `${s.priceScore}`,
        `${s.overallScore}`,
        s.ratingTier.replace('_', ' '),
        `₱${s.totalSpend.toLocaleString()}`,
      ]);

      columnStyles = {
        0: { cellWidth: 18, font: 'courier' },
        1: { cellWidth: 42, fontStyle: 'bold' },
        2: { cellWidth: 26 },
        3: { halign: 'right', cellWidth: 16 },
        4: { halign: 'right', cellWidth: 16 },
        5: { halign: 'right', cellWidth: 14 },
        6: { halign: 'center', cellWidth: 16, fontStyle: 'bold' },
        7: { halign: 'center', cellWidth: 24 },
        8: { halign: 'right', cellWidth: 20 },
      };
      break;
    }

    case 'supplier_ranking': {
      const sorted = [...suppliers].sort((a, b) => b.overallScore - a.overallScore);
      const topVendor = sorted[0]?.supplierName || 'N/A';

      if (options.includeKpis) {
        startY = drawKpiBoxes(doc, startY, [
          { label: 'Ranked Vendors', value: `${sorted.length}`, subtext: 'Ordered by multi-factor score' },
          { label: 'Top Performer', value: topVendor.substring(0, 16), subtext: `Score: ${sorted[0]?.overallScore || 0}`, highlight: true },
          { label: 'Tier 1 Quality', value: `${sorted.filter(s => s.ratingTier === 'EXCELLENT').length}`, subtext: 'Top echelon suppliers' },
          { label: 'Action Required', value: `${sorted.filter(s => s.ratingTier === 'POOR').length}`, subtext: 'Recommended audit' },
        ]);
      }

      head = [['Rank', 'Code', 'Supplier Name', 'Category', 'Score', 'Status', 'Rating Tier', 'Fulfillment SLA']];
      body = sorted.map((s, idx) => [
        `#${idx + 1}`,
        s.supplierCode,
        s.supplierName,
        s.category,
        `${s.overallScore}`,
        s.status,
        s.ratingTier.replace('_', ' '),
        s.deliveryScore >= 90 && s.qualityScore >= 90 ? 'PREFERRED' : s.overallScore < 70 ? 'AT RISK' : 'COMPLIANT',
      ]);

      columnStyles = {
        0: { halign: 'center', cellWidth: 12, fontStyle: 'bold' },
        1: { cellWidth: 20, font: 'courier' },
        2: { cellWidth: 50, fontStyle: 'bold' },
        3: { cellWidth: 30 },
        4: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
        5: { halign: 'center', cellWidth: 20 },
        6: { halign: 'center', cellWidth: 26 },
        7: { halign: 'center', cellWidth: 24 },
      };
      break;
    }

    case 'price_change': {
      const increases = materials.filter(m => m.priceChangePct > 0);
      const decreases = materials.filter(m => m.priceChangePct < 0);
      const avgVariance = materials.length > 0 
        ? (materials.reduce((acc, m) => acc + Math.abs(m.priceChangePct), 0) / materials.length).toFixed(1)
        : '0.0';
      const sortedInc = [...materials].sort((a, b) => b.priceChangePct - a.priceChangePct);
      const maxHike = sortedInc[0]?.priceChangePct || 0;

      if (options.includeKpis) {
        startY = drawKpiBoxes(doc, startY, [
          { label: 'Tracked Items', value: `${materials.length}`, subtext: 'Standard vs current price' },
          { label: 'Mean Variance', value: `±${avgVariance}%`, subtext: 'Absolute price deviation' },
          { label: 'Price Hikes', value: `${increases.length} Items`, subtext: `Max Hike: +${maxHike}%` },
          { label: 'Price Decreases', value: `${decreases.length} Items`, subtext: 'Cost savings opportunities', highlight: true },
        ]);
      }

      head = [['SKU / Code', 'Material Name', 'Category', 'UOM', 'Standard', 'Current', 'Variance %', 'Preferred Supplier']];
      body = materials.map(m => [
        m.materialCode,
        m.materialName,
        m.category,
        m.uom,
        `₱${m.standardPrice.toLocaleString()}`,
        `₱${m.currentPrice.toLocaleString()}`,
        `${m.priceChangePct > 0 ? '+' : ''}${m.priceChangePct}%`,
        m.preferredSupplierName,
      ]);

      columnStyles = {
        0: { cellWidth: 22, font: 'courier' },
        1: { cellWidth: 46, fontStyle: 'bold' },
        2: { cellWidth: 26 },
        3: { halign: 'center', cellWidth: 12 },
        4: { halign: 'right', cellWidth: 20 },
        5: { halign: 'right', cellWidth: 20, fontStyle: 'bold' },
        6: { halign: 'right', cellWidth: 20 },
        7: { cellWidth: 34 },
      };
      break;
    }

    case 'purchasing_summary': {
      const totalSpend = purchases.reduce((acc, p) => acc + p.totalAmount, 0);
      const completed = purchases.filter(p => p.actualDeliveryDate !== null);
      const onTime = completed.filter(p => p.deliveryStatus === 'ON_TIME' || p.deliveryStatus === 'EARLY').length;
      const onTimePct = completed.length > 0 ? ((onTime / completed.length) * 100).toFixed(1) : '100.0';

      if (options.includeKpis) {
        startY = drawKpiBoxes(doc, startY, [
          { label: 'Total Orders', value: `${purchases.length}`, subtext: 'Logged PO transactions' },
          { label: 'Total Committed Spend', value: `₱${(totalSpend / 1000000).toFixed(2)}M`, subtext: 'Philippine Peso', highlight: true },
          { label: 'Mean PO Value', value: `₱${purchases.length > 0 ? Math.round(totalSpend / purchases.length).toLocaleString() : 0}`, subtext: 'Average per order' },
          { label: 'On-Time Fulfillment', value: `${onTimePct}%`, subtext: 'Delivery schedule compliance', highlight: Number(onTimePct) >= 90 },
        ]);
      }

      head = [['PO Number', 'PO Date', 'Supplier Name', 'Material SKU', 'Qty', 'Unit Price', 'Total Spend', 'SLA Status']];
      body = purchases.map(p => [
        p.poNumber,
        p.poDate,
        p.supplierName,
        p.materialName,
        p.quantity.toLocaleString(),
        `₱${p.unitPrice.toLocaleString()}`,
        `₱${p.totalAmount.toLocaleString()}`,
        p.deliveryStatus.replace('_', ' '),
      ]);

      columnStyles = {
        0: { cellWidth: 24, font: 'courier', fontStyle: 'bold' },
        1: { cellWidth: 20 },
        2: { cellWidth: 42 },
        3: { cellWidth: 40 },
        4: { halign: 'right', cellWidth: 14 },
        5: { halign: 'right', cellWidth: 20 },
        6: { halign: 'right', cellWidth: 24, fontStyle: 'bold' },
        7: { halign: 'center', cellWidth: 20 },
      };
      break;
    }

    case 'delivery_performance': {
      const completed = purchases.filter(p => p.actualDeliveryDate !== null);
      const onTime = completed.filter(p => p.deliveryStatus === 'ON_TIME' || p.deliveryStatus === 'EARLY').length;
      const late = completed.filter(p => p.deliveryStatus === 'DELAYED').length;
      const onTimePct = completed.length > 0 ? ((onTime / completed.length) * 100).toFixed(1) : '100.0';

      if (options.includeKpis) {
        startY = drawKpiBoxes(doc, startY, [
          { label: 'Fulfilled Shipments', value: `${completed.length}`, subtext: 'Verified delivery receipts' },
          { label: 'On-Time Fulfilled', value: `${onTime}`, subtext: `${onTimePct}% rate`, highlight: true },
          { label: 'Late Deliveries', value: `${late}`, subtext: 'Exceeded PO promised date' },
          { label: 'Mean Fleet Score', value: `${(suppliers.reduce((a, b) => a + b.deliveryScore, 0) / (suppliers.length || 1)).toFixed(1)}%`, subtext: 'Supplier delivery score' },
        ]);
      }

      head = [['Supplier Code', 'Supplier Name', 'Category', 'Total POs', 'Delivery Score', 'Avg Delay', 'Fulfillment Rating']];
      body = suppliers.map(s => [
        s.supplierCode,
        s.supplierName,
        s.category,
        s.totalOrdersCount,
        `${s.deliveryScore}%`,
        s.deliveryScore >= 95 ? '0 Days' : s.deliveryScore >= 80 ? '1.5 Days' : '4.2 Days',
        s.deliveryScore >= 90 ? 'EXEMPLARY' : s.deliveryScore >= 75 ? 'SATISFACTORY' : 'UNSATISFACTORY',
      ]);

      columnStyles = {
        0: { cellWidth: 22, font: 'courier' },
        1: { cellWidth: 54, fontStyle: 'bold' },
        2: { cellWidth: 32 },
        3: { halign: 'center', cellWidth: 18 },
        4: { halign: 'right', cellWidth: 24, fontStyle: 'bold' },
        5: { halign: 'center', cellWidth: 24 },
        6: { halign: 'center', cellWidth: 30 },
      };
      break;
    }

    case 'quality_performance': {
      const totalRec = purchases.reduce((a, b) => a + b.receivedQuantity, 0);
      const totalAcc = purchases.reduce((a, b) => a + b.acceptedQuantity, 0);
      const totalRej = purchases.reduce((a, b) => a + b.rejectedQuantity, 0);
      const acceptPct = totalRec > 0 ? ((totalAcc / totalRec) * 100).toFixed(1) : '100.0';

      if (options.includeKpis) {
        startY = drawKpiBoxes(doc, startY, [
          { label: 'Total Units Inspected', value: `${totalRec.toLocaleString()}`, subtext: 'QC QA receiving batches' },
          { label: 'Units Accepted', value: `${totalAcc.toLocaleString()}`, subtext: `${acceptPct}% acceptance`, highlight: true },
          { label: 'Defect Rejections', value: `${totalRej.toLocaleString()}`, subtext: 'Quarantine or returned' },
          { label: 'Fleet Quality Score', value: `${(suppliers.reduce((a, b) => a + b.qualityScore, 0) / (suppliers.length || 1)).toFixed(1)}%`, subtext: 'Average supplier QA' },
        ]);
      }

      head = [['Supplier Code', 'Supplier Name', 'Category', 'Orders', 'Quality Score', 'Defect Rate', 'QC Tier']];
      body = suppliers.map(s => [
        s.supplierCode,
        s.supplierName,
        s.category,
        s.totalOrdersCount,
        `${s.qualityScore}%`,
        `${Math.max(0, Number((100 - s.qualityScore).toFixed(1)))}%`,
        s.qualityScore >= 90 ? 'GRADE A' : s.qualityScore >= 80 ? 'GRADE B' : 'GRADE C (AUDIT)',
      ]);

      columnStyles = {
        0: { cellWidth: 22, font: 'courier' },
        1: { cellWidth: 54, fontStyle: 'bold' },
        2: { cellWidth: 32 },
        3: { halign: 'center', cellWidth: 18 },
        4: { halign: 'right', cellWidth: 24, fontStyle: 'bold' },
        5: { halign: 'center', cellWidth: 24 },
        6: { halign: 'center', cellWidth: 30 },
      };
      break;
    }

    case 'supplier_risk': {
      const atRisk = suppliers.filter(s => s.overallScore < 75 || s.status === 'PROBATION' || s.ratingTier === 'POOR');
      const urgentAlerts = alerts.filter(a => a.severity === 'CRITICAL' || a.severity === 'HIGH').length;

      if (options.includeKpis) {
        startY = drawKpiBoxes(doc, startY, [
          { label: 'High Risk Suppliers', value: `${atRisk.length}`, subtext: 'Scores < 75 or on probation' },
          { label: 'Critical Alerts', value: `${urgentAlerts}`, subtext: 'Requiring immediate intervention' },
          { label: 'Probationary Vendors', value: `${suppliers.filter(s => s.status === 'PROBATION').length}`, subtext: 'Temporary status' },
          { label: 'Monitoring Active', value: '100%', subtext: 'Automated anomaly detection', highlight: true },
        ]);
      }

      head = [['Code', 'Supplier Name', 'Score', 'Status', 'Contract End', 'Primary Risk Indicator', 'Action Plan']];
      body = atRisk.map(s => [
        s.supplierCode,
        s.supplierName,
        `${s.overallScore}`,
        s.status,
        s.contractEndDate,
        s.deliveryScore < 70 ? 'Severe Delivery Delays' : s.qualityScore < 70 ? 'High Defect / QC Rejection' : 'Overall Performance Lag',
        s.overallScore < 60 ? 'TERMINATE / RETENDER' : 'MANDATORY AUDIT MEETING',
      ]);

      columnStyles = {
        0: { cellWidth: 18, font: 'courier' },
        1: { cellWidth: 48, fontStyle: 'bold' },
        2: { halign: 'center', cellWidth: 16, fontStyle: 'bold' },
        3: { halign: 'center', cellWidth: 20 },
        4: { halign: 'center', cellWidth: 24 },
        5: { cellWidth: 42 },
        6: { halign: 'center', cellWidth: 36, fontStyle: 'bold' },
      };
      break;
    }

    default: {
      // General Fallback
      head = [['Code', 'Name', 'Category', 'Score', 'Rating', 'Status', 'Contract End']];
      body = suppliers.map(s => [
        s.supplierCode,
        s.supplierName,
        s.category,
        `${s.overallScore}`,
        s.ratingTier,
        s.status,
        s.contractEndDate,
      ]);
      columnStyles = {
        0: { cellWidth: 22, font: 'courier' },
        1: { cellWidth: 54, fontStyle: 'bold' },
        2: { cellWidth: 32 },
        3: { halign: 'center', cellWidth: 18 },
        4: { halign: 'center', cellWidth: 26 },
        5: { halign: 'center', cellWidth: 24 },
        6: { halign: 'center', cellWidth: 26 },
      };
      break;
    }
  }

  // Generate Table with 60-30-10 styling
  autoTable(doc, {
    startY: startY,
    head: head,
    body: body,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      lineColor: [226, 232, 240], // slate-200
      lineWidth: 0.2,
      textColor: [15, 23, 42], // slate-900
      font: 'helvetica',
    },
    headStyles: {
      fillColor: [0, 47, 135], // 30% IPI Royal Navy Blue
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 3,
      halign: 'left',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // 60% White / slate-50 alternating
    },
    columnStyles: columnStyles,
    margin: { left: 14, right: 14, top: 20, bottom: 16 },
    didParseCell: (hookData) => {
      // Highlight high-risk or excellent badges
      if (hookData.section === 'body') {
        const text = String(hookData.cell.raw);
        if (text === 'EXCELLENT' || text === 'PREFERRED' || text === 'GRADE A') {
          hookData.cell.styles.textColor = [40, 120, 26]; // IPI Green dark
          hookData.cell.styles.fontStyle = 'bold';
        } else if (text === 'POOR' || text === 'AT RISK' || text === 'TERMINATE / RETENDER') {
          hookData.cell.styles.textColor = [190, 18, 60]; // Rose red
          hookData.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  // End of table position
  const finalY = (doc as any).lastAutoTable?.finalY || startY + 50;

  // Signatures
  if (options.includeSignatures) {
    drawSignaturesBlock(doc, finalY);
  }

  // Running footers
  addRunningFooters(doc);

  return doc;
}

/**
 * Convenience helper to download the generated PDF
 */
export function downloadProcurementPdf(options: ReportOptions, data: ReportDataset) {
  const doc = generateProcurementPdf(options, data);
  const cleanTitle = options.reportId.replace(/_/g, '-');
  const dateStamp = new Date().toISOString().split('T')[0];
  doc.save(`IPI-${cleanTitle}-report-${dateStamp}.pdf`);
}

/**
 * Convenience helper to preview as Data URL blob
 */
export function getProcurementPdfBlobUrl(options: ReportOptions, data: ReportDataset): string {
  const doc = generateProcurementPdf(options, data);
  const blob = doc.output('blob');
  return URL.createObjectURL(blob);
}
