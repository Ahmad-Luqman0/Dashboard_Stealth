
import React from 'react';

interface KPICardProps {
  label: string;
  mainValue: string;
  subValue: string;
  tooltip?: string;
}

const KPICard: React.FC<KPICardProps> = ({ label, mainValue, subValue, tooltip }) => {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center relative group">
      {tooltip && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] px-2 py-1 rounded">
          {tooltip}
        </div>
      )}
      <h3 className="text-slate-500 text-sm font-medium mb-4">{label}</h3>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-blue-600">{mainValue}</span>
        {subValue && <span className="text-slate-400 text-sm font-medium">/ {subValue}</span>}
      </div>
    </div>
  );
};

export default KPICard;
