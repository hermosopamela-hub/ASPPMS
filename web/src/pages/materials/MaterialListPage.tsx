import React, { useState, useMemo } from 'react';
import { Package, Download, Plus, ArrowUpRight, ArrowDownRight, Minus, Filter } from 'lucide-react';
import { dbService } from '../../services/db';
import { Material } from '../../types';
import { DataTable, Column } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { MaterialFormModal } from '../../components/materials/MaterialFormModal';
import { useAuth } from '../../context/AuthContext';

export const MaterialListPage: React.FC = () => {
  const { hasPermission, currentUser } = useAuth();
  const [materials, setMaterials] = useState<Material[]>(() => dbService.getMaterials());
  const [suppliers] = useState(() => dbService.getSuppliers());
  const [selectedCat, setSelectedCat] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [materialToEdit, setMaterialToEdit] = useState<Material | null>(null);

  const canManage = hasPermission('MANAGE_MATERIALS');

  const handleSaveMaterial = async (saved: Material) => {
    await dbService.saveMaterial(saved);
    setMaterials(dbService.getMaterials());
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    materials.forEach(m => set.add(m.category));
    return Array.from(set);
  }, [materials]);

  const filteredMaterials = useMemo(() => {
    if (selectedCat === 'ALL') return materials;
    return materials.filter(m => m.category === selectedCat);
  }, [materials, selectedCat]);

  const columns: Column<Material>[] = [
    {
      key: 'materialCode',
      header: 'Code',
      sortable: true,
      className: 'font-mono text-xs text-slate-500 w-24',
    },
    {
      key: 'materialName',
      header: 'Material / Specification',
      sortable: true,
      render: (m) => (
        <div>
          <span className="font-semibold text-slate-900 block">{m.materialName}</span>
          <span className="text-[11px] text-slate-400 block">{m.category} • {m.uom}</span>
        </div>
      ),
    },
    {
      key: 'preferredSupplierName',
      header: 'Preferred Supplier',
      sortable: true,
      render: (m) => (
        <span className="text-slate-700 text-xs font-medium">
          {m.preferredSupplierName}
        </span>
      ),
    },
    {
      key: 'standardPrice',
      header: 'Benchmark Price',
      sortable: true,
      align: 'right',
      render: (m) => (
        <span className="font-mono text-xs text-slate-500 font-tabular-nums">
          ₱{m.standardPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'currentPrice',
      header: 'Current Price',
      sortable: true,
      align: 'right',
      render: (m) => (
        <span className="font-mono text-xs font-semibold text-slate-900 font-tabular-nums">
          ₱{m.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'priceChangePct',
      header: 'Variance %',
      sortable: true,
      align: 'right',
      render: (m) => {
        const isUp = m.priceChangePct > 0;
        const isDown = m.priceChangePct < 0;
        return (
          <div className="inline-flex items-center gap-1 font-semibold text-xs font-tabular-nums">
            {isUp && (
              <span className="text-rose-600 flex items-center">
                <ArrowUpRight className="w-3.5 h-3.5" /> +{m.priceChangePct}%
              </span>
            )}
            {isDown && (
              <span className="text-emerald-600 flex items-center">
                <ArrowDownRight className="w-3.5 h-3.5" /> {m.priceChangePct}%
              </span>
            )}
            {!isUp && !isDown && (
              <span className="text-slate-400 flex items-center">
                <Minus className="w-3.5 h-3.5" /> 0.0%
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Category Tier',
      render: (m) => {
        const isSignificantHike = m.priceChangePct >= 10.0;
        const isModerateHike = m.priceChangePct >= 3.0 && m.priceChangePct < 10.0;
        const isFavorableDrop = m.priceChangePct <= -3.0;

        if (isSignificantHike) {
          return <Badge variant="danger" size="sm">High Alert (+{m.priceChangePct}%)</Badge>;
        }
        if (isModerateHike) {
          return <Badge variant="warning" size="sm">Moderate Increase</Badge>;
        }
        if (isFavorableDrop) {
          return <Badge variant="success" size="sm">Savings ({m.priceChangePct}%)</Badge>;
        }
        return <Badge variant="neutral" size="sm">Stable</Badge>;
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (m) => (
        <div className="flex items-center justify-end gap-1.5">
          {canManage && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setMaterialToEdit(m);
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
    const headers = ['Material Code', 'Material Name', 'Category', 'UOM', 'Benchmark Standard (PHP)', 'Current Price (PHP)', 'Variance %', 'Preferred Supplier'];
    const rows = filteredMaterials.map(m => [
      m.materialCode,
      `"${m.materialName}"`,
      `"${m.category}"`,
      m.uom,
      m.standardPrice,
      m.currentPrice,
      m.priceChangePct,
      `"${m.preferredSupplierName}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `material_master_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedCat}
            onChange={e => setSelectedCat(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#002F87]/20 focus:border-[#002F87] shadow-2xs"
          >
            <option value="ALL">All Categories ({materials.length})</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            icon={<Download className="w-3.5 h-3.5" />}
          >
            Export Catalog
          </Button>
          {canManage && (
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => {
                setMaterialToEdit(null);
                setIsModalOpen(true);
              }}
            >
              Add Material
            </Button>
          )}
        </div>
      </div>

      <DataTable
        data={filteredMaterials}
        columns={columns}
        searchPlaceholder="Search materials by name, SKU, specification or supplier..."
        searchableKey={(m) => `${m.materialName} ${m.materialCode} ${m.category} ${m.preferredSupplierName}`}
        pageSize={12}
      />

      <MaterialFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveMaterial}
        materialToEdit={materialToEdit}
        existingMaterials={materials}
        suppliers={suppliers}
      />
    </div>
  );
};
