import React, { useState, useRef } from 'react';
import { Settings, Save, RefreshCw, AlertCircle, CheckCircle2, Download, Upload, Database, RotateCcw } from 'lucide-react';
import { dbService } from '../../services/db';
import { SystemSettings } from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';

export const SystemSettingsPage: React.FC = () => {
  const { currentUser, hasPermission } = useAuth();
  const [settings, setSettings] = useState<SystemSettings>(() => dbService.getSettings());
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [backupMessage, setBackupMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canManage = hasPermission('MANAGE_SETTINGS');

  // General Settings
  const [companyName, setCompanyName] = useState(settings.companyName || 'International Pharmaceuticals, Inc.');
  const [baseCurrency, setBaseCurrency] = useState(settings.baseCurrency || 'PHP');
  const [fiscalYear, setFiscalYear] = useState(settings.fiscalYear || '2026-2027');

  // Weights state in percentages for editing
  const [deliveryPct, setDeliveryPct] = useState(settings.weights.deliveryWeight * 100);
  const [qualityPct, setQualityPct] = useState(settings.weights.qualityWeight * 100);
  const [pricePct, setPricePct] = useState(settings.weights.priceWeight * 100);
  const [respPct, setRespPct] = useState(settings.weights.responsivenessWeight * 100);
  const [compPct, setCompPct] = useState(settings.weights.complianceWeight * 100);

  // Thresholds
  const [priceAlertThreshold, setPriceAlertThreshold] = useState(settings.thresholds.significantPriceIncreasePct);
  const [perfThreshold, setPerfThreshold] = useState(settings.thresholds.poorPerformanceThreshold);
  const [qualityThreshold, setQualityThreshold] = useState(settings.thresholds.minQualityAcceptanceRate);

  const totalWeight = deliveryPct + qualityPct + pricePct + respPct + compPct;
  const isWeightValid = Math.abs(totalWeight - 100) < 0.01;

  const handleSave = async () => {
    if (!isWeightValid) {
      alert('Total weighting must sum to exactly 100%. Current sum: ' + totalWeight + '%');
      return;
    }

    const updated: SystemSettings = {
      ...settings,
      companyName,
      baseCurrency,
      fiscalYear,
      weights: {
        deliveryWeight: deliveryPct / 100,
        qualityWeight: qualityPct / 100,
        priceWeight: pricePct / 100,
        responsivenessWeight: respPct / 100,
        complianceWeight: compPct / 100,
      },
      thresholds: {
        ...settings.thresholds,
        significantPriceIncreasePct: priceAlertThreshold,
        poorPerformanceThreshold: perfThreshold,
        minQualityAcceptanceRate: qualityThreshold,
      },
    };

    try {
      await dbService.updateSettings(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      return;
    }
    setSettings(dbService.getSettings());
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleRecalculateAll = async () => {
    try {
      await dbService.recalculateAllSuppliers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      return;
    }
    setBackupMessage('Automated recalculation completed across all supplier performance scorecards.');
    setTimeout(() => setBackupMessage(''), 4000);
  };

  const handleExportBackup = async () => {
    let snapshot;
    try {
      snapshot = await dbService.exportSystemSnapshot();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      return;
    }
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spm_system_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setBackupMessage('Full system snapshot exported successfully.');
    setTimeout(() => setBackupMessage(''), 4000);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      let parsed;
      try {
        parsed = JSON.parse(event.target?.result as string);
      } catch (err: any) {
        alert('Invalid JSON file format: ' + err.message);
        return;
      }
      try {
        const result = await dbService.importSystemSnapshot(parsed);
        setSettings(dbService.getSettings());
        setBackupMessage(result.message);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleResetFactory = async () => {
    if (window.confirm('Reset database to pristine factory benchmark seed dataset? All temporary modifications will be re-initialized.')) {
      try {
        await dbService.resetToDefaults();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
        return;
      }
      setSettings(dbService.getSettings());
      setDeliveryPct(30);
      setQualityPct(30);
      setPricePct(20);
      setRespPct(10);
      setCompPct(10);
      setBackupMessage('System database successfully restored to benchmark seed defaults.');
      setTimeout(() => setBackupMessage(''), 4000);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {savedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          Settings saved successfully! Performance engine recalculated scores with new weights.
        </div>
      )}

      {/* Module 6: Configurable Supplier Performance Weights */}
      <Card
        title="Supplier Performance Scoring Weights"
        subtitle="Configure the multi-factor weighting formula. Weights must sum to exactly 100%."
        action={
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-md ${
              isWeightValid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}>
              Total: {totalWeight}%
            </span>
          </div>
        }
      >
        <div className="space-y-4 text-xs text-slate-700">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-800 block mb-1">
                1. Delivery Reliability Weight (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={deliveryPct}
                disabled={!canManage}
                onChange={e => setDeliveryPct(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-sm"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">Evaluates on-time delivery rate and delay penalties.</span>
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1">
                2. Quality Acceptance Weight (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={qualityPct}
                disabled={!canManage}
                onChange={e => setQualityPct(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-sm"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">Evaluates QC receiving pass rate vs rejections.</span>
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1">
                3. Price Competitiveness Weight (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={pricePct}
                disabled={!canManage}
                onChange={e => setPricePct(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-sm"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">Evaluates supplier prices against peer average & standards.</span>
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1">
                4. Responsiveness Weight (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={respPct}
                disabled={!canManage}
                onChange={e => setRespPct(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-sm"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">Inquiry turn-around and PO confirmation adherence.</span>
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1">
                5. Compliance Weight (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={compPct}
                disabled={!canManage}
                onChange={e => setCompPct(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-sm"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">Regulatory certifications, billing accuracy & contracts.</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Alert Thresholds Configuration */}
      <Card
        title="Automated Alert & Anomaly Thresholds"
        subtitle="Define tolerance levels that trigger Critical and High operational alerts"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-700">
          <div>
            <label className="font-semibold text-slate-800 block mb-1">
              Price Increase Alert Threshold (+%)
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={priceAlertThreshold}
              disabled={!canManage}
              onChange={e => setPriceAlertThreshold(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-sm"
            />
            <span className="text-[11px] text-slate-400 mt-0.5 block">Triggers Critical price hike alert (Default 10%).</span>
          </div>

          <div>
            <label className="font-semibold text-slate-800 block mb-1">
              Poor Supplier Score Gate (&lt; Score)
            </label>
            <input
              type="number"
              min="40"
              max="90"
              value={perfThreshold}
              disabled={!canManage}
              onChange={e => setPerfThreshold(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-sm"
            />
            <span className="text-[11px] text-slate-400 mt-0.5 block">Flags supplier as At-Risk / Poor (Default 70).</span>
          </div>

          <div>
            <label className="font-semibold text-slate-800 block mb-1">
              Minimum Quality Acceptance (%)
            </label>
            <input
              type="number"
              min="80"
              max="99"
              value={qualityThreshold}
              disabled={!canManage}
              onChange={e => setQualityThreshold(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-sm"
            />
            <span className="text-[11px] text-slate-400 mt-0.5 block">Acceptance rate below this triggers QC notice.</span>
          </div>
        </div>
      </Card>

      {backupMessage && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-blue-900">
          <Database className="w-4 h-4 text-blue-600" />
          {backupMessage}
        </div>
      )}

      {/* Enterprise General Parameters */}
      <Card
        title="Enterprise Procurement Parameters"
        subtitle="Global currency, fiscal calendar, and organizational entity profile"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-700">
          <div>
            <label className="font-semibold text-slate-800 block mb-1">Company / Organization Name</label>
            <input
              type="text"
              value={companyName}
              disabled={!canManage}
              onChange={e => setCompanyName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-xs text-slate-900"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-800 block mb-1">Base Reporting Currency</label>
            <select
              value={baseCurrency}
              disabled={!canManage}
              onChange={e => setBaseCurrency(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-xs text-slate-900"
            >
              <option value="PHP">PHP (₱) - Philippine Peso</option>
              <option value="USD">USD ($) - US Dollar</option>
              <option value="EUR">EUR (€) - Euro</option>
              <option value="JPY">JPY (¥) - Japanese Yen</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-800 block mb-1">Active Fiscal Year</label>
            <input
              type="text"
              value={fiscalYear}
              disabled={!canManage}
              onChange={e => setFiscalYear(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-xs text-slate-900"
            />
          </div>
        </div>
      </Card>

      {/* Database Snapshot, Disaster Recovery & Factory Reset */}
      <Card
        title="Database Disaster Recovery & Snapshot Archival"
        subtitle="Export full database snapshots, restore backups, or re-initialize benchmark seed state"
      >
        <div className="space-y-3 text-xs text-slate-700">
          <p className="text-slate-500">
            Export a full JSON snapshot containing all 20+ suppliers, materials, transactions, price history, audit logs, and settings for offsite retention or restore.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportBackup}
              icon={<Download className="w-3.5 h-3.5 text-[#002F87]" />}
            >
              Export System Snapshot (.JSON)
            </Button>

            {canManage && (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json"
                  className="hidden"
                  onChange={handleImportBackup}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  icon={<Upload className="w-3.5 h-3.5 text-emerald-600" />}
                >
                  Restore Snapshot from File
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFactory}
                  className="text-rose-600 hover:text-rose-800 hover:bg-rose-50"
                  icon={<RotateCcw className="w-3.5 h-3.5 text-rose-600" />}
                >
                  Reset Factory Benchmark Seed
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRecalculateAll}
          icon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Recalculate All Scorecards
        </Button>

        {canManage && (
          <Button
            variant="primary"
            size="md"
            onClick={handleSave}
            disabled={!isWeightValid}
            icon={<Save className="w-4 h-4" />}
          >
            Save Configuration Changes
          </Button>
        )}
      </div>
    </div>
  );
};
