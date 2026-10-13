// Alert rules. Pure functions: they look at plain objects and return the alerts that should exist,
// the service decides what to store. An alert candidate has the same fields as an Alert row,
// without id, status and createdAt.
const { OPEN_ALERT_STATUSES } = require('./constants');

const peso = (n) => `₱${Number(n).toLocaleString('en-US')}`;
const isOpen = (a) => OPEN_ALERT_STATUSES.includes(a.status);

// Alerts raised by one purchase order. `priceChangePct` is the change against the previous price.
function alertsForTransaction(tx, priceChangePct, settings) {
  const { thresholds } = settings;
  const out = [];

  if (priceChangePct >= thresholds.significantPriceIncreasePct) {
    out.push({
      alertType: 'Significant Price Increase',
      severity: 'CRITICAL',
      supplierId: tx.supplierId,
      supplierName: tx.supplierName,
      materialId: tx.materialId,
      materialName: tx.materialName,
      description: `Price surged +${priceChangePct.toFixed(2)}% on PO ${tx.poNumber} (${tx.unitPrice} vs previous price). Threshold: +${thresholds.significantPriceIncreasePct}%.`,
      triggerMetric: `+${priceChangePct.toFixed(1)}% Price Spike`,
    });
  }

  if (tx.rejectionRate > 100 - thresholds.minQualityAcceptanceRate) {
    out.push({
      alertType: 'High Rejection Rate',
      severity: 'HIGH',
      supplierId: tx.supplierId,
      supplierName: tx.supplierName,
      materialId: tx.materialId,
      materialName: tx.materialName,
      description: `High QC rejection of ${tx.rejectionRate}% on PO ${tx.poNumber}. Minimum acceptance standard is ${thresholds.minQualityAcceptanceRate}%.`,
      triggerMetric: `${tx.rejectionRate}% QC Rejection`,
    });
  }
  return out;
}

// The full scan: returns the new alerts to create. Anything that already has an open alert is skipped.
function scanForAlerts({ suppliers, materials, purchases, alerts, settings, now = new Date() }) {
  const { thresholds } = settings;
  const out = [];
  const open = alerts.filter(isOpen);
  // `created` also counts what this scan has already produced, so one run never makes duplicates
  const exists = (match) => open.some(match) || out.some(match);

  for (const s of suppliers) {
    if (s.status === 'ACTIVE' && s.overallScore < thresholds.poorPerformanceThreshold) {
      if (!exists((a) => a.supplierId === s.id && a.alertType === 'Performance Below Threshold')) {
        out.push({
          alertType: 'Performance Below Threshold',
          severity: 'CRITICAL',
          supplierId: s.id,
          supplierName: s.supplierName,
          description: `Composite performance score of ${s.overallScore}/100 is below the enterprise minimum tolerance (${thresholds.poorPerformanceThreshold}). Immediate performance review required.`,
          triggerMetric: `${s.overallScore} Overall Score`,
        });
      }
    }

    if (s.contractEndDate) {
      const daysLeft = Math.ceil((new Date(s.contractEndDate).getTime() - now.getTime()) / 86400000);
      if (daysLeft >= 0 && daysLeft <= thresholds.contractExpiringDays) {
        if (!exists((a) => a.supplierId === s.id && a.alertType === 'Contract Expiration Warning')) {
          out.push({
            alertType: 'Contract Expiration Warning',
            severity: 'MEDIUM',
            supplierId: s.id,
            supplierName: s.supplierName,
            description: `Master supply agreement expires in ${daysLeft} days on ${s.contractEndDate}. Initiate renewal review or alternative vendor bidding.`,
            triggerMetric: `${daysLeft} Days to Expiry`,
          });
        }
      }
    }

    if (s.deliveryScore < 70) {
      if (!exists((a) => a.supplierId === s.id && a.alertType === 'Late Delivery Spike')) {
        out.push({
          alertType: 'Late Delivery Spike',
          severity: 'HIGH',
          supplierId: s.id,
          supplierName: s.supplierName,
          description: `On-time delivery performance has degraded to ${s.deliveryScore}%. Chronic shipping delays may compromise production timelines.`,
          triggerMetric: `${s.deliveryScore}% OTD Score`,
        });
      }
    }
  }

  for (const m of materials) {
    if (m.priceChangePct >= thresholds.significantPriceIncreasePct) {
      if (!exists((a) => a.materialId === m.id && a.alertType === 'Significant Price Increase')) {
        out.push({
          alertType: 'Significant Price Increase',
          severity: 'CRITICAL',
          materialId: m.id,
          materialName: m.materialName,
          supplierName: m.preferredSupplierName,
          supplierId: m.preferredSupplierId || undefined,
          description: `Market price surged by +${m.priceChangePct.toFixed(1)}% (Standard: ${peso(m.standardPrice)}, Current: ${peso(m.currentPrice)}). Exceeds allowable variance of ${thresholds.significantPriceIncreasePct}%.`,
          triggerMetric: `+${m.priceChangePct.toFixed(1)}% Variance`,
        });
      }
    }
  }

  // the 30 most recent purchases (the list is newest first)
  for (const tx of purchases.slice(0, 30)) {
    if (tx.receivedQuantity > 0 && tx.rejectionRate > 100 - thresholds.minQualityAcceptanceRate) {
      if (!exists((a) => a.description.includes(tx.poNumber))) {
        out.push({
          alertType: 'High Rejection Rate',
          severity: 'HIGH',
          supplierId: tx.supplierId,
          supplierName: tx.supplierName,
          materialId: tx.materialId,
          materialName: tx.materialName,
          description: `Lot inspection rejection rate of ${tx.rejectionRate}% on PO ${tx.poNumber} (${tx.rejectedQuantity}/${tx.receivedQuantity} units defective). Tolerance: ${100 - thresholds.minQualityAcceptanceRate}%.`,
          triggerMetric: `${tx.rejectionRate}% QC Rejection`,
        });
      }
    }
  }

  const scannedCount = suppliers.length + materials.length + Math.min(30, purchases.length);
  return { alerts: out, scannedCount };
}

module.exports = { alertsForTransaction, scanForAlerts };
