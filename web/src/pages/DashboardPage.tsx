import React, { useState, useMemo, useEffect } from 'react';
import { 
  Building2, 
  Package, 
  ShoppingCart, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  DollarSign, 
  Filter, 
  ArrowUpRight, 
  ArrowDownRight,
  Eye,
  RefreshCw,
  Award,
  UploadCloud,
  FileCheck,
  RotateCcw,
  Info
} from 'lucide-react';
import { dbService } from '../services/db';
import { StatCard } from '../components/common/StatCard';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { NavigationTab } from '../components/layout/EnterpriseLayout';
import { useAuth } from '../context/AuthContext';
import { AlertItem, AlertStatus } from '../types';

import { 
  SupplierPerformanceHorizontalBarChart,
  SupplierPerformanceScoreItem 
} from '../components/charts/SupplierPerformanceHorizontalBarChart';

import { 
  MaterialPriceTrendLineChart, 
  PriceTrendPoint 
} from '../components/charts/MaterialPriceTrendLineChart';

import { AlertsRequiringAttentionPanel } from '../components/dashboard/AlertsRequiringAttentionPanel';
import { 
  RecentActivityAndFreshnessPanel,
  DataCategoryFreshness 
} from '../components/dashboard/RecentActivityAndFreshnessPanel';
import { 
  DashboardFilterBar, 
  DashboardGlobalFilters 
} from '../components/dashboard/DashboardFilterBar';

import { 
  MonthlySpendTrendChart, 
  DeliveryVsQualityGauge, 
  PerformanceDistributionChart 
} from '../components/charts/DashboardCharts';

interface DashboardPageProps {
  onNavigate: (tab: NavigationTab) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { currentUser, hasPermission } = useAuth();

  // Master records from verified database
  const [suppliers, setSuppliers] = useState(() => dbService.getSuppliers());
  const [materials, setMaterials] = useState(() => dbService.getMaterials());
  const [purchases, setPurchases] = useState(() => dbService.getPurchases());
  const [priceHistory, setPriceHistory] = useState(() => dbService.getPriceHistory());
  const [alerts, setAlerts] = useState(() => dbService.getAlerts());
  const [auditLogs, setAuditLogs] = useState(() => dbService.getAuditLogs());
  const [importHistory, setImportHistory] = useState(() => dbService.getImportHistory());
  const [settings, setSettings] = useState(() => dbService.getSettings());

  // Global Dashboard Filters
  const [filters, setFilters] = useState<DashboardGlobalFilters>({
    reportingPeriod: '2026-Q3',
    supplierId: 'ALL',
    materialCategory: 'ALL',
    supplierStatus: 'ALL',
    performanceClassification: 'ALL',
  });

  // Selected material for the price trend chart
  const [selectedMaterialForTrend, setSelectedMaterialForTrend] = useState<string>(() => {
    return materials[0]?.id || '';
  });

  // Keep state synced if db changes
  const reloadDb = () => {
    setSuppliers(dbService.getSuppliers());
    setMaterials(dbService.getMaterials());
    setPurchases(dbService.getPurchases());
    setPriceHistory(dbService.getPriceHistory());
    setAlerts(dbService.getAlerts());
    setAuditLogs(dbService.getAuditLogs());
    setImportHistory(dbService.getImportHistory());
    setSettings(dbService.getSettings());
  };

  const handleFilterChange = <K extends keyof DashboardGlobalFilters>(
    key: K,
    value: DashboardGlobalFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      reportingPeriod: '2026-Q3',
      supplierId: 'ALL',
      materialCategory: 'ALL',
      supplierStatus: 'ALL',
      performanceClassification: 'ALL',
    });
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.reportingPeriod !== '2026-Q3') count++;
    if (filters.supplierId !== 'ALL') count++;
    if (filters.materialCategory !== 'ALL') count++;
    if (filters.supplierStatus !== 'ALL') count++;
    if (filters.performanceClassification !== 'ALL') count++;
    return count;
  }, [filters]);

  // Available Reporting Periods
  const availablePeriods = ['2026-Q3', '2026-Q2', '2026-Q1', '2026-YTD', 'ALL'];

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    materials.forEach(m => set.add(m.category));
    suppliers.forEach(s => set.add(s.category));
    return Array.from(set).sort();
  }, [materials, suppliers]);

  // Suppliers mapped to simple array for filter dropdown
  const supplierFilterList = useMemo(() => {
    return suppliers.map(s => ({ id: s.id, name: `${s.supplierName} (${s.supplierCode})` }));
  }, [suppliers]);

  // -------------------------------------------------------------
  // Filtered Suppliers based on global criteria
  // -------------------------------------------------------------
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => {
      // 1. Supplier ID filter
      if (filters.supplierId !== 'ALL' && s.id !== filters.supplierId) return false;

      // 2. Material Category filter
      if (filters.materialCategory !== 'ALL' && s.category !== filters.materialCategory) return false;

      // 3. Supplier Status filter
      if (filters.supplierStatus !== 'ALL' && s.status !== filters.supplierStatus) return false;

      // 4. Performance Classification filter
      if (filters.performanceClassification !== 'ALL') {
        const hasOrders = s.totalOrdersCount > 0;
        if (!hasOrders) {
          if (filters.performanceClassification !== 'NOT_EVALUATED') return false;
        } else {
          if (filters.performanceClassification === 'EXCELLENT' && s.overallScore < 90) return false;
          if (filters.performanceClassification === 'GOOD' && (s.overallScore < 80 || s.overallScore >= 90)) return false;
          if (filters.performanceClassification === 'NEEDS_IMPROVEMENT' && (s.overallScore < 70 || s.overallScore >= 80)) return false;
          if (filters.performanceClassification === 'POOR' && s.overallScore >= 70) return false;
          if (filters.performanceClassification === 'NOT_EVALUATED') return false;
        }
      }

      return true;
    });
  }, [suppliers, filters]);

  // Filtered Materials based on category
  const filteredMaterials = useMemo(() => {
    return materials.filter(m => {
      if (filters.materialCategory !== 'ALL' && m.category !== filters.materialCategory) return false;
      if (filters.supplierId !== 'ALL' && m.preferredSupplierId !== filters.supplierId) return false;
      return true;
    });
  }, [materials, filters]);

  // Filtered Alerts based on selected suppliers/materials
  const filteredAlerts = useMemo(() => {
    return alerts.filter(a => {
      if (filters.supplierId !== 'ALL' && a.supplierId !== filters.supplierId) return false;
      return true;
    });
  }, [alerts, filters]);

  // -------------------------------------------------------------
  // SECTION 3: The Six Top Summary KPI Cards
  // -------------------------------------------------------------

  // CARD 1: Total Active Suppliers
  // Calculate from supplier records with an active status
  const totalActiveSuppliersCount = useMemo(() => {
    return filteredSuppliers.filter(s => s.status === 'ACTIVE').length;
  }, [filteredSuppliers]);

  // CARD 2: Materials Monitored
  // Display number of unique materials currently being monitored (active)
  const monitoredMaterialsCount = useMemo(() => {
    return filteredMaterials.filter(m => m.isActive).length;
  }, [filteredMaterials]);

  // CARD 3: Average Supplier Performance Score
  // Average of valid supplier performance scores for the selected period, excluding suppliers without sufficient evaluation data
  const { avgPerformanceScore, evaluatedSuppliersCount, totalEvaluatedBase } = useMemo(() => {
    // Exclude vendors with 0 orders or no recorded scores
    const evaluated = filteredSuppliers.filter(s => s.totalOrdersCount > 0 && s.overallScore > 0);
    if (evaluated.length === 0) {
      return { avgPerformanceScore: null, evaluatedSuppliersCount: 0, totalEvaluatedBase: filteredSuppliers.length };
    }
    const sum = evaluated.reduce((acc, s) => acc + s.overallScore, 0);
    const avg = Number((sum / evaluated.length).toFixed(1));
    return { 
      avgPerformanceScore: avg, 
      evaluatedSuppliersCount: evaluated.length,
      totalEvaluatedBase: filteredSuppliers.length 
    };
  }, [filteredSuppliers]);

  // CARD 4: Materials with Increasing Prices
  // Unique materials whose latest comparable recorded price is higher than previous valid price
  // Avoid counting the same material multiple times merely because it has multiple suppliers
  const { materialsWithIncreasingPricesCount, materialsWithPriceChangeList } = useMemo(() => {
    // Track unique material ids
    const increasingMaterialIds = new Set<string>();

    filteredMaterials.forEach(mat => {
      // Find all price records for this material
      const records = priceHistory
        .filter(p => p.materialId === mat.id)
        .sort((a, b) => new Date(a.recordedDate).getTime() - new Date(b.recordedDate).getTime());

      if (records.length >= 2) {
        // Compare latest vs immediately preceding comparable record
        const latest = records[records.length - 1];
        const prev = records[records.length - 2];
        if (latest.price > prev.price) {
          increasingMaterialIds.add(mat.id);
        }
      } else if (mat.currentPrice > mat.previousPrice && mat.previousPrice > 0) {
        increasingMaterialIds.add(mat.id);
      }
    });

    return {
      materialsWithIncreasingPricesCount: increasingMaterialIds.size,
      materialsWithPriceChangeList: Array.from(increasingMaterialIds),
    };
  }, [filteredMaterials, priceHistory]);

  // CARD 5: Suppliers Requiring Attention
  // Unique suppliers whose approved performance score falls below configured threshold (70) OR who have a qualifying performance alert
  // Avoid double-counting a supplier with multiple alerts
  const suppliersRequiringAttention = useMemo(() => {
    const poorThreshold = settings.thresholds.poorPerformanceThreshold || 70.0;
    const attentionSupplierIds = new Set<string>();

    filteredSuppliers.forEach(s => {
      // 1. Below threshold (for evaluated suppliers)
      if (s.totalOrdersCount > 0 && s.overallScore < poorThreshold) {
        attentionSupplierIds.add(s.id);
      }
      // 2. Probation or Suspended status
      if (s.status === 'PROBATION' || s.status === 'SUSPENDED') {
        attentionSupplierIds.add(s.id);
      }
    });

    // 3. Open alerts for suppliers (New or Acknowledged or Investigating)
    filteredAlerts.forEach(a => {
      if (a.supplierId && (a.status === 'NEW' || a.status === 'ACKNOWLEDGED' || a.status === 'INVESTIGATING')) {
        attentionSupplierIds.add(a.supplierId);
      }
    });

    return {
      count: attentionSupplierIds.size,
      supplierIds: Array.from(attentionSupplierIds),
    };
  }, [filteredSuppliers, filteredAlerts, settings.thresholds.poorPerformanceThreshold]);

  // CARD 6: Pending Data Updates
  // Number of data imports or updates that require action (FAILED, PARTIAL, unresolved validation errors)
  // Do NOT classify a completed, validated upload as pending
  const pendingDataUpdatesCount = useMemo(() => {
    const pendingImports = importHistory.filter(i => i.status === 'FAILED' || i.status === 'PARTIAL');
    const unresolvedImportAlerts = alerts.filter(a => 
      a.alertType === 'Data Anomaly' && 
      (a.status === 'NEW' || a.status === 'ACKNOWLEDGED')
    );
    return pendingImports.length + unresolvedImportAlerts.length;
  }, [importHistory, alerts]);

  // -------------------------------------------------------------
  // SECTION 4: Supplier Performance Horizontal Bar Chart Data
  // -------------------------------------------------------------
  const supplierPerformanceBarItems: SupplierPerformanceScoreItem[] = useMemo(() => {
    return filteredSuppliers.map(s => {
      const isEvaluated = s.totalOrdersCount > 0;
      const hasQualifyingAlert = alerts.some(a => 
        a.supplierId === s.id && 
        (a.status === 'NEW' || a.status === 'INVESTIGATING')
      );

      return {
        id: s.id,
        name: s.supplierName,
        code: s.supplierCode,
        score: isEvaluated ? s.overallScore : null,
        deliveryScore: isEvaluated ? s.deliveryScore : undefined,
        qualityScore: isEvaluated ? s.qualityScore : undefined,
        priceScore: isEvaluated ? s.priceScore : undefined,
        evalPeriod: filters.reportingPeriod,
        status: s.status,
        category: s.category,
        hasQualifyingAlert,
      };
    });
  }, [filteredSuppliers, alerts, filters.reportingPeriod]);

  // -------------------------------------------------------------
  // SECTION 5: Material Price Trend Analysis Data
  // -------------------------------------------------------------
  const priceTrendPoints: PriceTrendPoint[] = useMemo(() => {
    return priceHistory.map(p => ({
      id: p.id,
      materialId: p.materialId,
      materialName: p.materialName,
      materialCode: p.materialCode,
      supplierId: p.supplierId,
      supplierName: p.supplierName,
      poNumber: p.poNumber,
      date: p.recordedDate,
      price: p.price,
      previousPrice: p.previousPrice,
      currency: p.currency,
      uom: p.uom,
    }));
  }, [priceHistory]);

  const materialsDropdownList = useMemo(() => {
    return materials.map(m => ({
      id: m.id,
      name: m.materialName,
      code: m.materialCode,
      uom: m.uom,
      category: m.category,
    }));
  }, [materials]);

  // -------------------------------------------------------------
  // SECTION 6: Alerts Requiring Attention Handler
  // -------------------------------------------------------------
  const handleUpdateAlertStatus = async (alertId: string, status: AlertStatus, resolution?: string) => {
    await dbService.updateAlertStatus(
      alertId, 
      status, 
      resolution, 
      currentUser?.displayName || 'Authorized User'
    );
    reloadDb();
  };

  const handleNavigateToRecord = (type: 'supplier' | 'material' | 'alerts', id?: string) => {
    if (type === 'supplier') onNavigate('suppliers_list');
    else if (type === 'material') onNavigate('materials_list');
    else onNavigate('alerts');
  };

  // -------------------------------------------------------------
  // SECTION 7: Data Freshness Statuses
  // -------------------------------------------------------------
  const dataFreshnessList: DataCategoryFreshness[] = useMemo(() => {
    // Calculate last updated timestamps from master collections
    const latestSupplierUpdate = suppliers.reduce((latest, s) => {
      const ts = s.updatedAt || s.createdAt;
      return ts > latest ? ts : latest;
    }, '');

    const latestMaterialUpdate = materials.reduce((latest, m) => {
      const ts = m.updatedAt || m.createdAt;
      return ts > latest ? ts : latest;
    }, '');

    const latestPurchaseUpdate = purchases.reduce((latest, p) => {
      const ts = p.createdAt;
      return ts > latest ? ts : latest;
    }, '');

    const latestDeliveryRecord = purchases
      .filter(p => p.actualDeliveryDate)
      .reduce((latest, p) => {
        const ts = p.actualDeliveryDate || '';
        return ts > latest ? ts : latest;
      }, '');

    const latestQualityRecord = purchases
      .filter(p => p.receivedQuantity > 0)
      .reduce((latest, p) => {
        const ts = p.actualDeliveryDate || p.createdAt;
        return ts > latest ? ts : latest;
      }, '');

    return [
      {
        category: 'Supplier Master Records',
        lastUpdated: latestSupplierUpdate || null,
        freshnessThresholdHours: 48,
        totalRecords: suppliers.length,
      },
      {
        category: 'Material Price Records',
        lastUpdated: latestMaterialUpdate || null,
        freshnessThresholdHours: 24,
        totalRecords: priceHistory.length,
      },
      {
        category: 'Delivery & Logistics Records',
        lastUpdated: latestDeliveryRecord ? `${latestDeliveryRecord}T17:00:00Z` : null,
        freshnessThresholdHours: 48,
        totalRecords: purchases.filter(p => p.actualDeliveryDate).length,
      },
      {
        category: 'Quality & QC Inspection Records',
        lastUpdated: latestQualityRecord ? `${latestQualityRecord}T16:30:00Z` : null,
        freshnessThresholdHours: 48,
        totalRecords: purchases.filter(p => p.receivedQuantity > 0).length,
      },
      {
        category: 'Supplier Performance Evaluations',
        lastUpdated: latestSupplierUpdate || null,
        freshnessThresholdHours: 72,
        totalRecords: suppliers.filter(s => s.totalOrdersCount > 0).length,
      },
    ];
  }, [suppliers, materials, purchases, priceHistory]);

  return (
    <div className="space-y-6">
      {/* Global Filter Bar */}
      <DashboardFilterBar
        filters={filters}
        onChangeFilter={handleFilterChange}
        onResetFilters={handleResetFilters}
        availablePeriods={availablePeriods}
        suppliers={supplierFilterList}
        categories={categories}
        activeFilterCount={activeFilterCount}
      />

      {/* ============================================================== */}
      {/* SECTION 3: SIX SUMMARY KPI CARDS AT TOP OF DASHBOARD           */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* CARD 1: Total Active Suppliers */}
        <StatCard
          title="Total Active Suppliers"
          value={totalActiveSuppliersCount}
          subtitle={`Active / Valid Status (${filteredSuppliers.length} total)`}
          icon={<Building2 className="w-5 h-5 text-[#002F87]" />}
          onClick={() => onNavigate('suppliers_list')}
          tooltip="Click to open Supplier Management module"
          variant="success"
        />

        {/* CARD 2: Materials Monitored */}
        <StatCard
          title="Materials Monitored"
          value={monitoredMaterialsCount}
          subtitle={`Active in tracking catalog (${filteredMaterials.length} total)`}
          icon={<Package className="w-5 h-5 text-[#002F87]" />}
          onClick={() => onNavigate('materials_list')}
          tooltip="Click to view Material Catalog & Price Monitoring"
          variant="default"
        />

        {/* CARD 3: Average Supplier Performance Score */}
        <StatCard
          title="Avg Performance Score"
          value={avgPerformanceScore !== null ? `${avgPerformanceScore} / 100` : 'N/A'}
          subtitle={
            avgPerformanceScore !== null
              ? `Calculated from ${evaluatedSuppliersCount} evaluated vendors`
              : 'No evaluation records for period'
          }
          icon={<Award className="w-5 h-5 text-[#002F87]" />}
          onClick={() => onNavigate('suppliers_performance')}
          tooltip="Composite weighted evaluation: Delivery (30%), Quality (30%), Price (20%), Responsiveness (10%), Compliance (10%). Vendors without orders are excluded."
          variant={avgPerformanceScore && avgPerformanceScore >= 80 ? 'success' : 'warning'}
        />

        {/* CARD 4: Materials with Increasing Prices */}
        <StatCard
          title="Price Hikes Detected"
          value={materialsWithIncreasingPricesCount}
          subtitle={`Unique materials with latest price > previous valid price`}
          icon={<TrendingUp className="w-5 h-5 text-rose-600" />}
          onClick={() => onNavigate('price_monitoring')}
          tooltip="Unique materials whose latest price is strictly higher than previous valid benchmark. Click to view price variances."
          variant={materialsWithIncreasingPricesCount > 0 ? 'danger' : 'success'}
        />

        {/* CARD 5: Suppliers Requiring Attention */}
        <StatCard
          title="Vendors Requiring Attention"
          value={suppliersRequiringAttention.count}
          subtitle={`Score < ${settings.thresholds.poorPerformanceThreshold} or qualifying alert`}
          icon={<ShieldAlert className="w-5 h-5 text-amber-600" />}
          onClick={() => onNavigate('suppliers_ranking')}
          tooltip="Suppliers below acceptable threshold (70) or holding open performance alerts without duplicate counting. Click to review supplier records."
          variant={suppliersRequiringAttention.count > 0 ? 'warning' : 'success'}
        />

        {/* CARD 6: Pending Data Updates */}
        <StatCard
          title="Pending Data Updates"
          value={pendingDataUpdatesCount}
          subtitle="Failed imports or unresolved validation errors"
          icon={<UploadCloud className="w-5 h-5 text-[#44B330]" />}
          onClick={() => onNavigate('data_import_history')}
          tooltip="Count of data imports requiring remediation (failed batches or unresolved validation errors). Completed batches excluded."
          variant={pendingDataUpdatesCount > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* Performance Calculation Explanation Banner */}
      <div className="bg-[#EFF4FC] border border-[#DBE8FC] rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-700">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-[#002F87] shrink-0" />
          <span>
            <strong>Performance Metric Governance:</strong> Scores calculated via multi-attribute rating: Delivery (30%), Quality (30%), Price (20%), Responsiveness (10%), Compliance (10%). Suppliers without evaluations are shown as <em>"Not Evaluated"</em> and omitted from company averages.
          </span>
        </div>
        <button
          onClick={() => onNavigate('admin_settings')}
          className="text-[#002F87] font-bold hover:underline shrink-0 text-left cursor-pointer"
        >
          View Scoring Rules &rarr;
        </button>
      </div>

      {/* ============================================================== */}
      {/* SECTION 4: SUPPLIER PERFORMANCE OVERVIEW (HORIZONTAL BAR)      */}
      {/* ============================================================== */}
      <Card
        title="Supplier Performance Overview"
        subtitle={`Evaluated performance scorecards across ${filteredSuppliers.length} vendors in ${filters.reportingPeriod}`}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await dbService.recalculateAllSuppliers();
                reloadDb();
              }}
              icon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Recalculate All
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onNavigate('suppliers_performance')}
            >
              Full Scorecards
            </Button>
          </div>
        }
      >
        <SupplierPerformanceHorizontalBarChart
          suppliers={supplierPerformanceBarItems}
          acceptableThreshold={settings.thresholds.poorPerformanceThreshold || 70}
          selectedPeriod={filters.reportingPeriod}
          onPeriodChange={(period) => handleFilterChange('reportingPeriod', period)}
          availablePeriods={availablePeriods}
          onNavigateToSupplier={(supplierId) => onNavigate('suppliers_performance')}
        />
      </Card>

      {/* ============================================================== */}
      {/* SECTION 5: MATERIAL PRICE TREND ANALYSIS (LINE CHART)          */}
      {/* ============================================================== */}
      <Card
        title="Material Price Trend Analysis"
        subtitle="Historical price trajectory, supplier comparisons, and automated percentage variance tracking"
        action={
          <button
            onClick={() => onNavigate('price_trends')}
            className="text-xs font-semibold text-[#002F87] hover:text-[#002266] flex items-center gap-1 cursor-pointer"
          >
            Price Trends Module <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        }
      >
        <MaterialPriceTrendLineChart
          materials={materialsDropdownList}
          suppliers={supplierFilterList}
          pricePoints={priceTrendPoints}
          selectedMaterialId={selectedMaterialForTrend}
          onSelectMaterial={(id) => setSelectedMaterialForTrend(id)}
          selectedSupplierId={filters.supplierId}
        />
      </Card>

      {/* ============================================================== */}
      {/* SECTION 6: ALERTS REQUIRING ATTENTION                          */}
      {/* ============================================================== */}
      <Card
        title="Alerts Requiring Attention"
        subtitle={`${filteredAlerts.filter(a => a.status === 'NEW' || a.status === 'ACKNOWLEDGED').length} active purchasing issues demanding review or resolution`}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await dbService.executeRuleScan();
                reloadDb();
              }}
              icon={<ShieldAlert className="w-3.5 h-3.5" />}
            >
              Scan Enterprise Rules
            </Button>
          </div>
        }
      >
        <AlertsRequiringAttentionPanel
          alerts={filteredAlerts}
          onUpdateAlertStatus={handleUpdateAlertStatus}
          onNavigateToRecord={handleNavigateToRecord}
        />
      </Card>

      {/* ============================================================== */}
      {/* SECTION 7: RECENT ACTIVITY & DATA FRESHNESS PANELS            */}
      {/* ============================================================== */}
      <RecentActivityAndFreshnessPanel
        recentActivities={auditLogs}
        freshnessCategories={dataFreshnessList}
        onNavigateToAudit={() => onNavigate('admin_audit_logs')}
        onNavigateToDataImport={() => onNavigate('data_import_history')}
      />
    </div>
  );
};
