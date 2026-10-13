import React, { useState, useEffect } from 'react';
import { Material, Supplier } from '../../types';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

interface MaterialFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (material: Material) => void | Promise<void>;
  materialToEdit?: Material | null;
  existingMaterials: Material[];
  suppliers: Supplier[];
}

export const MaterialFormModal: React.FC<MaterialFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  materialToEdit,
  existingMaterials,
  suppliers,
}) => {
  const [materialCode, setMaterialCode] = useState('');
  const [materialName, setMaterialName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Chemical Raw Materials');
  const [subcategory, setSubcategory] = useState('Standard Supply');
  const [uom, setUom] = useState('Unit');
  const [standardPrice, setStandardPrice] = useState(1000);
  const [currentPrice, setCurrentPrice] = useState(1000);
  const [preferredSupplierId, setPreferredSupplierId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [minOrderQty, setMinOrderQty] = useState(10);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (materialToEdit) {
      setMaterialCode(materialToEdit.materialCode);
      setMaterialName(materialToEdit.materialName);
      setDescription(materialToEdit.description);
      setCategory(materialToEdit.category);
      setSubcategory(materialToEdit.subcategory);
      setUom(materialToEdit.uom);
      setStandardPrice(materialToEdit.standardPrice);
      setCurrentPrice(materialToEdit.currentPrice);
      setPreferredSupplierId(materialToEdit.preferredSupplierId);
      setIsActive(materialToEdit.isActive);
      setMinOrderQty(materialToEdit.minOrderQty || 10);
    } else {
      const nextNum = existingMaterials.length + 1;
      setMaterialCode(`MAT-${String(nextNum).padStart(3, '0')}`);
      setMaterialName('');
      setDescription('');
      setCategory('Chemical Raw Materials');
      setSubcategory('Standard Supply');
      setUom('Unit');
      setStandardPrice(1000);
      setCurrentPrice(1000);
      setPreferredSupplierId(suppliers[0]?.id || '');
      setIsActive(true);
      setMinOrderQty(10);
    }
    setErrorMsg('');
  }, [materialToEdit, existingMaterials, suppliers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialCode.trim() || !materialName.trim()) {
      setErrorMsg('Material Code and Name are required.');
      return;
    }

    if (standardPrice <= 0 || currentPrice <= 0) {
      setErrorMsg('Prices must be positive numeric values.');
      return;
    }

    if (!materialToEdit) {
      const duplicate = existingMaterials.some(
        m => m.materialCode.toUpperCase() === materialCode.trim().toUpperCase()
      );
      if (duplicate) {
        setErrorMsg(`Material code ${materialCode} already exists.`);
        return;
      }
    }

    const preferredSupplier = suppliers.find(s => s.id === preferredSupplierId);
    const variancePct = standardPrice > 0 
      ? Number((((currentPrice - standardPrice) / standardPrice) * 100).toFixed(2)) 
      : 0;

    const payload: Material = {
      id: materialToEdit ? materialToEdit.id : materialCode.trim().toUpperCase(),
      materialCode: materialCode.trim().toUpperCase(),
      materialName: materialName.trim(),
      description: description.trim(),
      category,
      subcategory,
      uom,
      standardPrice,
      currentPrice,
      previousPrice: materialToEdit ? materialToEdit.previousPrice : standardPrice,
      priceChangePct: variancePct,
      currency: 'PHP',
      preferredSupplierId,
      preferredSupplierName: preferredSupplier ? preferredSupplier.supplierName : 'Unassigned',
      isActive,
      minOrderQty,
      createdAt: materialToEdit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await onSave(payload);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not save. Please try again.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={materialToEdit ? `Edit Material: ${materialToEdit.materialName}` : 'Add New Material to Master'}
      subtitle="Define material item specifications, benchmark standard prices, and preferred vendor linkage."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs text-slate-700">
        {errorMsg && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-medium">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-slate-800 block mb-1">Material SKU / Code *</label>
            <input
              type="text"
              value={materialCode}
              disabled={!!materialToEdit}
              onChange={e => setMaterialCode(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-xs focus:bg-white focus:ring-2 focus:ring-[#002F87]/20 focus:border-[#002F87] focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-800 block mb-1">Material / Item Name *</label>
            <input
              type="text"
              value={materialName}
              placeholder="e.g. Amber Glass Bottle 120ml"
              onChange={e => setMaterialName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white focus:ring-2 focus:ring-[#002F87]/20 focus:border-[#002F87] focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="font-semibold text-slate-800 block mb-1">Item Specification & Description</label>
            <input
              type="text"
              value={description}
              placeholder="Detailed grade, chemical purity, or physical dimensions"
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white focus:ring-2 focus:ring-[#002F87]/20 focus:border-[#002F87] focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-800 block mb-1">Primary Category</label>
            <input
              type="text"
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white focus:ring-2 focus:ring-[#002F87]/20 focus:border-[#002F87] focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-800 block mb-1">Unit of Measure (UOM)</label>
            <input
              type="text"
              value={uom}
              placeholder="e.g. Drum (200L), Carton (144 pcs), kg"
              onChange={e => setUom(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white focus:ring-2 focus:ring-[#002F87]/20 focus:border-[#002F87] focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-800 block mb-1">Standard Benchmark Price (PHP) *</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={standardPrice}
              onChange={e => setStandardPrice(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-xs focus:bg-white focus:ring-2 focus:ring-[#002F87]/20 focus:border-[#002F87] focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-800 block mb-1">Current Active Price (PHP) *</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={currentPrice}
              onChange={e => setCurrentPrice(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-xs focus:bg-white focus:ring-2 focus:ring-[#002F87]/20 focus:border-[#002F87] focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="font-semibold text-slate-800 block mb-1">Designated Preferred Supplier</label>
            <select
              value={preferredSupplierId}
              onChange={e => setPreferredSupplierId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-[#002F87]/20 focus:border-[#002F87] focus:outline-none"
            >
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>
                  {s.supplierName} ({s.supplierCode} • {s.category})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <Button variant="outline" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit">
            {materialToEdit ? 'Save Changes' : 'Register Material'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
