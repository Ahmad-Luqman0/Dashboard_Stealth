import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
  label: string;
  mainValue: string;
  subValue: string;
  tooltip?: string;
  trend?: 'up' | 'down';
  trendColor?: 'green' | 'red' | 'blue';
}

const KPICard: React.FC<KPICardProps> = ({ label, mainValue, subValue, tooltip, trend, trendColor = 'green' }) => {
  const Icon = trend === 'down' ? TrendingDown : TrendingUp;
  const iconClass = trendColor === 'red' ? 'text-red-500' : trendColor === 'blue' ? 'text-blue-500' : 'text-green-500';

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center relative group hover:shadow-md transition-shadow">
      {tooltip && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-100 text-slate-500 text-xs px-2 py-1 rounded shadow-sm border border-slate-200 font-medium pointer-events-none z-10 whitespace-nowrap">
           {tooltip}
        </div>
      )}
      <div className="flex items-center gap-2 mb-4">
          <h3 className="text-slate-600 text-sm font-bold">{label}</h3>
          {trend && <Icon size={16} className={iconClass} />}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-blue-600">{mainValue}</span>
        {subValue && <span className="text-slate-400 text-xs font-medium">/ {subValue}</span>}
      </div>
    </div>
  );
};

export default KPICard;
