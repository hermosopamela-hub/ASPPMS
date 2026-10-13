import React, { useState } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  KeyRound, 
  Mail, 
  AlertCircle, 
  Lock, 
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { IpiBrandLogo } from '../../components/common/IpiBrandLogo';

export interface RoleCredentialCard {
  role: UserRole;
  roleTitle: string;
  department: string;
  name: string;
  email: string;
  badgeColor: string;
  accentBg: string;
  description: string;
  keyPermissions: string[];
}

export const ROLE_CREDENTIALS: RoleCredentialCard[] = [
  {
    role: 'PURCHASING_MANAGER',
    roleTitle: 'Purchasing Manager',
    department: 'Strategic Procurement',
    name: 'Elena Rostova',
    email: 'purchasing.manager@ipi.ph',
    badgeColor: 'bg-purple-100 text-purple-700 border-purple-200',
    accentBg: 'border-l-purple-600',
    description: 'Executive authority for supplier scorecard review, performance tier audits, contract approvals, and system scoring thresholds.',
    keyPermissions: [
      'Full Scorecard & Ranking Access',
      'Configurable Scoring Weights & Thresholds',
      'Anomaly Alert Resolution',
      'Executive Briefing & Report Exports'
    ]
  },
  {
    role: 'PURCHASING_ASSISTANT_MANAGER',
    roleTitle: 'Purchasing Assistant Manager',
    department: 'Vendor Relations & Sourcing',
    name: 'Marcus Vance',
    email: 'assistant.manager@ipi.ph',
    badgeColor: 'bg-blue-100 text-blue-700 border-blue-200',
    accentBg: 'border-l-blue-600',
    description: 'Tactical vendor oversight, price deviation tracking, supplier negotiations, and performance review workflows.',
    keyPermissions: [
      'Comprehensive Price Monitoring & History',
      'Supplier Comparison & Negotiation Briefs',
      'Spend & PO Transaction Intelligence',
      'Audit Log Oversight'
    ]
  },
  {
    role: 'PURCHASING_ANALYST',
    roleTitle: 'Purchasing Analyst',
    department: 'Procurement Analytics',
    name: 'Chloe Delgado',
    email: 'purchasing.analyst@ipi.ph',
    badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    accentBg: 'border-l-emerald-600',
    description: 'Operational data management, multi-source CSV ingestion, automated data quality verification, PO logging, and material cataloging.',
    keyPermissions: [
      'CSV / Excel Batch Data Import Engine',
      'Data Quality Checker & Sanitization',
      'Create / Edit Suppliers & Materials',
      'Log Purchase Orders & What-If Simulations'
    ]
  },
  {
    role: 'ADMIN',
    roleTitle: 'System Administrator',
    department: 'Information Systems',
    name: 'Admin Officer',
    email: 'admin.procure@ipi.ph',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    accentBg: 'border-l-amber-600',
    description: 'Complete system control, role-based access governance, security audit logs, and database snapshot backup/restore.',
    keyPermissions: [
      'User Management & Role Assignment',
      'Complete Security Audit Trail',
      'Global Database Backup & Snapshot Restore',
      'All Operational Capabilities Unrestricted'
    ]
  }
];

interface LoginPageProps {
  onSuccess?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const { login } = useAuth();

  const [emailInput, setEmailInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [rememberMe, setRememberMe] = useState(true);

  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!emailInput.trim()) {
      setErrorMsg('Please enter your corporate email address.');
      return;
    }

    if (!passwordInput.trim()) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setBusy(true);
    const message = await login(emailInput.trim(), passwordInput);
    setBusy(false);
    if (message) {
      setErrorMsg(message);
    } else if (onSuccess) {
      onSuccess();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-[#002F87] selection:text-white relative overflow-hidden">
      {/* Background brand ambient accents */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#002F87]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#44B330]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Banner */}
      <header className="border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-md px-6 py-4 flex items-center justify-between relative z-10">
        <IpiBrandLogo variant="header" theme="on-dark" />

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
            <ShieldCheck className="w-4 h-4 text-[#44B330]" />
            <span>256-Bit Encrypted Corporate Portal</span>
          </div>
        </div>
      </header>

      {/* Main Form Center Box */}
      <main className="flex-1 w-full max-w-md mx-auto p-4 sm:p-6 flex flex-col justify-center relative z-10">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          
          <div className="text-center mb-6">
            {/* Full IPI Logo with Tagline */}
            <div className="mb-4">
              <IpiBrandLogo variant="login" showTagline={true} theme="on-dark" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight mt-3">
              Procurement Intelligence Portal
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Enter authorized corporate credentials to access supplier performance scorecards and price variance monitoring.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-rose-300 text-xs leading-relaxed animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="flex-1 font-medium">{errorMsg}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Corporate Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="e.g. purchasing.manager@ipi.ph"
                  required
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#002F87]/60 focus:border-[#002F87] transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Password
                </label>
                <span className="text-[11px] text-slate-500">
                  Enterprise Security
                </span>
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#002F87]/60 focus:border-[#002F87] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-[#002F87] focus:ring-[#002F87]/40"
                />
                <span>Remember on this device</span>
              </label>
              <span className="text-slate-500 hover:text-slate-400 cursor-default">
                Single Sign-On (SSO) Active
              </span>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full disabled:opacity-60 py-3 px-4 rounded-xl bg-[#002F87] hover:bg-[#002266] text-white font-semibold text-sm shadow-lg shadow-[#002F87]/25 flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer"
            >
              <span>{busy ? 'Signing in…' : 'Sign In to Dashboard'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-800 text-center">
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Authorized personnel only. All access attempts and session transactions are recorded in compliance with IPI security and data integrity standards.
            </p>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 px-6 text-center text-xs text-slate-500 relative z-10">
        <div>
          International Pharmaceuticals, Inc. (IPI) · Automated Supplier Performance & Price Monitoring Intelligence System © 2026
        </div>
      </footer>
    </div>
  );
};

