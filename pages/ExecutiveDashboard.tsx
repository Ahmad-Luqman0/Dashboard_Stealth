
import React from 'react';
import { Download, RefreshCcw, Maximize2, ChevronRight } from 'lucide-react';
import { useExport } from '../contexts/ExportContext';
import DateRangeModal from '../components/DateRangeModal';

const ExecutiveDashboard: React.FC = () => {
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<any>(null);
  const [productiveApps, setProductiveApps] = React.useState<any[]>([]);
  const [unproductiveApps, setUnproductiveApps] = React.useState<any[]>([]);
  const [neutralApps, setNeutralApps] = React.useState<any[]>([]);
  const [selectedRange, setSelectedRange] = React.useState('last_month');
  const [shifts, setShifts] = React.useState<any[]>([]);
  const [selectedShift, setSelectedShift] = React.useState('All');
  const [expandedRow, setExpandedRow] = React.useState<string[]>([]);
  const [showDateModal, setShowDateModal] = React.useState(false);

  const handleCustomRange = (start: Date, end: Date) => {
    const formatDate = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    const rangeStr = `custom:${formatDate(start)}:${formatDate(end)}`;
    setSelectedRange(rangeStr);
  };

  // Helper to format seconds to "Xh Ym"
  const formatDuration = (seconds?: number | string) => {
    if (!seconds) return "0h 0m";
    const sec = Number(seconds);
    if (isNaN(sec)) return "0h 0m";
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const calculatePercentage = (actual: number, target: number) => {
    if (target === 0) return 0;
    return ((actual / target) * 100).toFixed(2);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch shifts if empty
      if (shifts.length === 0) {
          import('../services/dataService').then(m => m.db.getShifts()).then(setShifts);
      }

      const [summary, prod, unprod, neutral] = await Promise.all([
        import('../services/dataService').then(m => m.db.getSummaryKPIs(selectedRange, selectedShift === 'All' ? undefined : selectedShift)),
        import('../services/dataService').then(m => m.db.getTopApps('productive', selectedRange, selectedShift === 'All' ? undefined : selectedShift)),
        import('../services/dataService').then(m => m.db.getTopApps('unproductive', selectedRange, selectedShift === 'All' ? undefined : selectedShift)),
        import('../services/dataService').then(m => m.db.getTopApps('neutral', selectedRange, selectedShift === 'All' ? undefined : selectedShift))
      ]);
      setData(summary);
      setProductiveApps(prod);
      setUnproductiveApps(unprod);
      setNeutralApps(neutral);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  React.useEffect(() => {
    fetchData();
  }, [selectedRange, selectedShift]);

  // Derived Data
  const totalUsers = Number(data?.registered_users || 0);
  const activeUsers = Number(data?.active_users || 0);
  const totalTime = Number(data?.total_time || 0);
  const productiveTime = Number(data?.productive_time || 0);

  const getDaysMultiplier = (range: string) => {
    switch (range) {
      case 'daily': return 1;
      case 'yesterday': return 1;
      case 'weekly': return 5; // Standard work week
      case 'monthly': return 22; // Standard work month (approx)
      default: return 1;
    }
  };

  const multiplier = getDaysMultiplier(selectedRange);
  // Target = Users * 8 hours/day * 3600 seconds * Days
  const targetSession = totalUsers > 0 ? (totalUsers * 8 * 3600 * multiplier) : (8 * 3600 * multiplier); 
  // Fallback to 1 user if totalUsers is 0 to avoid 0 target div/0 errors, though logic handles 0 target
  
  const targetProductivity = targetSession * 0.85; // 85% efficiency goal

  const rows = [
    { 
      id: 'login',
      label: "Login", 
      target: totalUsers.toString(), 
      actual: activeUsers.toString(), 
      percentage: totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(2) : "0.00", 
      status: activeUsers < totalUsers * 0.9 ? 'red' : 'green' 
    },
    { 
      id: 'session',
      label: "Session", 
      target: formatDuration(targetSession), 
      actual: formatDuration(totalTime), 
      percentage: calculatePercentage(totalTime, targetSession), 
      status: totalTime < targetSession * 0.8 ? 'red' : 'green' 
    },
    { 
      id: 'productivity',
      label: "Productivity", 
      target: formatDuration(targetProductivity), 
      actual: formatDuration(productiveTime), 
      percentage: calculatePercentage(productiveTime, targetProductivity), 
      status: productiveTime < targetProductivity * 0.8 ? 'red' : 'green' 
    },
  ];

  const toggleRow = (id: string) => {
    if (expandedRow.includes(id)) {
      setExpandedRow(prev => prev.filter(r => r !== id));
    } else {
      setExpandedRow(prev => [...prev, id]);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'red': return 'bg-red-500';
      case 'yellow': return 'bg-amber-500';
      case 'green': return 'bg-green-500';
      default: return 'bg-slate-300';
    }
  };

   const renderExpandedContent = (rowId: string) => {
    if (rowId === 'session') {
       const breakdown = [
           { id: 'session-unproductive', label: 'Unproductive Time', actual: data?.unproductive_time, target: targetSession * 0.1, apps: unproductiveApps }, 
           { id: 'session-neutral', label: 'Neutral & Unrated Time', actual: data?.neutral_time, target: targetSession * 0.05, apps: neutralApps },
           { id: 'session-break', label: 'Break Time', actual: data?.break_time, target: targetSession * 0.15, apps: [] },
           { id: 'session-idle', label: 'Idle Time', actual: data?.idle_time, target: targetSession * 0.05, apps: [] },
       ];
       return (
           <div className="bg-blue-50/30 p-4 border-t border-slate-100">
               <table className="w-full text-sm">
                   <thead className="text-slate-500 font-semibold bg-blue-100/50">
                       <tr>
                           <th className="px-6 py-3 text-left w-12"></th>
                           <th className="px-6 py-3 text-left"></th>
                           <th className="px-6 py-3 text-left">Target</th>
                           <th className="px-6 py-3 text-left">Actual</th>
                           <th className="px-6 py-3 text-left">Percentage</th>
                           <th className="px-6 py-3 w-12"></th>
                       </tr>
                   </thead>
                   <tbody>
                       {breakdown.map((b, i) => {
                           const pct = ((Number(b.actual) / b.target) * 100);
                           const isExpanded = expandedRow.includes(b.id);
                           const hasApps = b.apps && b.apps.length > 0;

                           return (
                               <React.Fragment key={i}>
                               <tr 
                                   className={`border-b border-blue-100/30 transition-colors ${hasApps ? 'cursor-pointer hover:bg-blue-50/50' : ''}`}
                                   onClick={() => hasApps && toggleRow(b.id)}
                               >
                                   <td className="px-6 py-3 text-slate-400 text-xs text-center">
                                       {hasApps ? (
                                           <ChevronRight size={14} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                       ) : (
                                           '»'
                                       )}
                                   </td>
                                   <td className="px-6 py-3 font-medium text-slate-700">{b.label}</td>
                                   <td className="px-6 py-3 text-slate-500">{formatDuration(b.target)}</td>
                                   <td className="px-6 py-3 text-slate-500">{formatDuration(b.actual)}</td>
                                   <td className="px-6 py-3 text-slate-500">{pct.toFixed(2)}%</td>
                                   <td className="px-6 py-3 text-right">
                                       <div className={`w-2 h-2 rounded-full inline-block ${pct > 100 ? 'bg-red-500' : 'bg-amber-400'}`} />
                                   </td>
                               </tr>
                               {isExpanded && hasApps && (
                                   <tr>
                                       <td colSpan={6} className="bg-white p-4 pl-16">
                                           <table className="w-full text-xs">
                                               <thead className="text-slate-400 border-b border-slate-100">
                                                   <tr>
                                                       <th className="py-2 text-left">App/Website</th>
                                                       <th className="py-2 text-left">Category</th>
                                                       <th className="py-2 text-left">Time</th>
                                                       <th className="py-2 text-left">%</th>
                                                   </tr>
                                               </thead>
                                               <tbody>
                                                   {b.apps.map((app: any, idx: number) => {
                                                        const totalSecs = Number(b.actual) || 1;
                                                        const appPct = ((Number(app.total_time) / totalSecs) * 100).toFixed(1);
                                                        const isUrl = app.name.includes('(URL)') || app.name.includes('.');
                                                        const url = isUrl ? `https://${app.name.replace(' (URL)', '').replace(' (APP)', '')}` : '#';
                                                       return (
                                                           <tr key={idx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                                                               <td className="py-2 font-medium text-blue-600">
                                                                    {isUrl ? (
                                                                        <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline">
                                                                            {app.name} <Maximize2 size={10} />
                                                                        </a>
                                                                    ) : (
                                                                        <span className="flex items-center gap-1">
                                                                            {app.name}
                                                                        </span>
                                                                    )}
                                                               </td>
                                                               <td className="py-2 text-slate-500">{app.category}</td>
                                                               <td className="py-2 text-slate-600">{formatDuration(app.total_time)}</td>
                                                               <td className="py-2 text-slate-400">{appPct}%</td>
                                                           </tr>
                                                       );
                                                   })}
                                               </tbody>
                                           </table>
                                       </td>
                                   </tr>
                               )}
                               </React.Fragment>
                           );
                       })}
                   </tbody>
               </table>
           </div>
       );
    }
    if (rowId === 'productivity') {
        return (
            <div className="bg-blue-50/30 p-4 border-t border-slate-100">
                <table className="w-full text-sm">
                    <thead className="text-slate-500 font-semibold bg-blue-100/50">
                        <tr>
                            <th className="px-4 py-3 text-left">Link</th>
                            <th className="px-4 py-3 text-left">Category</th>
                            <th className="px-4 py-3 text-left">Total Time</th>
                            <th className="px-4 py-3 text-left">Percentage Productive Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        {productiveApps.map((app, i) => {
                            const totalProdSecs = data?.productive_time || 1; 
                            const percent = ((Number(app.total_time) / totalProdSecs) * 100).toFixed(1);
                            const isUrl = app.name.includes('(URL)') || app.name.includes('.');
                            const url = isUrl ? `https://${app.name.replace(' (URL)', '').replace(' (APP)', '')}` : '#';

                            return (
                                <tr key={i} className="border-b border-blue-100/30 hover:bg-blue-50/50">
                                    <td className="px-4 py-3 text-blue-600 font-medium">
                                        {isUrl ? (
                                            <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline">
                                                {app.name} <Maximize2 size={10} />
                                            </a>
                                        ) : (
                                            <span className="flex items-center gap-1">
                                                {app.name}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-slate-500">{app.category}</td>
                                    <td className="px-4 py-3 text-slate-600 font-medium">{formatDuration(app.total_time)}</td>
                                    <td className="px-4 py-3 text-slate-500">{percent}%</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    }
    return null;
  };

  // Export Logic
  const { registerExportHandler, triggerExport } = useExport();

  React.useEffect(() => {
    registerExportHandler(() => {
        if (!data) return;
        
        // 1. Executive Summary
        const summaryHeaders = ['Metric', 'Target', 'Actual', 'Percentage', 'Status'];
        const summaryRows = rows.map(r => [r.label, r.target, r.actual, r.percentage + '%', r.status]);

        // 2. Productive Apps
        const appHeaders = ['App/Website', 'Category', 'Total Time'];
        const appRows = productiveApps.map(a => [a.name, a.category, a.total_time]);

        let csv = "data:text/csv;charset=utf-8,";
        csv += "EXECUTIVE SUMMARY\n";
        csv += summaryHeaders.join(",") + "\n";
        csv += summaryRows.map(r => r.join(",")).join("\n") + "\n\n";
        
        csv += "TOP PRODUCTIVE APPS\n";
        csv += appHeaders.join(",") + "\n";
        csv += appRows.map(r => r.join(",")).join("\n");

        const encodedUri = encodeURI(csv);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `executive_report_${selectedRange}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
  }, [data, rows, productiveApps, registerExportHandler, selectedRange]);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-blue-600">Executive Dashboard</h1>
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span>Last updated: {new Date().toLocaleString()}</span>
          <button onClick={fetchData} className="p-1.5 hover:bg-slate-100 rounded transition-colors"><RefreshCcw size={14} /></button>
          <button onClick={triggerExport} className="flex items-center gap-2 border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors font-bold text-slate-800">
            <Download size={14} />
            Export
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-slate-500">Shift:</label>
          <select 
            value={selectedShift}
            onChange={(e) => setSelectedShift(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 w-48"
          >
            <option value="All">All</option>
            {shifts.map((s, i) => (
                <option key={i} value={`${s.shift_start}-${s.shift_end}`}>
                    {s.shift_start} - {s.shift_end}
                </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
           {['daily', 'yesterday', 'weekly', 'monthly'].map(r => (
            <button 
                key={r} 
                onClick={() => setSelectedRange(r)}
                className={`px-8 py-2 rounded-lg text-sm font-medium border capitalize ${
                    selectedRange === r ? 'bg-blue-600 text-white border-blue-600' : 'text-blue-600 border-blue-100 hover:bg-blue-50'
                }`}
            >
              {r}
            </button>
          ))}
          <button 
            onClick={() => setShowDateModal(true)}
            className={`flex-1 px-8 py-2 rounded-lg text-sm font-medium border transition-colors ${
              selectedRange.startsWith('custom:')
                ? 'bg-purple-600 text-white border-purple-600'
                : 'border-purple-200 text-purple-600 hover:bg-purple-50'
            }`}
          >
            {selectedRange.startsWith('custom:') ? `${selectedRange.split(':')[1]} - ${selectedRange.split(':')[2]}` : 'Custom Range'}
          </button>
        </div>

        <DateRangeModal
          isOpen={showDateModal}
          onClose={() => setShowDateModal(false)}
          onApply={handleCustomRange}
        />
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-800">Detailed View</h2>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center">
            <button 
              onClick={() => {
                if (expandedRow.length === 3) {
                  setExpandedRow([]);
                } else {
                  setExpandedRow(['login', 'session', 'productivity']);
                }
              }}
              className={`p-1.5 rounded transition-colors ${
                expandedRow.length === 3 
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              <Maximize2 size={16} />
            </button>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-blue-50/50 text-slate-600 font-semibold border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 w-12"></th>
                <th className="px-6 py-4"></th>
                <th className="px-6 py-4">Target</th>
                <th className="px-6 py-4">Actual</th>
                <th className="px-6 py-4">Percentage</th>
                <th className="px-6 py-4 w-12 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                  <React.Fragment key={row.id}>
                    <tr onClick={() => toggleRow(row.id)} className="hover:bg-slate-50 transition-colors cursor-pointer">
                    <td className="px-6 py-4 text-slate-400">
                        <ChevronRight size={16} className={`transition-transformDuration-200 ${expandedRow.includes(row.id) ? 'rotate-90' : ''}`} />
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">{row.label}</td>
                    <td className="px-6 py-4 text-slate-500">{row.target}</td>
                    <td className="px-6 py-4 text-slate-500">{row.actual}</td>
                    <td className="px-6 py-4 text-slate-500 font-medium">{row.percentage}%</td>
                    <td className="px-6 py-4 text-right">
                        <div className={`w-3 h-3 rounded-full inline-block ${getStatusColor(row.status)} shadow-sm`} />
                    </td>
                    </tr>
                    {expandedRow.includes(row.id) && (
                        <tr>
                            <td colSpan={6} className="p-0">
                                {renderExpandedContent(row.id)}
                            </td>
                        </tr>
                    )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveDashboard;
