import React, { useState } from 'react';
import { Building2, Plus, Download, ExternalLink, ShieldAlert, Award, Phone, Mail, MapPin } from 'lucide-react';
import { dbService } from '../../services/db';
import { Supplier, SupplierStatus } from '../../types';
import { DataTable, Column } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { SupplierFormModal } from '../../components/suppliers/SupplierFormModal';
import { useAuth } from '../../context/AuthContext';

export const SupplierListPage: React.FC = () => {
  const { hasPermission, currentUser } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => dbService.getSuppliers());
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [supplierToEdit, setSupplierToEdit] = useState<Supplier | null>(null);

  const canManage = hasPermission('MANAGE_SUPPLIERS');

  const filteredData = filterStatus === 'ALL' 
    ? suppliers 
    : suppliers.filter(s => s.status === filterStatus);

  const handleSaveSupplier = async (saved: Supplier) => {
    await dbService.saveSupplier(saved);
    setSuppliers(dbService.getSuppliers());
  };

  const columns: Column<Supplier>[] = [
    {
      key: 'supplierCode',
      header: 'Code',
      sortable: true,
      className: 'font-mono text-xs text-slate-500 w-24',
    },
    {
      key: 'supplierName',
      header: 'Supplier / Vendor',
      sortable: true,
      render: (s) => (
        <div>
          <button
            onClick={() => setSelectedSupplier(s)}
            className="font-semibold text-slate-900 hover:text-[#002F87] transition-colors text-left block"
          >
            {s.supplierName}
          </button>
          <span className="text-[11px] text-slate-400 block">{s.category} • {s.supplierType}</span>
        </div>
      ),
    },
    {
      key: 'region',
      header: 'Location',
      render: (s) => (
        <span className="text-slate-600 text-xs">
          {s.region}, {s.country}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (s) => {
        const variants: Record<SupplierStatus, 'success' | 'danger' | 'warning' | 'neutral'> = {
          ACTIVE: 'success',
          INACTIVE: 'neutral',
          PROBATION: 'warning',
          SUSPENDED: 'danger',
        };
        return <Badge variant={variants[s.status]}>{s.status}</Badge>;
      },
    },
    {
      key: 'overallScore',
      header: 'Overall Score',
      sortable: true,
      align: 'center',
      render: (s) => (
        <div className="inline-flex flex-col items-center">
          <Badge
            variant={
              s.overallScore >= 90 ? 'success' :
              s.overallScore >= 80 ? 'primary' :
              s.overallScore >= 70 ? 'neutral' : 'danger'
            }
          >
            {s.overallScore} / 100
          </Badge>
          <span className="text-[10px] text-slate-400 mt-0.5">{s.ratingTier}</span>
        </div>
      ),
    },
    {
      key: 'deliveryScore',
      header: 'OTD %',
      sortable: true,
      align: 'right',
      render: (s) => (
        <span className={`font-semibold font-tabular-nums ${s.deliveryScore >= 90 ? 'text-emerald-600' : 'text-slate-700'}`}>
          {s.deliveryScore}%
        </span>
      ),
    },
    {
      key: 'qualityScore',
      header: 'Quality %',
      sortable: true,
      align: 'right',
      render: (s) => (
        <span className={`font-semibold font-tabular-nums ${s.qualityScore >= 90 ? 'text-emerald-600' : 'text-slate-700'}`}>
          {s.qualityScore}%
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (s) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSelectedSupplier(s)}
            icon={<ExternalLink className="w-3 h-3" />}
          >
            Profile
          </Button>
          {canManage && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSupplierToEdit(s);
                setIsFormModalOpen(true);
              }}
            >
              Edit
            </Button>
          )}
        </div>
      ),
    },
  ];

  const handleExportCSV = () => {
    const headers = ['Code', 'Name', 'Category', 'Status', 'Overall Score', 'Rating', 'Delivery %', 'Quality %', 'Spend PHP'];
    const rows = filteredData.map(s => [
      s.supplierCode,
      `"${s.supplierName}"`,
      `"${s.category}"`,
      s.status,
      s.overallScore,
      s.ratingTier,
      s.deliveryScore,
      s.qualityScore,
      s.totalSpend
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `suppliers_master_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#002F87]/20 focus:border-[#002F87] shadow-2xs"
          >
            <option value="ALL">All Statuses ({suppliers.length})</option>
            <option value="ACTIVE">Active ({suppliers.filter(s => s.status === 'ACTIVE').length})</option>
            <option value="PROBATION">Probation ({suppliers.filter(s => s.status === 'PROBATION').length})</option>
            <option value="INACTIVE">Inactive ({suppliers.filter(s => s.status === 'INACTIVE').length})</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            icon={<Download className="w-3.5 h-3.5" />}
          >
            Export Directory
          </Button>
          {canManage && (
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => {
                setSupplierToEdit(null);
                setIsFormModalOpen(true);
              }}
            >
              Add Supplier
            </Button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <DataTable
        data={filteredData}
        columns={columns}
        searchPlaceholder="Search suppliers by name, code, contact or category..."
        searchableKey={(s) => `${s.supplierName} ${s.supplierCode} ${s.category} ${s.contactPerson}`}
        pageSize={10}
      />

      {/* Supplier Profile Modal */}
      {selectedSupplier && (
        <Modal
          isOpen={!!selectedSupplier}
          onClose={() => setSelectedSupplier(null)}
          title={selectedSupplier.supplierName}
          subtitle={`Supplier Code: ${selectedSupplier.supplierCode} • ${selectedSupplier.category}`}
          maxWidth="2xl"
        >
          <div className="space-y-6 text-xs text-slate-700">
            {/* Top Scorecard Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="text-center">
                <span className="text-slate-400 text-[10px] uppercase font-semibold block">Composite Score</span>
                <span className="text-2xl font-bold text-slate-900 mt-1 block">{selectedSupplier.overallScore}</span>
                <Badge variant={selectedSupplier.overallScore >= 80 ? 'success' : 'warning'} size="sm" className="mt-1">
                  {selectedSupplier.ratingTier}
                </Badge>
              </div>
              <div className="text-center">
                <span className="text-slate-400 text-[10px] uppercase font-semibold block">Delivery OTD</span>
                <span className="text-xl font-bold text-slate-800 mt-1 block">{selectedSupplier.deliveryScore}%</span>
                <span className="text-[10px] text-slate-500">Lead: {selectedSupplier.leadTimeDays} days</span>
              </div>
              <div className="text-center">
                <span className="text-slate-400 text-[10px] uppercase font-semibold block">Quality Acceptance</span>
                <span className="text-xl font-bold text-emerald-600 mt-1 block">{selectedSupplier.qualityScore}%</span>
                <span className="text-[10px] text-slate-500">Inspection Pass</span>
              </div>
              <div className="text-center">
                <span className="text-slate-400 text-[10px] uppercase font-semibold block">Total Orders</span>
                <span className="text-xl font-bold text-[#002F87] mt-1 block">{selectedSupplier.totalOrdersCount}</span>
                <span className="text-[10px] text-slate-500">₱{selectedSupplier.totalSpend.toLocaleString()}</span>
              </div>
            </div>

            {/* Profile Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2.5 bg-white p-3.5 rounded-lg border border-slate-100 shadow-2xs">
                <h4 className="font-semibold text-slate-900 text-xs border-b border-slate-100 pb-1">Commercial & Contact Details</h4>
                <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-slate-400" /> <span>{selectedSupplier.email}</span></div>
                <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-400" /> <span>{selectedSupplier.phone}</span></div>
                <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-slate-400" /> <span>{selectedSupplier.address}, {selectedSupplier.region}</span></div>
                <div className="pt-1 text-slate-500">Contact: <strong className="text-slate-800">{selectedSupplier.contactPerson}</strong></div>
              </div>

              <div className="space-y-2.5 bg-white p-3.5 rounded-lg border border-slate-100 shadow-2xs">
                <h4 className="font-semibold text-slate-900 text-xs border-b border-slate-100 pb-1">Contract & Payment Terms</h4>
                <div className="flex justify-between"><span>Payment Terms:</span> <strong className="text-slate-800">{selectedSupplier.paymentTerms}</strong></div>
                <div className="flex justify-between"><span>Contract Effective:</span> <span className="font-mono text-slate-700">{selectedSupplier.contractStartDate}</span></div>
                <div className="flex justify-between"><span>Contract Expiration:</span> <span className="font-mono text-slate-700">{selectedSupplier.contractEndDate}</span></div>
                <div className="flex justify-between"><span>Vendor Classification:</span> <span className="text-slate-800">{selectedSupplier.supplierType}</span></div>
              </div>
            </div>

            {/* Dimensional Score Breakdown */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="font-semibold text-slate-900 text-xs mb-3">Multi-Dimensional Performance Weights</h4>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span>Delivery Reliability (Weight 30%)</span>
                    <strong className="font-tabular-nums">{selectedSupplier.deliveryScore}%</strong>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${selectedSupplier.deliveryScore}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span>Quality Acceptance (Weight 30%)</span>
                    <strong className="font-tabular-nums">{selectedSupplier.qualityScore}%</strong>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${selectedSupplier.qualityScore}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span>Price Competitiveness (Weight 20%)</span>
                    <strong className="font-tabular-nums">{selectedSupplier.priceScore}%</strong>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-600 rounded-full" style={{ width: `${selectedSupplier.priceScore}%` }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedSupplier(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Supplier Create / Edit Form Modal */}
      <SupplierFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSave={handleSaveSupplier}
        supplierToEdit={supplierToEdit}
        existingSuppliers={suppliers}
      />
    </div>
  );
};
