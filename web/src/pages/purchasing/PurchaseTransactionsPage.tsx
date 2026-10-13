import React, { useState } from 'react';
import { ShoppingCart, Download, CheckCircle, Clock, AlertTriangle, Plus, Edit } from 'lucide-react';
import { dbService } from '../../services/db';
import { PurchaseTransaction, DeliveryStatus, QualityStatus } from '../../types';
import { DataTable, Column } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { PurchaseOrderFormModal } from '../../components/purchasing/PurchaseOrderFormModal';
import { useAuth } from '../../context/AuthContext';

export const PurchaseTransactionsPage: React.FC = () => {
  const { hasPermission, currentUser } = useAuth();
  const [purchases, setPurchases] = useState<PurchaseTransaction[]>(() => dbService.getPurchases());
  const [filterDelivery, setFilterDelivery] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [txToEdit, setTxToEdit] = useState<PurchaseTransaction | null>(null);

  const canManage = hasPermission('MANAGE_PURCHASES');

  const filteredData = filterDelivery === 'ALL'
    ? purchases
    : purchases.filter(p => p.deliveryStatus === filterDelivery);

  const handleSaveTx = async (saved: PurchaseTransaction) => {
    await dbService.savePurchase(saved);
    setPurchases(dbService.getPurchases());
  };

  const columns: Column<PurchaseTransaction>[] = [
    {
      key: 'poNumber',
      header: 'PO Number',
      sortable: true,
      className: 'font-mono text-xs font-semibold text-slate-800 w-28',
    },
    {
      key: 'poDate',
      header: 'Date',
      sortable: true,
      className: 'font-mono text-xs text-slate-500 w-24',
    },
    {
      key: 'supplierName',
      header: 'Supplier',
      sortable: true,
      render: (p) => (
        <span className="font-semibold text-slate-900 text-xs block truncate max-w-[180px]">
          {p.supplierName}
        </span>
      ),
    },
    {
      key: 'materialName',
      header: 'Material Purchased',
      sortable: true,
      render: (p) => (
        <div>
          <span className="text-slate-800 text-xs font-medium block truncate max-w-[200px]">
            {p.materialName}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">{p.materialCode}</span>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Qty',
      sortable: true,
      align: 'right',
      render: (p) => (
        <span className="font-mono text-xs text-slate-800 font-tabular-nums">
          {p.quantity.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'unitPrice',
      header: 'Unit Price',
      sortable: true,
      align: 'right',
      render: (p) => (
        <span className="font-mono text-xs text-slate-600 font-tabular-nums">
          ₱{p.unitPrice.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'totalAmount',
      header: 'Total Spend',
      sortable: true,
      align: 'right',
      render: (p) => (
        <span className="font-mono text-xs font-bold text-slate-900 font-tabular-nums">
          ₱{p.totalAmount.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'deliveryStatus',
      header: 'Delivery SLA',
      sortable: true,
      align: 'center',
      render: (p) => {
        if (p.deliveryStatus === 'ON_TIME') {
          return <Badge variant="success" size="sm">On-Time</Badge>;
        }
        if (p.deliveryStatus === 'DELAYED') {
          return <Badge variant="danger" size="sm">+{p.delayDays}d Late</Badge>;
        }
        return <Badge variant="neutral" size="sm">{p.deliveryStatus}</Badge>;
      },
    },
    {
      key: 'qualityStatus',
      header: 'QC Inspection',
      sortable: true,
      align: 'center',
      render: (p) => {
        if (p.qualityStatus === 'ACCEPTED') {
          return <Badge variant="success" size="sm">100% Pass</Badge>;
        }
        if (p.qualityStatus === 'PARTIAL') {
          return <Badge variant="warning" size="sm">{p.rejectionRate}% Reject</Badge>;
        }
        return <Badge variant="danger" size="sm">Rejected</Badge>;
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (p) => (
        <div className="flex items-center justify-end">
          {canManage && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setTxToEdit(p);
                setIsModalOpen(true);
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
    const headers = ['PO Number', 'PO Date', 'Supplier', 'Material Code', 'Material Name', 'Quantity', 'Unit Price PHP', 'Total Spend PHP', 'Delivery Status', 'Delay Days', 'Quality Status', 'Rejection Rate %', 'Staff'];
    const rows = filteredData.map(p => [
      p.poNumber,
      p.poDate,
      `"${p.supplierName}"`,
      p.materialCode,
      `"${p.materialName}"`,
      p.quantity,
      p.unitPrice,
      p.totalAmount,
      p.deliveryStatus,
      p.delayDays,
      p.qualityStatus,
      p.rejectionRate,
      `"${p.buyerStaff}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `purchase_orders_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <select
            value={filterDelivery}
            onChange={e => setFilterDelivery(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#002F87]/20 focus:border-[#002F87] shadow-2xs"
          >
            <option value="ALL">All Deliveries ({purchases.length})</option>
            <option value="ON_TIME">On-Time Only ({purchases.filter(p => p.deliveryStatus === 'ON_TIME').length})</option>
            <option value="DELAYED">Delayed Deliveries ({purchases.filter(p => p.deliveryStatus === 'DELAYED').length})</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            icon={<Download className="w-3.5 h-3.5" />}
          >
            Export PO Records
          </Button>
          {canManage && (
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => {
                setTxToEdit(null);
                setIsModalOpen(true);
              }}
            >
              New Purchase Order
            </Button>
          )}
        </div>
      </div>

      <DataTable
        data={filteredData}
        columns={columns}
        searchPlaceholder="Search POs by number, supplier, material, or staff..."
        searchableKey={(p) => `${p.poNumber} ${p.supplierName} ${p.materialName} ${p.buyerStaff}`}
        pageSize={12}
      />

      <PurchaseOrderFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTx}
        transactionToEdit={txToEdit}
      />
    </div>
  );
};
