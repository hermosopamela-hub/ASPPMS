import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { EnterpriseLayout, NavigationTab } from './components/layout/EnterpriseLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { SupplierListPage } from './pages/suppliers/SupplierListPage';
import { SupplierPerformancePage } from './pages/suppliers/SupplierPerformancePage';
import { SupplierRankingPage } from './pages/suppliers/SupplierRankingPage';
import { SupplierComparisonPage } from './pages/suppliers/SupplierComparisonPage';
import { MaterialListPage } from './pages/materials/MaterialListPage';
import { PriceMonitoringPage } from './pages/materials/PriceMonitoringPage';
import { PriceTrendsPage } from './pages/materials/PriceTrendsPage';
import { SupplierPriceComparisonPage } from './pages/materials/SupplierPriceComparisonPage';
import { PurchaseTransactionsPage } from './pages/purchasing/PurchaseTransactionsPage';
import { SpendAnalyticsPage } from './pages/purchasing/SpendAnalyticsPage';
import { SupplierAnalyticsPage } from './pages/analytics/SupplierAnalyticsPage';
import { PriceAnalyticsPage } from './pages/analytics/PriceAnalyticsPage';
import { ImportDataPage } from './pages/imports/ImportDataPage';
import { ImportHistoryPage } from './pages/imports/ImportHistoryPage';
import { DataQualityPage } from './pages/imports/DataQualityPage';
import { AlertsPage } from './pages/alerts/AlertsPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { UsersManagementPage } from './pages/admin/UsersManagementPage';
import { AuditLogsPage } from './pages/admin/AuditLogsPage';
import { SystemSettingsPage } from './pages/admin/SystemSettingsPage';
import { AlertRulesPage } from './pages/admin/AlertRulesPage';
import { ChangePasswordPage } from './pages/auth/ChangePasswordPage';
import { Card } from './components/common/Card';
import { Button } from './components/common/Button';
import { BarChart3, ArrowRight } from 'lucide-react';

function AppContent() {
  const { currentUser, loading, mustChangePassword } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');

  // still asking the server whether a session exists
  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">Loading…</div>;
  }

  // no session: sign-in page
  if (!currentUser) {
    return <LoginPage onSuccess={() => setCurrentTab('dashboard')} />;
  }

  // first sign-in or an administrator reset: choose a password before anything else
  if (mustChangePassword) {
    return <ChangePasswordPage />;
  }

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <DashboardPage onNavigate={(tab) => setCurrentTab(tab)} />;
      case 'suppliers_list':
        return <SupplierListPage />;
      case 'suppliers_performance':
        return <SupplierPerformancePage />;
      case 'suppliers_ranking':
        return <SupplierRankingPage />;
      case 'suppliers_comparison':
        return <SupplierComparisonPage />;
      case 'materials_list':
        return <MaterialListPage />;
      case 'price_monitoring':
        return <PriceMonitoringPage />;
      case 'price_trends':
        return <PriceTrendsPage />;
      case 'supplier_price_comparison':
        return <SupplierPriceComparisonPage />;
      case 'purchase_transactions':
        return <PurchaseTransactionsPage />;
      case 'spend_analytics':
      case 'analytics_purchasing':
        return <SpendAnalyticsPage />;
      case 'analytics_supplier':
        return <SupplierAnalyticsPage />;
      case 'analytics_price':
        return <PriceAnalyticsPage />;
      case 'data_import':
        return <ImportDataPage />;
      case 'data_import_history':
        return <ImportHistoryPage />;
      case 'data_quality':
        return <DataQualityPage />;
      case 'alerts':
        return <AlertsPage />;
      case 'reports':
        return <ReportsPage />;
      case 'admin_users':
        return <UsersManagementPage />;
      case 'admin_audit_logs':
        return <AuditLogsPage />;
      case 'admin_settings':
        return <SystemSettingsPage />;
      case 'admin_alert_rules':
        return <AlertRulesPage />;
      default:
        return (
          <div className="max-w-3xl space-y-4">
            <Card
              title={`Module: ${String(currentTab).replace(/_/g, ' ').toUpperCase()}`}
              subtitle="Ready for module-specific workflows in sequential phase execution"
            >
              <div className="p-6 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[#EFF4FC] text-[#002F87] flex items-center justify-center mx-auto border border-[#DBE8FC]">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Procurement Intelligence Subsystem Active
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Phase 1 through Phase 5 modules are operational: Master Data catalogs, Purchasing Transactions, Spend Analytics, Data Ingestion & Quality Auditing.
                </p>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentTab('dashboard')}
                  >
                    Return to Dashboard
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setCurrentTab('purchase_transactions')}
                    icon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    View Purchase Transactions
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        );
    }
  };

  return (
    <EnterpriseLayout currentTab={currentTab} onSelectTab={(tab) => setCurrentTab(tab)}>
      {renderContent()}
    </EnterpriseLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
