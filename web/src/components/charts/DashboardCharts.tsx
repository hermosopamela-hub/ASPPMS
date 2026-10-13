import React from 'react';

interface SpendItem {
  name: string;
  spend: number;
  pct: number;
  score: number;
}

export const SpendBySupplierChart: React.FC<{ data: SpendItem[] }> = ({ data }) => {
  return (
    <div className="space-y-3">
      {data.map((item, idx) => (
        <div key={item.name} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-800 truncate max-w-[180px]">{item.name}</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-slate-900">₱{item.spend.toLocaleString()}</span>
              <span className="text-[10px] text-slate-400 font-medium">({item.pct}%)</span>
            </div>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                idx === 0 ? 'bg-[#002F87]' :
                idx === 1 ? 'bg-[#44B330]' :
                idx === 2 ? 'bg-sky-600' :
                idx === 3 ? 'bg-emerald-600' : 'bg-slate-500'
              }`}
              style={{ width: `${Math.min(100, item.pct * 3.5)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export const MonthlySpendTrendChart: React.FC<{
  months: { month: string; spend: number; count: number }[];
}> = ({ months }) => {
  const maxSpend = Math.max(...months.map(m => m.spend), 1);

  return (
    <div className="pt-2">
      <div className="flex items-end justify-between gap-3 h-40 border-b border-slate-200 pb-2 px-2">
        {months.map(m => {
          const heightPct = Math.max(15, Math.round((m.spend / maxSpend) * 100));
          return (
            <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
              <span className="text-[10px] font-mono font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                ₱{(m.spend / 1000).toFixed(0)}k
              </span>
              <div
                className="w-full max-w-[42px] bg-[#002F87] hover:bg-[#002266] rounded-t-lg transition-all"
                style={{ height: `${heightPct}%` }}
              />
              <span className="text-[11px] font-medium text-slate-500 mt-1">{m.month}</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-1">
        <span>5-Month Purchasing Run Rate</span>
        <span className="font-semibold text-slate-700">Peak: ₱{(maxSpend / 1000000).toFixed(2)}M</span>
      </div>
    </div>
  );
};

export const PerformanceDistributionChart: React.FC<{
  distribution: { tier: string; count: number; color: string; pct: number }[];
}> = ({ distribution }) => {
  return (
    <div className="space-y-2.5">
      {distribution.map(d => (
        <div key={d.tier} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="font-medium text-slate-700">{d.tier}</span>
            <span className="font-bold text-slate-900 font-tabular-nums">{d.count} Vendors ({d.pct}%)</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${d.color}`} style={{ width: `${d.pct}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
};

export const DeliveryVsQualityGauge: React.FC<{
  otdRate: number;
  qualityRate: number;
  rejectionRate: number;
}> = ({ otdRate, qualityRate, rejectionRate }) => {
  return (
    <div className="grid grid-cols-2 gap-4 text-center">
      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex flex-col items-center justify-center">
        <span className="text-[10px] uppercase font-bold text-slate-400">Delivery SLA (OTD)</span>
        <div className="relative w-20 h-20 my-2 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-slate-200"
              strokeWidth="3.5"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className="text-[#002F87]"
              strokeDasharray={`${otdRate}, 100`}
              strokeWidth="3.5"
              strokeLinecap="round"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <span className="absolute font-extrabold text-sm text-slate-900 font-tabular-nums">{otdRate}%</span>
        </div>
        <span className="text-[11px] text-slate-500 font-medium">On-Time Performance</span>
      </div>

      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex flex-col items-center justify-center">
        <span className="text-[10px] uppercase font-bold text-slate-400">Quality Acceptance</span>
        <div className="relative w-20 h-20 my-2 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-slate-200"
              strokeWidth="3.5"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className="text-emerald-500"
              strokeDasharray={`${qualityRate}, 100`}
              strokeWidth="3.5"
              strokeLinecap="round"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <span className="absolute font-extrabold text-sm text-slate-900 font-tabular-nums">{qualityRate}%</span>
        </div>
        <span className="text-[11px] text-rose-600 font-medium">{rejectionRate}% Rejection</span>
      </div>
    </div>
  );
};
