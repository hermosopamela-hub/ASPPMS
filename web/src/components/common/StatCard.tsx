import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number; // percentage
  changeLabel?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  onClick?: () => void;
  tooltip?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  change,
  changeLabel = 'vs last period',
  icon,
  variant = 'default',
  onClick,
  tooltip,
}) => {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;
  const isZero = change !== undefined && change === 0;

  const borderAccents = {
    default: 'hover:border-slate-300',
    success: 'hover:border-emerald-300',
    warning: 'hover:border-amber-300',
    danger: 'hover:border-rose-300',
  };

  return (
    <div 
      onClick={onClick}
      title={tooltip}
      className={`bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs transition-all relative ${borderAccents[variant]} ${
        onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
        {icon && <div className="text-[#002F87] p-1.5 rounded-lg bg-[#EFF4FC] border border-[#DBE8FC]">{icon}</div>}
      </div>

      <div className="mt-2.5 flex items-baseline gap-2">
        <h4 className="text-2xl font-bold tracking-tight text-slate-900 font-tabular-nums">{value}</h4>
      </div>

      {(change !== undefined || subtitle) && (
        <div className="mt-2.5 flex items-center gap-1.5 text-xs">
          {change !== undefined && (
            <span
              className={`inline-flex items-center font-semibold ${
                isPositive ? 'text-rose-600' : isNegative ? 'text-emerald-600' : 'text-slate-500'
              }`}
            >
              {isPositive && <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />}
              {isNegative && <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />}
              {isZero && <Minus className="w-3.5 h-3.5 mr-0.5" />}
              {change > 0 ? `+${change}%` : `${change}%`}
            </span>
          )}
          <span className="text-slate-400 truncate">{subtitle || changeLabel}</span>
        </div>
      )}
    </div>
  );
};
