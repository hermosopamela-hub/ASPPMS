import {
  Supplier,
  Material,
  PurchaseTransaction,
  PriceHistoryRecord,
  AlertItem,
  AuditLogItem,
  SystemSettings,
  DataImportRecord,
  User,
} from '../types';
import { api } from '../lib/api';

export interface ImportRowError {
  index: number;
  message: string;
}

interface Snapshot {
  settings: SystemSettings | null;
  suppliers: Supplier[];
  materials: Material[];
  purchases: PurchaseTransaction[];
  priceHistory: PriceHistoryRecord[];
  alerts: AlertItem[];
  importHistory: DataImportRecord[];
  auditLogs: AuditLogItem[];
  users: User[];
}

const EMPTY: Snapshot = {
  settings: null,
  suppliers: [],
  materials: [],
  purchases: [],
  priceHistory: [],
  alerts: [],
  importHistory: [],
  auditLogs: [],
  users: [],
};

/**
 * The browser's view of the data. The server (Express + Prisma + PostgreSQL) is the only place data is
 * stored and calculated; this class keeps the last answer so pages can read it straight away, and
 * fetches a fresh one after every change.
 *
 *   reads    getSuppliers(), getMaterials()...   synchronous, from the last answer
 *   changes  saveSupplier(), savePurchase()...   asynchronous: send, then refresh
 */
class DatabaseService {
  private data: Snapshot = EMPTY;

  // ---- loading
  /** Fetches everything the signed-in role may see. Called after sign-in and after every change. */
  public async load(): Promise<void> {
    this.data = { ...EMPTY, ...(await api<Partial<Snapshot>>('GET', '/api/snapshot')) };
  }

  public clear() {
    this.data = EMPTY;
  }

  private async changed<T>(result: Promise<T>): Promise<T> {
    const value = await result;
    await this.load();
    return value;
  }

  // ---- Suppliers
  public getSuppliers(): Supplier[] {
    return [...this.data.suppliers];
  }

  public getSupplierById(id: string): Supplier | undefined {
    return this.data.suppliers.find((s) => s.id === id || s.supplierCode === id);
  }

  public saveSupplier(supplier: Supplier): Promise<Supplier> {
    const exists = this.data.suppliers.some((s) => s.id === supplier.id);
    return this.changed(exists ? api<Supplier>('PUT', `/api/suppliers/${encodeURIComponent(supplier.id)}`, supplier) : api<Supplier>('POST', '/api/suppliers', supplier));
  }

  public deleteSupplier(id: string): Promise<{ deleted: boolean; deactivated: boolean }> {
    return this.changed(api('DELETE', `/api/suppliers/${encodeURIComponent(id)}`));
  }

  // ---- Materials
  public getMaterials(): Material[] {
    return [...this.data.materials];
  }

  public getMaterialById(id: string): Material | undefined {
    return this.data.materials.find((m) => m.id === id || m.materialCode === id);
  }

  public saveMaterial(material: Material): Promise<Material> {
    const exists = this.data.materials.some((m) => m.id === material.id);
    return this.changed(exists ? api<Material>('PUT', `/api/materials/${encodeURIComponent(material.id)}`, material) : api<Material>('POST', '/api/materials', material));
  }

  public deleteMaterial(id: string): Promise<{ deleted: boolean; deactivated: boolean }> {
    return this.changed(api('DELETE', `/api/materials/${encodeURIComponent(id)}`));
  }

  /** Every supplier that has quoted or supplied the material, cheapest first. */
  public getSuppliersForMaterial(materialId: string) {
    const mat = this.getMaterialById(materialId);
    if (!mat) return [];

    const relatedTx = this.data.purchases.filter((p) => p.materialId === mat.id);
    const supplierIds = new Set<string>();
    if (mat.preferredSupplierId) supplierIds.add(mat.preferredSupplierId);
    relatedTx.forEach((t) => supplierIds.add(t.supplierId));

    return Array.from(supplierIds)
      .map((supId) => {
        const supplier = this.getSupplierById(supId);
        const supplierTx = relatedTx.filter((t) => t.supplierId === supId);
        const latestTx = supplierTx[0]; // newest first
        const quotedPrice = latestTx ? latestTx.unitPrice : mat.currentPrice;
        const priceVarianceVsStd = mat.standardPrice > 0 ? Number((((quotedPrice - mat.standardPrice) / mat.standardPrice) * 100).toFixed(2)) : 0;

        return {
          supplierId: supId,
          supplierName: supplier ? supplier.supplierName : 'Vendor',
          supplierCode: supplier ? supplier.supplierCode : '',
          status: supplier?.status || 'ACTIVE',
          isPreferred: supId === mat.preferredSupplierId,
          quotedPrice,
          priceVarianceVsStd,
          leadTimeDays: supplier?.leadTimeDays || 7,
          deliveryScore: supplier?.deliveryScore || 85,
          qualityScore: supplier?.qualityScore || 90,
          overallScore: supplier?.overallScore || 85,
          ratingTier: supplier?.ratingTier || 'GOOD',
          paymentTerms: supplier?.paymentTerms || 'Net 30',
          transactionCount: supplierTx.length,
        };
      })
      .sort((a, b) => a.quotedPrice - b.quotedPrice);
  }

  // ---- Purchases
  public getPurchases(): PurchaseTransaction[] {
    return [...this.data.purchases];
  }

  public savePurchase(tx: PurchaseTransaction): Promise<PurchaseTransaction> {
    const exists = this.data.purchases.some((p) => p.id === tx.id);
    return this.changed(exists ? api<PurchaseTransaction>('PUT', `/api/purchases/${encodeURIComponent(tx.id)}`, tx) : api<PurchaseTransaction>('POST', '/api/purchases', tx));
  }

  public getPriceHistory(filter?: { materialId?: string; supplierId?: string }): PriceHistoryRecord[] {
    let list = [...this.data.priceHistory];
    if (filter?.materialId) list = list.filter((p) => p.materialId === filter.materialId);
    if (filter?.supplierId) list = list.filter((p) => p.supplierId === filter.supplierId);
    return list;
  }

  // ---- Bulk imports (one request, one rescoring pass; rows that break a rule come back as errors)
  public importSuppliers(items: Supplier[]): Promise<{ saved: Supplier[]; errors: ImportRowError[] }> {
    return this.changed(api('POST', '/api/suppliers/bulk', { items }));
  }

  public importMaterials(items: Material[]): Promise<{ saved: Material[]; errors: ImportRowError[] }> {
    return this.changed(api('POST', '/api/materials/bulk', { items }));
  }

  public importPurchases(items: PurchaseTransaction[]): Promise<{ saved: PurchaseTransaction[]; errors: ImportRowError[] }> {
    return this.changed(api('POST', '/api/purchases/bulk', { items }));
  }

  public getImportHistory(): DataImportRecord[] {
    return [...this.data.importHistory];
  }

  public recordImport(record: Omit<DataImportRecord, 'id' | 'createdAt' | 'importedBy'> & Partial<DataImportRecord>): Promise<DataImportRecord> {
    return this.changed(api<DataImportRecord>('POST', '/api/imports', record));
  }

  public updateImportStatus(id: string, status: DataImportRecord['status']): Promise<boolean> {
    const rec = this.data.importHistory.find((i) => i.id === id);
    if (rec) rec.status = status;
    return Promise.resolve(true);
  }

  // ---- Scoring
  public recalculateAllSuppliers(): Promise<void> {
    return this.changed(api('POST', '/api/scoring/recalculate'));
  }

  // ---- Alerts
  public getAlerts(): AlertItem[] {
    return [...this.data.alerts];
  }

  public createAlert(alertData: Omit<AlertItem, 'id' | 'status' | 'createdAt'>): Promise<AlertItem | null> {
    return this.changed(api<AlertItem>('POST', '/api/alerts', alertData).catch(() => null));
  }

  public updateAlertStatus(id: string, status: AlertItem['status'], resolution?: string, assignedUser?: string): Promise<AlertItem> {
    return this.changed(api<AlertItem>('PATCH', `/api/alerts/${encodeURIComponent(id)}`, { status, resolution, assignedUser }));
  }

  public executeRuleScan(): Promise<{ scannedCount: number; alertsGenerated: number; summary: string }> {
    return this.changed(api('POST', '/api/alerts/scan'));
  }

  // ---- Settings
  public getSettings(): SystemSettings {
    return this.data.settings ? { ...this.data.settings } : ({} as SystemSettings);
  }

  public updateSettings(settings: SystemSettings): Promise<SystemSettings> {
    return this.changed(api<SystemSettings>('PUT', '/api/settings', settings));
  }

  // ---- Audit trail
  public getAuditLogs(): AuditLogItem[] {
    return [...this.data.auditLogs];
  }

  // ---- Users (administrators only)
  public getUsers(): User[] {
    return [...this.data.users];
  }

  public createUser(input: Pick<User, 'email' | 'displayName' | 'department' | 'role'>): Promise<{ user: User; temporaryPassword: string }> {
    return this.changed(api('POST', '/auth/users', input));
  }

  public updateUser(uid: string, input: Pick<User, 'displayName' | 'department' | 'role'>): Promise<{ user: User }> {
    return this.changed(api('PUT', `/auth/users/${encodeURIComponent(uid)}`, input));
  }

  public updateUserStatus(uid: string, status: User['status']): Promise<void> {
    return this.changed(api('POST', `/auth/users/${encodeURIComponent(uid)}/status`, { status }));
  }

  public resetUserPassword(uid: string): Promise<{ email: string; temporaryPassword: string }> {
    return this.changed(api('POST', `/auth/users/${encodeURIComponent(uid)}/reset`));
  }

  // ---- System backup & restore
  public exportSystemSnapshot(): Promise<unknown> {
    return api('GET', '/api/system/export');
  }

  public importSystemSnapshot(snapshot: unknown): Promise<{ success: boolean; message: string }> {
    return this.changed(api('POST', '/api/system/import', snapshot));
  }

  public resetToDefaults(): Promise<void> {
    return this.changed(api('POST', '/api/system/reset'));
  }
}

export const dbService = new DatabaseService();
