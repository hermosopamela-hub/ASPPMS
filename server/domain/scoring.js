// Supplier scoring and price classification. Pure functions: plain objects in, numbers out, no database.
// Inputs are purchase transactions in their JSON shape (numbers and 'YYYY-MM-DD' strings).

function calculateDeliveryScore(transactions) {
  const completed = transactions.filter((t) => t.actualDeliveryDate !== null);
  if (completed.length === 0) {
    return { deliveryScore: 100, onTimeDeliveries: 0, totalDeliveries: 0, onTimeDeliveryRate: 100, averageDelayDays: 0 };
  }

  const onTimeCount = completed.filter((t) => t.deliveryStatus === 'ON_TIME' || t.deliveryStatus === 'EARLY').length;
  const onTimeRate = (onTimeCount / completed.length) * 100;
  const totalDelays = completed.reduce((sum, t) => sum + (t.delayDays > 0 ? t.delayDays : 0), 0);
  const avgDelay = totalDelays / completed.length;

  // Score = max(0, OTD - min(20, avgDelay * 2))
  const delayPenalty = Math.min(20, avgDelay * 2);
  const deliveryScore = Math.max(0, Math.min(100, Number((onTimeRate - delayPenalty).toFixed(1))));

  return {
    deliveryScore,
    onTimeDeliveries: onTimeCount,
    totalDeliveries: completed.length,
    onTimeDeliveryRate: Number(onTimeRate.toFixed(1)),
    averageDelayDays: Number(avgDelay.toFixed(1)),
  };
}

function calculateQualityScore(transactions) {
  const inspected = transactions.filter((t) => t.receivedQuantity > 0);
  if (inspected.length === 0) {
    return { qualityScore: 100, totalReceivedQty: 0, acceptedQty: 0, rejectedQty: 0, qualityAcceptanceRate: 100, rejectionRate: 0 };
  }

  const totalReceived = inspected.reduce((sum, t) => sum + t.receivedQuantity, 0);
  const totalAccepted = inspected.reduce((sum, t) => sum + t.acceptedQuantity, 0);
  const totalRejected = inspected.reduce((sum, t) => sum + t.rejectedQuantity, 0);
  const acceptanceRate = totalReceived > 0 ? (totalAccepted / totalReceived) * 100 : 100;
  const rejectionRate = totalReceived > 0 ? (totalRejected / totalReceived) * 100 : 0;

  return {
    qualityScore: Math.max(0, Math.min(100, Number(acceptanceRate.toFixed(1)))),
    totalReceivedQty: totalReceived,
    acceptedQty: totalAccepted,
    rejectedQty: totalRejected,
    qualityAcceptanceRate: Number(acceptanceRate.toFixed(1)),
    rejectionRate: Number(rejectionRate.toFixed(1)),
  };
}

// Compares each unit price of the supplier with the average paid for the same material.
// `peerAverages` is { [materialId]: averageUnitPrice } over all suppliers.
function calculatePriceScore(supplierTransactions, peerAverages) {
  if (supplierTransactions.length === 0) return 85;

  const scores = [];
  for (const t of supplierTransactions) {
    const peerAvg = peerAverages[t.materialId];
    if (peerAvg > 0) {
      // 10% above the average -> 90; at or below the average -> 100
      scores.push(Math.max(0, Math.min(100, 100 - (t.unitPrice / peerAvg - 1.0) * 100)));
    }
  }
  if (scores.length === 0) return 85;
  return Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1));
}

function averagePriceByMaterial(allTransactions) {
  const sums = {};
  for (const t of allTransactions) {
    const s = (sums[t.materialId] ||= { total: 0, count: 0 });
    s.total += t.unitPrice;
    s.count++;
  }
  return Object.fromEntries(Object.entries(sums).map(([id, s]) => [id, s.total / s.count]));
}

function ratingFor(overall) {
  if (overall >= 90.0) return 'EXCELLENT';
  if (overall >= 80.0) return 'GOOD';
  if (overall >= 70.0) return 'SATISFACTORY';
  if (overall >= 60.0) return 'NEEDS_IMPROVEMENT';
  return 'POOR';
}

function calculateOverallScore(scores, weights) {
  const overall = Number(
    (
      scores.deliveryScore * weights.deliveryWeight +
      scores.qualityScore * weights.qualityWeight +
      scores.priceScore * weights.priceWeight +
      scores.responsivenessScore * weights.responsivenessWeight +
      scores.complianceScore * weights.complianceWeight
    ).toFixed(1)
  );
  return { overallScore: overall, ratingCategory: ratingFor(overall) };
}

function classifyPriceChange(changePct) {
  if (changePct >= 10.0) return 'Significant Increase';
  if (changePct >= 3.0) return 'Moderate Increase';
  if (changePct > 0.0) return 'Minor Increase';
  if (changePct <= -10.0) return 'Significant Decrease';
  if (changePct <= -3.0) return 'Moderate Decrease';
  if (changePct < 0.0) return 'Minor Decrease';
  return 'No Significant Change';
}

// The full scorecard for one supplier: the fields to store on the supplier row.
function scoreSupplier(supplier, supplierTx, allTx, weights) {
  const delivery = calculateDeliveryScore(supplierTx);
  const quality = calculateQualityScore(supplierTx);
  const priceScore = calculatePriceScore(supplierTx, averagePriceByMaterial(allTx));
  const { overallScore, ratingCategory } = calculateOverallScore(
    {
      deliveryScore: delivery.deliveryScore,
      qualityScore: quality.qualityScore,
      priceScore,
      responsivenessScore: supplier.responsivenessScore || 85,
      complianceScore: supplier.complianceScore || 90,
    },
    weights
  );
  return {
    deliveryScore: delivery.deliveryScore,
    qualityScore: quality.qualityScore,
    priceScore,
    overallScore,
    ratingTier: ratingCategory,
    totalOrdersCount: supplierTx.length,
    totalSpend: Number(supplierTx.reduce((sum, t) => sum + t.totalAmount, 0).toFixed(2)),
  };
}

module.exports = {
  calculateDeliveryScore,
  calculateQualityScore,
  calculatePriceScore,
  calculateOverallScore,
  averagePriceByMaterial,
  classifyPriceChange,
  ratingFor,
  scoreSupplier,
};
