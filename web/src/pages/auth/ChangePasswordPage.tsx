import React, { useState } from 'react';
import { KeyRound, AlertCircle, CheckCircle2, Circle, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { IpiBrandLogo } from '../../components/common/IpiBrandLogo';

// Shown instead of the app until the person has chosen their own password
// (first sign-in, or after an administrator reset it).
export const ChangePasswordPage: React.FC = () => {
  const { currentUser, passwordRules, changePassword, logout } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // the same rules the server enforces, ticked off while typing
  const minLength = passwordRules?.minLength ?? 6;
  const username = (currentUser?.email || '').split('@')[0].toLowerCase();
  const lower = next.toLowerCase();
  const checks = [
    { ok: next.length >= minLength, label: `At least ${minLength} characters` },
    { ok: /[a-z]/i.test(next) && /\d/.test(next), label: 'Letters and at least one number' },
    { ok: next.length > 0 && !(username && lower.includes(username)), label: 'Does not contain your username' },
    { ok: next.length > 0 && !(passwordRules?.easyWords || []).some((w) => lower.includes(w)), label: 'Not an easy-to-guess password' },
    { ok: next.length > 0 && next === again, label: 'Both entries match' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (checks.some((c) => !c.ok)) {
      setError('Please meet every requirement in the list.');
      return;
    }
    setBusy(true);
    const message = await changePassword(current, next);
    setBusy(false);
    if (message) setError(message);
  };

  const input =
    'w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#002F87]/60 focus:border-[#002F87] transition';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800/80 bg-slate-900/70 px-6 py-4 flex items-center justify-between">
        <IpiBrandLogo variant="header" theme="on-dark" />
        <button onClick={logout} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </header>

      <main className="flex-1 w-full max-w-md mx-auto p-4 sm:p-6 flex flex-col justify-center">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <h2 className="text-xl font-bold text-white tracking-tight">Choose your password</h2>
          <p className="text-xs text-slate-400 mt-1 mb-5">
            Signed in as <span className="text-slate-200">{currentUser?.email}</span>. Replace the temporary password you were given with one only you know.
          </p>

          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Temporary / current password" required autoFocus autoComplete="current-password" className={input} />
            </div>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input type="password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="New password" required autoComplete="new-password" className={input} />
            </div>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input type="password" value={again} onChange={(e) => setAgain(e.target.value)} placeholder="New password again" required autoComplete="new-password" className={input} />
            </div>

            <ul className="space-y-1 text-xs">
              {checks.map((c) => (
                <li key={c.label} className={`flex items-center gap-2 ${c.ok ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {c.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
                  {c.label}
                </li>
              ))}
            </ul>

            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 px-4 rounded-xl bg-[#002F87] hover:bg-[#002266] disabled:opacity-60 text-white font-semibold text-sm transition cursor-pointer"
            >
              {busy ? 'Saving…' : 'Save new password'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};
