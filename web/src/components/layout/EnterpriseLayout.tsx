import React, { useState, useRef, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Building2, 
  Package, 
  ShoppingCart, 
  BarChart3, 
  Bell, 
  FileText, 
  UploadCloud, 
  Settings, 
  ShieldCheck, 
  ChevronDown, 
  ChevronRight, 
  LogOut, 
  UserCircle,
  Menu,
  X,
  TrendingUp,
  Search,
  Sparkles,
  ArrowRight,
  KeyRound,
  FileCheck,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronLeft
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { Badge } from '../common/Badge';
import { dbService } from '../../services/db';
import { IpiBrandLogo } from '../common/IpiBrandLogo';

export type NavigationTab = 
  | 'dashboard'
  // Suppliers
  | 'suppliers_list'
  | 'suppliers_performance'
  | 'suppliers_ranking'
  | 'suppliers_comparison'
  // Materials
  | 'materials_list'
  | 'price_monitoring'
  | 'price_trends'
  | 'supplier_price_comparison'
  // Purchasing
  | 'purchase_transactions'
  | 'spend_analytics'
  // Analytics
  | 'analytics_supplier'
  | 'analytics_price'
  | 'analytics_purchasing'
  // Alerts & Reports
  | 'alerts'
  | 'reports'
  // Data Management
  | 'data_import'
  | 'data_import_history'
  | 'data_quality'
  // Administration
  | 'admin_users'
  | 'admin_settings'
  | 'admin_alert_rules'
  | 'admin_audit_logs';

interface EnterpriseLayoutProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  children: React.ReactNode;
}

export const EnterpriseLayout: React.FC<EnterpriseLayoutProps> = ({
  currentTab,
  onSelectTab,
  children,
}) => {
  const { currentUser, currentRole, switchRole, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ipi_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('ipi_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    suppliers: true,
    materials: true,
    purchasing: false,
    analytics: false,
    data_mgmt: false,
    admin: false,
  });

  const alerts = dbService.getAlerts();
  const unresolvedAlertCount = alerts.filter(a => a.status === 'NEW' || a.status === 'INVESTIGATING').length;

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Keyboard shortcut listener: Ctrl+B or Cmd+B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
      tab: 'dashboard' as NavigationTab,
    },
    {
      id: 'suppliers',
      label: 'Suppliers',
      icon: <Building2 className="w-4 h-4" />,
      children: [
        { id: 'suppliers_list', label: 'Supplier List', tab: 'suppliers_list' as NavigationTab },
        { id: 'suppliers_performance', label: 'Supplier Performance', tab: 'suppliers_performance' as NavigationTab },
        { id: 'suppliers_ranking', label: 'Supplier Ranking', tab: 'suppliers_ranking' as NavigationTab },
        { id: 'suppliers_comparison', label: 'Supplier Comparison', tab: 'suppliers_comparison' as NavigationTab },
      ],
    },
    {
      id: 'materials',
      label: 'Materials',
      icon: <Package className="w-4 h-4" />,
      children: [
        { id: 'materials_list', label: 'Material List', tab: 'materials_list' as NavigationTab },
        { id: 'price_monitoring', label: 'Price Monitoring', tab: 'price_monitoring' as NavigationTab },
        { id: 'price_trends', label: 'Price Trends', tab: 'price_trends' as NavigationTab },
        { id: 'supplier_price_comparison', label: 'Supplier Price Comparison', tab: 'supplier_price_comparison' as NavigationTab },
      ],
    },
    {
      id: 'purchasing',
      label: 'Purchasing',
      icon: <ShoppingCart className="w-4 h-4" />,
      children: [
        { id: 'purchase_transactions', label: 'Purchase Transactions', tab: 'purchase_transactions' as NavigationTab },
        { id: 'spend_analytics', label: 'Spend Analytics', tab: 'spend_analytics' as NavigationTab },
      ],
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <BarChart3 className="w-4 h-4" />,
      children: [
        { id: 'analytics_supplier', label: 'Supplier Analytics', tab: 'analytics_supplier' as NavigationTab },
        { id: 'analytics_price', label: 'Price Analytics', tab: 'analytics_price' as NavigationTab },
        { id: 'analytics_purchasing', label: 'Purchasing Analytics', tab: 'analytics_purchasing' as NavigationTab },
      ],
    },
    {
      id: 'alerts',
      label: 'Alerts',
      icon: <Bell className="w-4 h-4" />,
      tab: 'alerts' as NavigationTab,
      badge: unresolvedAlertCount > 0 ? unresolvedAlertCount : undefined,
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: <FileText className="w-4 h-4" />,
      tab: 'reports' as NavigationTab,
    },
    {
      id: 'data_mgmt',
      label: 'Data Management',
      icon: <UploadCloud className="w-4 h-4" />,
      children: [
        { id: 'data_import', label: 'Import Data', tab: 'data_import' as NavigationTab },
        { id: 'data_import_history', label: 'Import History', tab: 'data_import_history' as NavigationTab },
        { id: 'data_quality', label: 'Data Quality', tab: 'data_quality' as NavigationTab },
      ],
    },
    {
      id: 'admin',
      label: 'Administration',
      icon: <Settings className="w-4 h-4" />,
      children: [
        { id: 'admin_users', label: 'User Directory', tab: 'admin_users' as NavigationTab },
        { id: 'admin_settings', label: 'Settings & Weights', tab: 'admin_settings' as NavigationTab },
        { id: 'admin_alert_rules', label: 'Alert Trigger Rules', tab: 'admin_alert_rules' as NavigationTab },
        { id: 'admin_audit_logs', label: 'Audit Trail Logs', tab: 'admin_audit_logs' as NavigationTab },
      ],
    },
  ];

  const searchableNav = [
    { label: 'Executive Dashboard & Fleet KPIs', tab: 'dashboard' as NavigationTab, category: 'Overview' },
    { label: 'Supplier List Master Directory', tab: 'suppliers_list' as NavigationTab, category: 'Suppliers' },
    { label: 'Supplier Performance Scorecards', tab: 'suppliers_performance' as NavigationTab, category: 'Suppliers' },
    { label: 'Supplier Scorecard Ranking & Leaderboard', tab: 'suppliers_ranking' as NavigationTab, category: 'Suppliers' },
    { label: 'Cross-Supplier Capability Comparison', tab: 'suppliers_comparison' as NavigationTab, category: 'Suppliers' },
    { label: 'Material & SKU Catalog Master', tab: 'materials_list' as NavigationTab, category: 'Materials' },
    { label: 'Material Price Variance Monitoring', tab: 'price_monitoring' as NavigationTab, category: 'Price' },
    { label: 'Historical Material Price Trends', tab: 'price_trends' as NavigationTab, category: 'Price' },
    { label: 'Supplier Material Price Comparison', tab: 'supplier_price_comparison' as NavigationTab, category: 'Price' },
    { label: 'Purchase Order Transactions & Delivery Receipts', tab: 'purchase_transactions' as NavigationTab, category: 'Purchasing' },
    { label: 'Procurement Spend Analytics & Pareto Share', tab: 'spend_analytics' as NavigationTab, category: 'Purchasing' },
    { label: 'Supplier Risk & Trend Analytics', tab: 'analytics_supplier' as NavigationTab, category: 'Analytics' },
    { label: 'Material Price Volatility Analytics', tab: 'analytics_price' as NavigationTab, category: 'Analytics' },
    { label: 'Purchasing Category Analytics', tab: 'analytics_purchasing' as NavigationTab, category: 'Analytics' },
    { label: 'Operational & Price Anomaly Alerts', tab: 'alerts' as NavigationTab, category: 'Alerts' },
    { label: 'Enterprise PDF Reports & Document Generator', tab: 'reports' as NavigationTab, category: 'Reports' },
    { label: 'CSV / Excel Data Ingestion Engine', tab: 'data_import' as NavigationTab, category: 'Data Management' },
    { label: 'Data Quality & Validation Hygiene Checker', tab: 'data_quality' as NavigationTab, category: 'Data Management' },
    { label: 'User Directory & Role-Based Access Controls', tab: 'admin_users' as NavigationTab, category: 'Administration' },
    { label: 'Scoring Weight Thresholds & System Parameters', tab: 'admin_settings' as NavigationTab, category: 'Administration' },
    { label: 'Security & Transaction Audit Logs', tab: 'admin_audit_logs' as NavigationTab, category: 'Administration' },
  ];

  const filteredSearchResults = searchQuery.trim()
    ? searchableNav.filter(item => 
        item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleSelectSearchResult = (tab: NavigationTab) => {
    onSelectTab(tab);
    setSearchQuery('');
    setSearchDropdownOpen(false);
  };

  const roleLabels: Record<UserRole, string> = {
    PURCHASING_MANAGER: 'Purchasing Manager',
    PURCHASING_ASSISTANT_MANAGER: 'Asst. Purchasing Manager',
    PURCHASING_ANALYST: 'Purchasing Analyst',
    ADMIN: 'System Administrator',
  };

  const getBreadcrumbTitle = (tab: NavigationTab) => {
    switch (tab) {
      case 'dashboard': return 'Executive Procurement Dashboard';
      case 'suppliers_list': return 'Supplier Directory Master';
      case 'suppliers_performance': return 'Supplier Performance Scorecards';
      case 'suppliers_ranking': return 'Supplier Ranking Leaderboard';
      case 'suppliers_comparison': return 'Supplier Side-by-Side Comparison';
      case 'materials_list': return 'Material & Item Catalog Master';
      case 'price_monitoring': return 'Automated Price Monitoring';
      case 'price_trends': return 'Historical Material Price Trends';
      case 'supplier_price_comparison': return 'Supplier Material Price Comparison';
      case 'purchase_transactions': return 'Purchase Order Transactions';
      case 'spend_analytics': return 'Purchasing Spend Analytics';
      case 'analytics_supplier': return 'Supplier Risk & Trend Analytics';
      case 'analytics_price': return 'Material Price Volatility Analytics';
      case 'analytics_purchasing': return 'Purchasing Category Spend Trends';
      case 'alerts': return 'Operational & Price Anomaly Alerts';
      case 'reports': return 'Enterprise Procurement Reports & PDF Export';
      case 'data_import': return 'Data Import Engine (CSV / Excel)';
      case 'data_import_history': return 'Data Ingestion History & Audits';
      case 'data_quality': return 'Data Quality & Validation Checker';
      case 'admin_users': return 'User Access & RBAC Directory';
      case 'admin_settings': return 'System Parameters & Defaults';
      case 'admin_alert_rules': return 'Alert Trigger Rules & Weighting';
      case 'admin_audit_logs': return 'Security & Operation Audit Logs';
      default: return 'Procurement Intelligence';
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-50 text-slate-800 flex flex-col font-sans antialiased">
      {/* Top Header Bar - STEADY & FIXED AT TOP */}
      <header className="h-16 shrink-0 z-30 bg-white border-b border-slate-200/90 shadow-2xs">
        <div className="px-4 sm:px-6 h-full flex items-center justify-between gap-4">
          {/* Left Brand Lockup (Features official IPI emblem + full company name International Pharmaceuticals, Inc.) */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Mobile Navigation Drawer Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <IpiBrandLogo variant="header" />
          </div>

          {/* Center Search Bar with Interactive Quick Jump */}
          <div className="hidden lg:flex items-center flex-1 max-w-xs xl:max-w-md mx-4 relative" ref={searchContainerRef}>
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setSearchDropdownOpen(true);
                }}
                onFocus={() => setSearchDropdownOpen(true)}
                placeholder="Quick search suppliers, materials, POs, reports..."
                className="w-full pl-9 pr-12 py-1.5 text-xs bg-slate-100/80 border border-slate-200/90 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#002F87]/20 focus:border-[#002F87] transition-all"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/60 text-slate-500">
                ⌘K
              </span>
            </div>

            {/* Quick Search Dropdown Menu */}
            {searchDropdownOpen && searchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-72 overflow-y-auto divide-y divide-slate-100">
                {filteredSearchResults.length > 0 ? (
                  filteredSearchResults.map((result) => (
                    <button
                      key={result.tab}
                      onClick={() => handleSelectSearchResult(result.tab)}
                      className="w-full text-left px-3.5 py-2 hover:bg-[#EFF4FC] flex items-center justify-between text-xs transition-colors cursor-pointer group"
                    >
                      <div>
                        <span className="font-semibold text-slate-800 group-hover:text-[#002F87] block">
                          {result.label}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {result.category}
                        </span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#002F87] shrink-0" />
                    </button>
                  ))
                ) : (
                  <div className="p-3 text-center text-xs text-slate-400">
                    No matching modules found for "{searchQuery}"
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Controls: Status, Quick Reports, Alerts, Role Switcher, Profile */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Live Status Pill */}
            <div className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 font-medium select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-[#44B330] animate-pulse" />
              <span>Live Database · FY 2026</span>
            </div>

            {/* Quick PDF Reports Shortcut Button */}
            <button
              onClick={() => onSelectTab('reports')}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EFF4FC] hover:bg-[#DBE8FC] text-[#002F87] border border-[#C8DBFC] text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
              title="Go to PDF Reports & Document Generator"
            >
              <FileText className="w-3.5 h-3.5 text-[#002F87]" />
              <span>PDF Reports</span>
            </button>

            {/* Operational Alerts Bell */}
            <button
              onClick={() => onSelectTab('alerts')}
              className="relative p-2 text-slate-600 hover:text-[#002F87] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title={unresolvedAlertCount > 0 ? `${unresolvedAlertCount} Operational Alerts Requiring Attention` : 'Operational Alerts'}
            >
              <Bell className="w-4.5 h-4.5" />
              {unresolvedAlertCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center shadow-xs animate-pulse">
                  {unresolvedAlertCount}
                </span>
              )}
            </button>

            {/* Quick Role Switcher for seamless evaluation of the 3 user personas */}
            <div className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100/90 border border-slate-200/90 rounded-lg px-2 py-1 text-xs transition-colors shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-[#002F87] shrink-0" />
              <select
                value={currentRole}
                onChange={e => switchRole(e.target.value as UserRole)}
                className="bg-transparent text-slate-800 font-semibold text-xs focus:outline-none cursor-pointer pr-1"
                title="Switch persona for role evaluation"
              >
                <option value="PURCHASING_MANAGER">Elena (Purchasing Mgr)</option>
                <option value="PURCHASING_ASSISTANT_MANAGER">Marcus (Asst Mgr)</option>
                <option value="PURCHASING_ANALYST">Chloe (Analyst)</option>
                <option value="ADMIN">Admin (System)</option>
              </select>
            </div>

            {/* User Profile Mini & Logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-[#EFF4FC] text-[#002F87] font-bold text-xs flex items-center justify-center border border-[#DBE8FC] shadow-2xs">
                {currentUser?.displayName.charAt(0) || 'U'}
              </div>
              <div className="text-left hidden xl:block">
                <span className="text-xs font-semibold text-slate-800 block leading-tight">
                  {currentUser?.displayName}
                </span>
                <span className="text-[10px] text-slate-400 font-medium block">
                  {roleLabels[currentRole]}
                </span>
              </div>
              <button
                onClick={logout}
                title="Sign out / Return to Login Page"
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container - Holds Steady Sidebar and Independently Scrolling Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Backdrop Overlay */}
        {mobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-2xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar Navigation - STEADY & FIXED IN PLACE
            It does NOT scroll together with the main contents of the website.
            Desktop: w-64 shrink-0 h-full bg-slate-900 (steady fixed column).
            Mobile: off-canvas drawer (fixed inset-y-0 left-0 z-50 w-72 h-full).
        */}
        {/* Sidebar Navigation - STEADY & FIXED IN PLACE & COLLAPSIBLE
            Desktop: w-64 when expanded, w-[70px] when collapsed (steady fixed column).
            Mobile: off-canvas drawer (fixed inset-y-0 left-0 z-50 w-72 h-full).
        */}
        {(() => {
          const showCollapsedView = isCollapsed && !mobileMenuOpen;
          return (
            <aside
              className={`
                ${showCollapsedView ? 'lg:w-[70px]' : 'lg:w-64'} shrink-0 h-full bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 select-none z-20 transition-all duration-200
                ${mobileMenuOpen ? 'fixed inset-y-0 left-0 z-50 w-72 shadow-2xl flex' : 'hidden lg:flex'}
              `}
            >
              {/* Mobile drawer header */}
              <div className="lg:hidden p-3.5 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Navigation Menu
                </span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Desktop Upper Sidebar Header with Collapse Icon - Icon only; text shows strictly on hover */}
              <div className="hidden lg:flex items-center px-3 py-2.5 border-b border-slate-800/80 shrink-0">
                {!showCollapsedView ? (
                  <div className="w-full flex items-center justify-end">
                    <div className="relative group">
                      <button
                        onClick={toggleSidebar}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center"
                        aria-label="Collapse sidebar"
                      >
                        <PanelLeftClose className="w-4 h-4" />
                      </button>
                      {/* Tooltip shown only on hover */}
                      <div className="absolute right-0 top-full mt-1.5 px-2.5 py-1 bg-slate-950 text-white text-[11px] font-medium rounded-md shadow-xl border border-slate-800 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                        Collapse sidebar
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full flex items-center justify-center">
                    <div className="relative group flex justify-center">
                      <button
                        onClick={toggleSidebar}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center"
                        aria-label="Expand sidebar"
                      >
                        <PanelLeftOpen className="w-4 h-4 text-slate-300 hover:text-white" />
                      </button>
                      {/* Tooltip shown only on hover */}
                      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 px-2.5 py-1 bg-slate-950 text-white text-[11px] font-medium rounded-md shadow-xl border border-slate-800 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                        Expand sidebar
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation Links - Scroll independently inside sidebar if needed */}
              <div 
                className={`flex-1 ${
                  showCollapsedView 
                    ? 'py-3 px-2 space-y-2 overflow-visible' 
                    : 'overflow-y-auto px-3 py-4 space-y-1'
                } text-xs`}
              >
                {navItems.map(item => {
                  if (item.children) {
                    const isGroupExpanded = expandedGroups[item.id];
                    const isGroupActive = item.children.some(c => c.tab === currentTab);

                    if (showCollapsedView) {
                      return (
                        <div key={item.id} className="relative group flex justify-center">
                          <button
                            onClick={() => toggleGroup(item.id)}
                            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer relative ${
                              isGroupActive
                                ? 'bg-[#002F87] text-white shadow-xs'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                            }`}
                            title={item.label}
                            aria-label={item.label}
                          >
                            {item.icon}
                            {isGroupActive && (
                              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#44B330] ring-2 ring-slate-900" />
                            )}
                          </button>

                          {/* Flyout Submenu on Hover in Collapsed View */}
                          <div className="absolute left-full top-0 ml-2.5 w-60 bg-slate-900 border border-slate-700/90 rounded-xl shadow-2xl p-2.5 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-150 z-50 flex flex-col gap-1">
                            <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-300 border-b border-slate-800 flex items-center justify-between">
                              <span className="text-[#93C5FD]">{item.label}</span>
                              <span className="text-[10px] text-slate-500 font-normal">Section</span>
                            </div>
                            <div className="space-y-0.5 pt-1">
                              {item.children.map(subItem => {
                                const isSubActive = currentTab === subItem.tab;
                                return (
                                  <button
                                    key={subItem.id}
                                    onClick={() => onSelectTab(subItem.tab)}
                                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between cursor-pointer ${
                                      isSubActive
                                        ? 'bg-[#002F87] text-white font-semibold shadow-2xs'
                                        : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                                    }`}
                                  >
                                    <span>{subItem.label}</span>
                                    {isSubActive && <span className="w-1.5 h-1.5 rounded-full bg-[#44B330]" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={item.id} className="pt-2 first:pt-0">
                        <button
                          onClick={() => toggleGroup(item.id)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 font-semibold tracking-wide transition-colors cursor-pointer ${
                            isGroupActive ? 'text-white' : ''
                          }`}
                        >
                          <span className="flex items-center gap-2.5">
                            <span className={isGroupActive ? 'text-[#44B330]' : 'text-slate-400'}>
                              {item.icon}
                            </span>
                            <span>{item.label}</span>
                          </span>
                          {isGroupExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                          )}
                        </button>

                        {isGroupExpanded && (
                          <div className="mt-1 pl-8 space-y-0.5">
                            {item.children.map(subItem => {
                              const isActive = currentTab === subItem.tab;
                              return (
                                <button
                                  key={subItem.id}
                                  onClick={() => {
                                    onSelectTab(subItem.tab);
                                    setMobileMenuOpen(false);
                                  }}
                                  className={`w-full text-left px-3 py-1.5 rounded-md font-medium transition-colors flex items-center justify-between cursor-pointer ${
                                    isActive
                                      ? 'bg-[#002F87] text-white font-semibold shadow-xs'
                                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                                  }`}
                                >
                                  <span>{subItem.label}</span>
                                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#44B330]" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  const isActive = currentTab === item.tab;

                  if (showCollapsedView) {
                    return (
                      <div key={item.id} className="relative group flex justify-center">
                        <button
                          onClick={() => {
                            if (item.tab) {
                              onSelectTab(item.tab);
                            }
                          }}
                          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer relative ${
                            isActive
                              ? 'bg-[#002F87] text-white shadow-xs'
                              : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                          }`}
                          title={item.label}
                          aria-label={item.label}
                        >
                          {item.icon}
                          {item.badge !== undefined && (
                            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                              {item.badge}
                            </span>
                          )}
                        </button>

                        {/* Floating Tooltip in Collapsed View */}
                        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 px-3 py-1.5 bg-slate-900 border border-slate-700/90 text-white text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-150 z-50 flex items-center gap-2">
                          <span>{item.label}</span>
                          {item.badge !== undefined && (
                            <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (item.tab) {
                          onSelectTab(item.tab);
                          setMobileMenuOpen(false);
                        }
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-[#002F87] text-white font-semibold shadow-xs'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <span className={isActive ? 'text-[#44B330]' : 'text-slate-400'}>{item.icon}</span>
                        <span>{item.label}</span>
                      </span>
                      {item.badge !== undefined && (
                        <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Sidebar Footer Info */}
              {showCollapsedView ? (
                <div className="p-3 border-t border-slate-800 shrink-0 bg-slate-950/40 flex items-center justify-center">
                  <div 
                    className="w-2.5 h-2.5 rounded-full bg-[#44B330] ring-2 ring-slate-800" 
                    title="Database: Connected · Base Currency: PHP" 
                  />
                </div>
              ) : (
                <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400 space-y-1.5 shrink-0 bg-slate-950/40">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Database Engine</span>
                    <span className="text-[#44B330] font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#44B330]"></span>
                      Connected
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Currency Base</span>
                    <span className="text-slate-200 font-mono font-medium">PHP (₱)</span>
                  </div>
                </div>
              )}
            </aside>
          );
        })()}

        {/* Content View Area - INDEPENDENT SCROLLING CONTAINER
            All pages and dashboard contents scroll inside here smoothly.
            The sidebar and header remain perfectly steady!
        */}
        <main className="flex-1 h-full overflow-y-auto bg-slate-50 flex flex-col min-w-0">
          {/* Breadcrumb banner */}
          <div className="bg-white border-b border-slate-200 px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span>IPI Enterprise</span>
                <span>/</span>
                <span className="capitalize">{currentTab.split('_')[0]}</span>
                <span>/</span>
                <span className="text-slate-700 font-medium capitalize">
                  {currentTab.replace('_', ' ')}
                </span>
              </div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight mt-0.5">
                {getBreadcrumbTitle(currentTab)}
              </h1>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium border border-slate-200">
                Fiscal Year: <strong className="text-slate-900">2026</strong>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#EFF4FC] text-[#002F87] font-medium border border-[#DBE8FC]">
                Weights: 30% Delivery | 30% Quality | 20% Price
              </span>
            </div>
          </div>

          {/* Module Content */}
          <div className="p-4 sm:p-6 lg:p-8 flex-1">{children}</div>
        </main>
      </div>
    </div>
  );
};
