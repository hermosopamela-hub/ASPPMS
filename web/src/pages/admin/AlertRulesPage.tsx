import React, { useState } from 'react';
import { Bell, ShieldAlert, CheckCircle2, Sliders, Play, Save, AlertTriangle } from 'lucide-react';
import { dbService } from '../../services/db';
import { AlertThresholds } from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';

interface AlertRuleConfig {
  id: string;
  name: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  thresholdVal: number;
  unit: string;
  enabled: boolean;
}

export const AlertRulesPage: React.FC = () => {
  const { currentUser, hasPermission } = useAuth();
  const settings = dbService.getSettings();
  const canManage = hasPermission('MANAGE_SETTINGS');

  const [rules, setRules] = useState<AlertRuleConfig[]>([
    {
      id: 'RULE_PRICE_SPIKE',
      name: 'Significant Material Price Hike',
      description: 'Triggers when a purchase transaction unit price exceeds standard benchmark by tolerance percentage',
      severity: 'CRITICAL',
      thresholdVal: settings.thresholds.significantPriceIncreasePct || 10.0,
      unit: '% increase',
      enabled: true,
    },
    {
      id: 'RULE_PRICE_OPPORTUNITY',
      name: 'Significant Material Price Reduction',
      description: 'Detects favorable vendor discounts exceeding threshold for volume contract locking',
      severity: 'LOW',
      thresholdVal: 10.0,
      unit: '% decrease',
      enabled: true,
    },
    {
      id: 'RULE_POOR_PERFORMANCE',
      name: 'Supplier Composite Score Deterioration',
      description: 'Flags vendor as At-Risk when weighted score falls below minimum threshold',
      severity: 'CRITICAL',
      thresholdVal: settings.thresholds.poorPerformanceThreshold || 70.0,
      unit: 'min points',
      enabled: true,
    },
    {
      id: 'RULE_HIGH_REJECTION',
      name: 'Elevated Receiving QC Rejection Rate',
      description: 'Triggers quarantine alert when lot defect rejection rate exceeds allowed tolerance',
      severity: 'HIGH',
      thresholdVal: 5.0,
      unit: '% rejection',
      enabled: true,
    },
    {
      id: 'RULE_DELIVERY_DELAY',
      name: 'Chronic Shipping Transit Delay',
      description: 'Triggers warning when vendor delivery delay exceeds grace period',
      severity: 'HIGH',
      thresholdVal: 5.0,
      unit: 'delay days',
      enabled: true,
    },
    {
      id: 'RULE_CONTRACT_EXPIRY',
      name: 'Master Supply Agreement Expiration Warning',
      description: 'Alerts procurement team in advance of contract termination for renewal review',
      severity: 'MEDIUM',
      thresholdVal: settings.thresholds.contractExpiringDays || 30.0,
      unit: 'days to expiration',
      enabled: true,
    },
  ]);

  const [scanMessage, setScanMessage] = useState('');

  const handleToggleRule = (id: string) => {
    if (!canManage) return;
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const handleUpdateVal = (id: string, val: number) => {
    if (!canManage) return;
    setRules(prev => prev.map(r => r.id === id ? { ...r, thresholdVal: val } : r));
  };

  const handleSaveRules = async () => {
    const priceHike = rules.find(r => r.id === 'RULE_PRICE_SPIKE')?.thresholdVal || 10;
    const poorScore = rules.find(r => r.id === 'RULE_POOR_PERFORMANCE')?.thresholdVal || 70;
    const contractDays = rules.find(r => r.id === 'RULE_CONTRACT_EXPIRY')?.thresholdVal || 30;

    const updated = {
      ...settings,
      thresholds: {
        ...settings.thresholds,
        significantPriceIncreasePct: priceHike,
        poorPerformanceThreshold: poorScore,
        contractExpiringDays: contractDays,
      },
    };

    try {
      await dbService.updateSettings(updated);
      setScanMessage('Alert rules saved and active. Automated engine initialized.');
    } catch (err) {
      setScanMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
    setTimeout(() => setScanMessage(''), 4000);
  };

  const handleRunScan = async () => {
    try {
      const result = await dbService.executeRuleScan();
      setScanMessage(`Automated audit scan complete: ${result.summary}`);
    } catch (err) {
      setScanMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
    setTimeout(() => setScanMessage(''), 6000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">
            Automated Alert Rules & Threshold Engine
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure automated event monitors that detect material price spikes, delivery delays, and supplier score deterioration.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunScan}
            icon={<Play className="w-3.5 h-3.5 text-[#002F87]" />}
          >
            Run Rules Scan
          </Button>

          {canManage && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveRules}
              icon={<Save className="w-3.5 h-3.5" />}
            >
              Save Active Rules
            </Button>
          )}
        </div>
      </div>

      {scanMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{scanMessage}</span>
        </div>
      )}

      {/* Rules Grid */}
      <div className="space-y-3">
        {rules.map(rule => (
          <div
            key={rule.id}
            className={`p-4 rounded-xl border transition-colors bg-white ${
              rule.enabled ? 'border-slate-200' : 'border-slate-200/60 opacity-60 bg-slate-50/50'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs md:text-sm text-slate-900">{rule.name}</span>
                  <Badge
                    variant={rule.severity === 'CRITICAL' ? 'danger' : rule.severity === 'HIGH' ? 'warning' : rule.severity === 'MEDIUM' ? 'info' : 'neutral'}
                    size="sm"
                  >
                    {rule.severity}
                  </Badge>
                  {rule.enabled ? (
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">Active</span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded">Disabled</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">{rule.description}</p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-500 font-medium">Trigger at:</span>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    disabled={!rule.enabled || !canManage}
                    value={rule.thresholdVal}
                    onChange={e => handleUpdateVal(rule.id, Number(e.target.value))}
                    className="w-16 bg-slate-50 border border-slate-200 rounded-md p-1 font-mono text-center text-xs font-bold text-slate-900 disabled:opacity-50"
                  />
                  <span className="text-slate-500 text-[11px] font-medium">{rule.unit}</span>
                </div>

                {canManage && (
                  <button
                    onClick={() => handleToggleRule(rule.id)}
                    className={`text-xs px-2.5 py-1 rounded-md font-semibold transition-colors ${
                      rule.enabled
                        ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        : 'bg-[#EFF4FC] text-[#002F87] hover:bg-[#DBE8FC]'
                    }`}
                  >
                    {rule.enabled ? 'Disable' : 'Enable'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
