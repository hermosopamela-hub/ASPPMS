export type UserRole = 
  | 'PURCHASING_MANAGER' 
  | 'PURCHASING_ASSISTANT_MANAGER' 
  | 'PURCHASING_ANALYST' 
  | 'ADMIN';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  department: string;
  avatarUrl?: string;
  lastLoginAt?: string;
  createdAt: string;
}

export type SupplierStatus = 'ACTIVE' | 'INACTIVE' | 'PROBATION' | 'SUSPENDED';

export interface Supplier {
  id: string;
  supplierCode: string;
  supplierName: string;
  supplierType: 'Manufacturer' | 'Distributor' | 'Service Provider' | 'Importer';
  category: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  country: string;
  region: string;
  status: SupplierStatus;
  paymentTerms: string;
  leadTimeDays: number;
  contractStartDate: string;
  contractEndDate: string;
  overallScore: number;
  ratingTier: 'EXCELLENT' | 'GOOD' | 'SATISFACTORY' | 'NEEDS_IMPROVEMENT' | 'POOR';
  deliveryScore: number;
  qualityScore: number;
  priceScore: number;
  responsivenessScore: number;
  complianceScore: number;
  totalOrdersCount: number;
  totalSpend: number;
  createdAt: string;
  updatedAt: string;
}

export interface Material {
  id: string;
  materialCode: string;
  materialName: string;
  description: string;
  category: string;
  subcategory: string;
  uom: string;
  standardPrice: number;
  currentPrice: number;
  previousPrice: number;
  priceChangePct: number;
  currency: string;
  preferredSupplierId: string;
  preferredSupplierName: string;
  isActive: boolean;
  minOrderQty: number;
  createdAt: string;
  updatedAt: string;
}

export type DeliveryStatus = 'ON_TIME' | 'DELAYED' | 'EARLY' | 'PENDING' | 'CANCELLED';
export type QualityStatus = 'ACCEPTED' | 'REJECTED' | 'PARTIAL' | 'INSPECTING' | 'PENDING';

export interface PurchaseTransaction {
  id: string;
  poNumber: string;
  poDate: string;
  supplierId: string;
  supplierName: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  quantity: number;
  unitPrice: number;
  currency: string;
  totalAmount: number; // Dynamically quantity * unitPrice
  requestedDeliveryDate: string;
  actualDeliveryDate: string | null;
  deliveryStatus: DeliveryStatus;
  delayDays: number;
  qualityStatus: QualityStatus;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  rejectionRate: number; // percentage
  buyerStaff: string;
  receivingDate: string | null;
  remarks: string;
  createdAt: string;
}

export type PriceClassification = 
  | 'Significant Increase'
  | 'Moderate Increase'
  | 'Minor Increase'
  | 'No Significant Change'
  | 'Minor Decrease'
  | 'Moderate Decrease'
  | 'Significant Decrease';

export interface PriceHistoryRecord {
  id: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  supplierId: string;
  supplierName: string;
  poNumber: string;
  recordedDate: string;
  price: number;
  previousPrice: number;
  priceDiff: number;
  priceChangePct: number;
  currency: string;
  classification: PriceClassification;
  uom: string;
  createdAt: string;
}

export interface SupplierPerformanceRecord {
  id: string;
  supplierId: string;
  supplierName: string;
  period: string; // e.g. "2026-Q3"
  deliveryScore: number;
  qualityScore: number;
  priceScore: number;
  responsivenessScore: number;
  complianceScore: number;
  overallScore: number;
  ratingCategory: 'EXCELLENT' | 'GOOD' | 'SATISFACTORY' | 'NEEDS_IMPROVEMENT' | 'POOR';
  totalDeliveries: number;
  onTimeDeliveries: number;
  onTimeDeliveryRate: number;
  averageDelayDays: number;
  totalReceivedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  qualityAcceptanceRate: number;
  rejectionRate: number;
  calculatedAt: string;
}

export type AlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type AlertStatus = 'NEW' | 'ACKNOWLEDGED' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED';

export interface AlertItem {
  id: string;
  alertType: 
    | 'Significant Price Increase'
    | 'Significant Price Decrease'
    | 'Performance Below Threshold'
    | 'Late Delivery Spike'
    | 'High Rejection Rate'
    | 'Score Deterioration'
    | 'Contract Expiration Warning'
    | 'Data Anomaly';
  severity: AlertSeverity;
  supplierId?: string;
  supplierName?: string;
  materialId?: string;
  materialName?: string;
  description: string;
  triggerMetric?: string;
  status: AlertStatus;
  assignedUser?: string;
  resolution?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface DataImportRecord {
  id: string;
  datasetType: 'Supplier Master' | 'Material Master' | 'Purchase Transactions' | 'Delivery Records' | 'Quality Records' | 'Price Records';
  fileName: string;
  totalRows: number;
  validRows: number;
  importedRows: number;
  errorRows: number;
  status: 'COMPLETED' | 'FAILED' | 'PARTIAL';
  importedBy: string;
  createdAt: string;
  errors?: Array<{ row: number; column: string; message: string; raw: string }>;
}

export interface AuditLogItem {
  id: string;
  userId: string;
  userEmail: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'IMPORT' | 'RESOLVE_ALERT' | 'UPDATE_SETTINGS' | 'LOGIN';
  module: string;
  recordId: string;
  details: string;
  ipAddress?: string;
  timestamp: string;
}

export interface ScoringWeights {
  deliveryWeight: number; // e.g. 0.30
  qualityWeight: number;  // e.g. 0.30
  priceWeight: number;    // e.g. 0.20
  responsivenessWeight: number; // e.g. 0.10
  complianceWeight: number;    // e.g. 0.10
}

export interface AlertThresholds {
  significantPriceIncreasePct: number; // 10.0
  moderatePriceIncreasePct: number;    // 3.0
  poorPerformanceThreshold: number;    // 70.0
  minQualityAcceptanceRate: number;    // 95.0
  contractExpiringDays: number;        // 30
}

export interface SystemSettings {
  weights: ScoringWeights;
  thresholds: AlertThresholds;
  baseCurrency: string;
  companyName: string;
  fiscalYear: string;
}
