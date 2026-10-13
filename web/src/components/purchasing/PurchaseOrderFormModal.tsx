import React, { useState, useEffect } from 'react';
import { PurchaseTransaction, DeliveryStatus, QualityStatus } from '../../types';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { dbService } from '../../services/db';

interface PurchaseOrderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: PurchaseTransaction) => void | Promise<void>;
  transactionToEdit?: PurchaseTransaction | null;
}

export const PurchaseOrderFormModal: React.FC<PurchaseOrderFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  transactionToEdit,
}) => {
  const suppliers = dbService.getSuppliers();
  const materials = dbService.getMaterials();

  const [poNumber, setPoNumber] = useState('');
  const [poDate, setPoDate] = useState(new Date().toISOString().split('T')[0]);
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || '');
  const [materialId, setMaterialId] = useState(materials[0]?.id || '');
  const [quantity, setQuantity] = useState(10);
  const [unitPrice, setUnitPrice] = useState(1000);
  const [currency] = useState('PHP');
  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );
  const [actualDeliveryDate, setActualDeliveryDate] = useState<string>('');
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatus>('ON_TIME');
  const [receivedQuantity, setReceivedQuantity] = useState(10);
  const [acceptedQuantity, setAcceptedQuantity] = useState(10);
  const [rejectedQuantity, setRejectedQuantity] = useState(0);
  const [qualityStatus, setQualityStatus] = useState<QualityStatus>('ACCEPTED');
  const [buyerStaff, setBuyerStaff] = useState('Chloe Delgado (Analyst)');
  const [remarks, setRemarks] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Auto-fill material price and supplier when material changes
  const handleMaterialChange = (newMatId: string) => {
    setMaterialId(newMatId);
    const selectedMat = materials.find(m => m.id === newMatId);
    if (selectedMat) {
      setUnitPrice(selectedMat.currentPrice);
      if (selectedMat.preferredSupplierId) {
        setSupplierId(selectedMat.preferredSupplierId);
      }
    }
  };

  useEffect(() => {
    if (transactionToEdit) {
      setPoNumber(transactionToEdit.poNumber);
      setPoDate(transactionToEdit.poDate);
      setSupplierId(transactionToEdit.supplierId);
      setMaterialId(transactionToEdit.materialId);
      setQuantity(transactionToEdit.quantity);
      setUnitPrice(transactionToEdit.unitPrice);
      setRequestedDeliveryDate(transactionToEdit.requestedDeliveryDate);
      setActualDeliveryDate(transactionToEdit.actualDeliveryDate || '');
      setDeliveryStatus(transactionToEdit.deliveryStatus);
      setReceivedQuantity(transactionToEdit.receivedQuantity);
      setAcceptedQuantity(transactionToEdit.acceptedQuantity);
      setRejectedQuantity(transactionToEdit.rejectedQuantity);
      setQualityStatus(transactionToEdit.qualityStatus);
      setBuyerStaff(transactionToEdit.buyerStaff);
      setRemarks(transactionToEdit.remarks || '');
    } else {
      const nextNum = dbService.getPurchases().length + 1;
      setPoNumber(`PO-2026-${String(nextNum).padStart(4, '0')}`);
      setPoDate(new Date().toISOString().split('T')[0]);
      if (materials.length > 0) {
        handleMaterialChange(materials[0].id);
      }
      setQuantity(10);
      setReceivedQuantity(10);
      setAcceptedQuantity(10);
      setRejectedQuantity(0);
      setDeliveryStatus('ON_TIME');
      setQualityStatus('ACCEPTED');
      setActualDeliveryDate(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
      setRemarks('Delivered within specifications.');
    }
    setErrorMsg('');
  }, [transactionToEdit, isOpen]);

  // Synchronize QC quantities
  const handleReceivedChange = (val: number) => {
    setReceivedQuantity(val);
    setAcceptedQuantity(Math.max(0, val - rejectedQuantity));
  };

  const handleRejectedChange = (val: number) => {
    setRejectedQuantity(val);
    setAcceptedQuantity(Math.max(0, receivedQuantity - val));
    if (val > 0) {
      setQualityStatus(val >= receivedQuantity ? 'REJECTED' : 'PARTIAL');
    } else {
      setQualityStatus('ACCEPTED');
    }
  };

  const computedTotal = Number((quantity * unitPrice).toFixed(2));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poNumber.trim()) {
      setErrorMsg('Purchase Order number is required.');
      return;
    }

    if (quantity <= 0 || unitPrice <= 0) {
      setErrorMsg('Quantity and Unit Price must be positive values.');
      return;
    }

    const selectedSupplier = suppliers.find(s => s.id === supplierId);
    const selectedMaterial = materials.find(m => m.id === materialId);

    if (!selectedSupplier || !selectedMaterial) {
      setErrorMsg('Valid supplier and material selections are required.');
      return;
    }

    // Delay days calculation
    let delayDays = 0;
    if (actualDeliveryDate && requestedDeliveryDate) {
      const diffMs = new Date(actualDeliveryDate).getTime() - new Date(requestedDeliveryDate).getTime();
      delayDays = Math.max(0, Math.ceil(diffMs / 86400000));
    }

    const rejectionRate = receivedQuantity > 0 
      ? Number(((rejectedQuantity / receivedQuantity) * 100).toFixed(2)) 
      : 0;

    const payload: PurchaseTransaction = {
      id: transactionToEdit ? transactionToEdit.id : `TX-${Date.now()}`,
      poNumber: poNumber.trim().toUpperCase(),
      poDate,
      supplierId,
      supplierName: selectedSupplier.supplierName,
      materialId,
      materialCode: selectedMaterial.materialCode,
      materialName: selectedMaterial.materialName,
      quantity,
      unitPrice,
      currency,
      totalAmount: computedTotal,
      requestedDeliveryDate,
      actualDeliveryDate: actualDeliveryDate || null,
      deliveryStatus,
      delayDays,
      qualityStatus,
      receivedQuantity,
      acceptedQuantity,
      rejectedQuantity,
      rejectionRate,
      buyerStaff,
      receivingDate: actualDeliveryDate || null,
      remarks: remarks.trim(),
      createdAt: transactionToEdit?.createdAt || new Date().toISOString(),
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
      title={transactionToEdit ? `Edit Purchase Order: ${transactionToEdit.poNumber}` : 'Record New Purchase Order Transaction'}
      subtitle="Input purchase order, line item, receiving delivery dates, and QC acceptance."
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs text-slate-700">
        {errorMsg && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-medium">
            {errorMsg}
          </div>
        )}

        {/* Section 1: Order Details */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
          <h4 className="font-semibold text-slate-900 text-xs">1. Order Header & Line Item</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-slate-800 block mb-1">PO Number *</label>
              <input
                type="text"
                value={poNumber}
                disabled={!!transactionToEdit}
                onChange={e => setPoNumber(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono text-xs focus:ring-2 focus:ring-[#002F87]/20 focus:border-[#002F87] focus:outline-none"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1">PO Date</label>
              <input
                type="date"
                value={poDate}
                onChange={e => setPoDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-[#002F87]/20 focus:border-[#002F87] focus:outline-none"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1">Buyer / Staff</label>
              <input
                type="text"
                value={buyerStaff}
                onChange={e => setBuyerStaff(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-[#002F87]/20 focus:border-[#002F87] focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="font-semibold text-slate-800 block mb-1">Material Item *</label>
              <select
                value={materialId}
                onChange={e => handleMaterialChange(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-[#002F87]/20 focus:border-[#002F87] focus:outline-none"
              >
                {materials.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.materialName} ({m.materialCode} • {m.uom})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1">Supplier *</label>
              <select
                value={supplierId}
                onChange={e => setSupplierId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-[#002F87]/20 focus:border-[#002F87] focus:outline-none"
              >
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.supplierName} ({s.supplierCode})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1">Quantity *</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={e => {
                  const q = Number(e.target.value);
                  setQuantity(q);
                  setReceivedQuantity(q);
                  setAcceptedQuantity(q);
                }}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-mono focus:ring-2 focus:ring-[#002F87]/20 focus:border-[#002F87] focus:outline-none"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1">Unit Price (PHP) *</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={unitPrice}
                onChange={e => setUnitPrice(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-mono focus:ring-2 focus:ring-[#002F87]/20 focus:border-[#002F87] focus:outline-none"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1">Calculated Total Spend</label>
              <div className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2 text-xs font-mono font-bold text-slate-900">
                ₱{computedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Delivery & QC Tracking */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
          <h4 className="font-semibold text-slate-900 text-xs">2. Delivery SLA & Receiving QC Inspection</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-slate-800 block mb-1">Target Delivery Date</label>
              <input
                type="date"
                value={requestedDeliveryDate}
                onChange={e => setRequestedDeliveryDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-[#002F87]/20 focus:border-[#002F87] focus:outline-none"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1">Actual Receiving Date</label>
              <input
                type="date"
                value={actualDeliveryDate}
                onChange={e => setActualDeliveryDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-[#002F87]/20 focus:border-[#002F87] focus:outline-none"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1">Delivery Status SLA</label>
              <select
                value={deliveryStatus}
                onChange={e => setDeliveryStatus(e.target.value as DeliveryStatus)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-[#002F87]/20 focus:border-[#002F87] focus:outline-none"
              >
                <option value="ON_TIME">On-Time</option>
                <option value="DELAYED">Delayed</option>
                <option value="EARLY">Early</option>
                <option value="PENDING">Pending Delivery</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1">Received Quantity</label>
              <input
                type="number"
                min="0"
                value={receivedQuantity}
                onChange={e => handleReceivedChange(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-mono focus:ring-2 focus:ring-[#002F87]/20 focus:border-[#002F87] focus:outline-none"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1">Accepted Qty (Passed)</label>
              <input
                type="number"
                min="0"
                value={acceptedQuantity}
                onChange={e => setAcceptedQuantity(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-mono text-emerald-700 font-bold focus:ring-2 focus:ring-[#002F87]/20 focus:border-[#002F87] focus:outline-none"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1">Rejected Qty (Failed QC)</label>
              <input
                type="number"
                min="0"
                value={rejectedQuantity}
                onChange={e => handleRejectedChange(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-mono text-rose-700 font-bold focus:ring-2 focus:ring-[#002F87]/20 focus:border-[#002F87] focus:outline-none"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="font-semibold text-slate-800 block mb-1">Receiving Remarks & Notes</label>
              <input
                type="text"
                value={remarks}
                placeholder="Transit condition, certificate of analysis verification, batch lot numbers"
                onChange={e => setRemarks(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-[#002F87]/20 focus:border-[#002F87] focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Button variant="outline" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit">
            {transactionToEdit ? 'Save Changes' : 'Commit Purchase Order'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
