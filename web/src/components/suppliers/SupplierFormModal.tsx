import React, { useState, useEffect } from 'react';
import { Supplier, SupplierStatus } from '../../types';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

interface SupplierFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (supplier: Supplier) => void | Promise<void>;
  supplierToEdit?: Supplier | null;
  existingSuppliers: Supplier[];
}

export const SupplierFormModal: React.FC<SupplierFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  supplierToEdit,
  existingSuppliers,
}) => {
  const [supplierCode, setSupplierCode] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierType, setSupplierType] = useState<Supplier['supplierType']>('Manufacturer');
  const [category, setCategory] = useState('Chemical Raw Materials');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState('Philippines');
  const [region, setRegion] = useState('Central Visayas');
  const [status, setStatus] = useState<SupplierStatus>('ACTIVE');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [leadTimeDays, setLeadTimeDays] = useState(7);
  const [contractStartDate, setContractStartDate] = useState('2026-01-01');
  const [contractEndDate, setContractEndDate] = useState('2027-12-31');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (supplierToEdit) {
      setSupplierCode(supplierToEdit.supplierCode);
      setSupplierName(supplierToEdit.supplierName);
      setSupplierType(supplierToEdit.supplierType);
      setCategory(supplierToEdit.category);
      setContactPerson(supplierToEdit.contactPerson);
      setEmail(supplierToEdit.email);
      setPhone(supplierToEdit.phone);
      setAddress(supplierToEdit.address);
      setCountry(supplierToEdit.country);
      setRegion(supplierToEdit.region);
      setStatus(supplierToEdit.status);
      setPaymentTerms(supplierToEdit.paymentTerms);
      setLeadTimeDays(supplierToEdit.leadTimeDays);
      setContractStartDate(supplierToEdit.contractStartDate);
      setContractEndDate(supplierToEdit.contractEndDate);
    } else {
      const nextNum = existingSuppliers.length + 1;
      setSupplierCode(`SUP-${String(nextNum).padStart(3, '0')}`);
      setSupplierName('');
      setSupplierType('Manufacturer');
      setCategory('Chemical Raw Materials');
      setContactPerson('');
      setEmail('');
      setPhone('');
      setAddress('');
      setCountry('Philippines');
      setRegion('Central Visayas');
      setStatus('ACTIVE');
      setPaymentTerms('Net 30');
      setLeadTimeDays(7);
      setContractStartDate('2026-01-01');
      setContractEndDate('2027-12-31');
    }
    setErrorMsg('');
  }, [supplierToEdit, existingSuppliers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierCode.trim() || !supplierName.trim()) {
      setErrorMsg('Supplier Code and Supplier Name are required.');
      return;
    }

    if (!supplierToEdit) {
      const duplicateCode = existingSuppliers.some(
        s => s.supplierCode.toUpperCase() === supplierCode.trim().toUpperCase()
      );
      if (duplicateCode) {
        setErrorMsg(`Supplier code ${supplierCode} is already registered.`);
        return;
      }
    }

    const payload: Supplier = {
      id: supplierToEdit ? supplierToEdit.id : supplierCode.trim().toUpperCase(),
      supplierCode: supplierCode.trim().toUpperCase(),
      supplierName: supplierName.trim(),
      supplierType,
      category,
      contactPerson: contactPerson.trim(),
      email: email.trim(),
      phone: phone.trim(),
      address: address.trim(),
      country,
      region,
      status,
      paymentTerms,
      leadTimeDays: Math.max(1, leadTimeDays),
      contractStartDate,
      contractEndDate,
      overallScore: supplierToEdit ? supplierToEdit.overallScore : 85.0,
      ratingTier: supplierToEdit ? supplierToEdit.ratingTier : 'GOOD',
      deliveryScore: supplierToEdit ? supplierToEdit.deliveryScore : 85.0,
      qualityScore: supplierToEdit ? supplierToEdit.qualityScore : 90.0,
      priceScore: supplierToEdit ? supplierToEdit.priceScore : 85.0,
      responsivenessScore: supplierToEdit ? supplierToEdit.responsivenessScore : 85.0,
      complianceScore: supplierToEdit ? supplierToEdit.complianceScore : 90.0,
      totalOrdersCount: supplierToEdit ? supplierToEdit.totalOrdersCount : 0,
      totalSpend: supplierToEdit ? supplierToEdit.totalSpend : 0,
      createdAt: supplierToEdit?.createdAt || new Date().toISOString(),
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
      title={supplierToEdit ? `Edit Supplier: ${supplierToEdit.supplierName}` : 'Add New Supplier to Master'}
      subtitle="Complete supplier profile, contractual parameters, and commercial lead times."
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs text-slate-700">
        {errorMsg && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-medium">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-slate-800 block mb-1">Supplier Code *</label>
            <input
              type="text"
              value={supplierCode}
              disabled={!!supplierToEdit}
              onChange={e => setSupplierCode(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-xs focus:bg-white focus:ring-2 focus:ring-[#002F87]/20 focus:border-[#002F87] focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-800 block mb-1">Company / Supplier Name *</label>
            <input
              type="text"
              value={supplierName}
              placeholder="e.g. Apex Chemical Solutions Inc."
              onChange={e => setSupplierName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white focus:ring-2 focus:ring-[#002F87]/20 focus:border-[#002F87] focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-800 block mb-1">Supplier Type</label>
            <select
              value={supplierType}
              onChange={e => setSupplierType(e.target.value as Supplier['supplierType'])}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-[#002F87]/20 focus:border-[#002F87] focus:outline-none"
            >
              <option value="Manufacturer">Manufacturer</option>
              <option value="Distributor">Distributor</option>
              <option value="Importer">Importer</option>
              <option value="Service Provider">Service Provider</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-800 block mb-1">Primary Category</label>
            <input
              type="text"
              value={category}
              placeholder="e.g. Chemical Raw Materials"
              onChange={e => setCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white focus:ring-2 focus:ring-[#002F87]/20 focus:border-[#002F87] focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-800 block mb-1">Contact Person</label>
            <input
              type="text"
              value={contactPerson}
              placeholder="e.g. David Soriano"
              onChange={e => setContactPerson(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white focus:ring-2 focus:ring-[#002F87]/20 focus:border-[#002F87] focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-800 block mb-1">Email</label>
            <input
              type="email"
              value={email}
              placeholder="sales@vendor.com"
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white focus:ring-2 focus:ring-[#002F87]/20 focus:border-[#002F87] focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-800 block mb-1">Telephone</label>
            <input
              type="text"
              value={phone}
              placeholder="+63 32 415 8890"
              onChange={e => setPhone(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white focus:ring-2 focus:ring-[#002F87]/20 focus:border-[#002F87] focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-800 block mb-1">Region / Province</label>
            <input
              type="text"
              value={region}
              placeholder="e.g. Central Visayas"
              onChange={e => setRegion(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white focus:ring-2 focus:ring-[#002F87]/20 focus:border-[#002F87] focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="font-semibold text-slate-800 block mb-1">Physical Address</label>
            <input
              type="text"
              value={address}
              placeholder="Facility address or plant location"
              onChange={e => setAddress(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white focus:ring-2 focus:ring-[#002F87]/20 focus:border-[#002F87] focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-800 block mb-1">Payment Terms</label>
            <select
              value={paymentTerms}
              onChange={e => setPaymentTerms(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-[#002F87]/20 focus:border-[#002F87] focus:outline-none"
            >
              <option value="Net 15">Net 15 Days</option>
              <option value="Net 30">Net 30 Days</option>
              <option value="Net 45">Net 45 Days</option>
              <option value="Net 60">Net 60 Days</option>
              <option value="Advance Payment">Advance Payment</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-800 block mb-1">Standard Lead Time (Days)</label>
            <input
              type="number"
              min="1"
              max="90"
              value={leadTimeDays}
              onChange={e => setLeadTimeDays(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono focus:bg-white focus:ring-2 focus:ring-[#002F87]/20 focus:border-[#002F87] focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-800 block mb-1">Contract Start Date</label>
            <input
              type="date"
              value={contractStartDate}
              onChange={e => setContractStartDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-[#002F87]/20 focus:border-[#002F87] focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-800 block mb-1">Contract Expiration Date</label>
            <input
              type="date"
              value={contractEndDate}
              onChange={e => setContractEndDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-[#002F87]/20 focus:border-[#002F87] focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-800 block mb-1">Supplier Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as SupplierStatus)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-[#002F87]/20 focus:border-[#002F87] focus:outline-none"
            >
              <option value="ACTIVE">Active</option>
              <option value="PROBATION">Probation</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <Button variant="outline" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit">
            {supplierToEdit ? 'Save Changes' : 'Register Supplier'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
