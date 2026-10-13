import { 
  Supplier, 
  PurchaseTransaction, 
  ScoringWeights, 
  PriceClassification,
  SupplierPerformanceRecord 
} from '../types';

export function calculateDeliveryScore(transactions: PurchaseTransaction[]): {
  deliveryScore: number;
  onTimeDeliveries: number;
  totalDeliveries: number;
  onTimeDeliveryRate: number;
  averageDelayDays: number;
} {
  const completed = transactions.filter(t => t.actualDeliveryDate !== null);
  if (completed.length === 0) {
    return {
      deliveryScore: 100,
      onTimeDeliveries: 0,
      totalDeliveries: 0,
      onTimeDeliveryRate: 100,
      averageDelayDays: 0,
    };
  }

  const onTimeCount = completed.filter(t => t.deliveryStatus === 'ON_TIME' || t.deliveryStatus === 'EARLY').length;
  const onTimeRate = (onTimeCount / completed.length) * 100;
  
  const totalDelays = completed.reduce((sum, t) => sum + (t.delayDays > 0 ? t.delayDays : 0), 0);
  const avgDelay = totalDelays / completed.length;

  // Formula: Score = max(0, OTD - min(20, avgDelay * 2))
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

export function calculateQualityScore(transactions: PurchaseTransaction[]): {
  qualityScore: number;
  totalReceivedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  qualityAcceptanceRate: number;
  rejectionRate: number;
} {
  const inspected = transactions.filter(t => t.receivedQuantity > 0);
  if (inspected.length === 0) {
    return {
      qualityScore: 100,
      totalReceivedQty: 0,
      acceptedQty: 0,
      rejectedQty: 0,
      qualityAcceptanceRate: 100,
      rejectionRate: 0,
    };
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

export function calculatePriceScore(
  supplierTransactions: PurchaseTransaction[],
  allTransactions: PurchaseTransaction[]
): number {
  if (supplierTransactions.length === 0) return 85;

  // Group peer averages by material
  const materialAverages: Record<string, { total: number; count: number }> = {};
  allTransactions.forEach(t => {
    if (!materialAverages[t.materialId]) {
      materialAverages[t.materialId] = { total: 0, count: 0 };
    }
    materialAverages[t.materialId].total += t.unitPrice;
    materialAverages[t.materialId].count++;
  });

  const scores: number[] = [];
  supplierTransactions.forEach(t => {
    const avgData = materialAverages[t.materialId];
    if (avgData && avgData.count > 0) {
      const peerAvg = avgData.total / avgData.count;
      const ratio = t.unitPrice / peerAvg;
      // If price is lower than average, ratio < 1 -> score > 100 capped at 100
      // If price is 10% higher than average, ratio = 1.10 -> score = 100 - (0.10 * 100) = 90
      const itemScore = Math.max(0, Math.min(100, 100 - (ratio - 1.0) * 100));
      scores.push(itemScore);
    }
  });

  if (scores.length === 0) return 85;
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Number(avgScore.toFixed(1));
}

export function calculateOverallScore(
  scores: {
    deliveryScore: number;
    qualityScore: number;
    priceScore: number;
    responsivenessScore: number;
    complianceScore: number;
  },
  weights: ScoringWeights
): {
  overallScore: number;
  ratingCategory: Supplier['ratingTier'];
} {
  const overall = Number((
    (scores.deliveryScore * weights.deliveryWeight) +
    (scores.qualityScore * weights.qualityWeight) +
    (scores.priceScore * weights.priceWeight) +
    (scores.responsivenessScore * weights.responsivenessWeight) +
    (scores.complianceScore * weights.complianceWeight)
  ).toFixed(1));

  let ratingCategory: Supplier['ratingTier'] = 'SATISFACTORY';
  if (overall >= 90.0) ratingCategory = 'EXCELLENT';
  else if (overall >= 80.0) ratingCategory = 'GOOD';
  else if (overall >= 70.0) ratingCategory = 'SATISFACTORY';
  else if (overall >= 60.0) ratingCategory = 'NEEDS_IMPROVEMENT';
  else ratingCategory = 'POOR';

  return { overallScore: overall, ratingCategory };
}

export function classifyPriceChange(changePct: number): PriceClassification {
  if (changePct >= 10.0) return 'Significant Increase';
  if (changePct >= 3.0) return 'Moderate Increase';
  if (changePct > 0.0) return 'Minor Increase';
  if (changePct <= -10.0) return 'Significant Decrease';
  if (changePct <= -3.0) return 'Moderate Decrease';
  if (changePct < 0.0) return 'Minor Decrease';
  return 'No Significant Change';
}
