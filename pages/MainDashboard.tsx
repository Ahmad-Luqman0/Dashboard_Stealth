
import React, { useState, useEffect } from 'react';
import { useExport } from '../contexts/ExportContext';
import { RefreshCcw, Download, Loader2, ExternalLink, ChevronUp, Search, User, Users, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { db } from '../services/dataService';
import DateRangeModal from '../components/DateRangeModal';

const KPICard: React.FC<{ label: string; value: string; target?: string }> = ({ label, value, target }) => (
  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center group hover:shadow-md transition-shadow">
    <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4">{label}</h3>
    <div className="flex items-baseline gap-1">
      <span className="text-2xl font-black text-blue-600 group-hover:scale-105 transition-transform">{value}</span>
      {target && <span className="text-slate-400 text-xs font-medium italic">/ {target}</span>}
    </div>
  </div>
);

const Gauge: React.FC<{ percentage: number; color: string; label: string }> = ({ percentage, color, label }) => {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 200) * circumference;

  return (
    <div className="flex flex-col items-center gap-2 p-4">
      <span className="text-[11px] font-bold text-slate-600 truncate w-24 text-center">{label}</span>
      <div className="relative w-32 h-20 overflow-hidden flex items-end justify-center">
        <svg className="absolute top-0 w-32 h-32 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="8" strokeDasharray={`${circumference / 2} ${circumference / 2}`} />
          <circle cx="50" cy="50" r={radius} fill="none" stroke={color} strokeWidth="8" strokeDasharray={`${circumference / 2} ${circumference / 2}`} strokeDashoffset={strokeDashoffset} style={{ transition: 'stroke-dashoffset 1s ease' }} />
        </svg>
        <span className="text-xl font-black text-slate-800 z-10 mb-2">{percentage}%</span>
      </div>
    </div>
  );
};

const CustomTooltip = ({ active, payload, label, unit }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-slate-100 shadow-lg rounded-xl text-xs">
        <p className="font-bold text-slate-700 mb-1">{label}</p>
        <p className="text-blue-600 font-bold">
          {payload[0].value} <span className="text-slate-400 font-medium">{unit}</span>
        </p>
      </div>
    );
  }
  return null;
};

const SimpleTrendChart: React.FC<{ data: any[]; color: string; label: string; unit: string }> = ({ data, color, label, unit }) => {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col h-[300px]">
      <h3 className="text-sm font-bold text-slate-700 mb-6">{label}</h3>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{fill: '#94a3b8', fontSize: 10}} 
              dy={10}
              interval="preserveStartEnd"
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{fill: '#94a3b8', fontSize: 10}} 
            />
            <Tooltip content={<CustomTooltip unit={unit} />} cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '4 4' }} />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke={color} 
              strokeWidth={3} 
              dot={{r: 3, strokeWidth: 2, fill: '#fff'}} 
              activeDot={{r: 5, strokeWidth: 2, fill: '#fff'}}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const HorizontalBarChart: React.FC<{ items: any[]; color: string; label: string; maxVal: number }> = ({ items, color, label, maxVal }) => (
  <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm h-[400px] flex flex-col">
    <h3 className="text-sm font-bold text-slate-700 mb-4">{label}</h3>
    <div className="flex-1 w-full min-h-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={items} 
          layout="vertical" 
          margin={{ top: 0, right: 30, left: 30, bottom: 0 }}
          barSize={20}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} stroke="#E2E8F0" />
          <XAxis type="number" hide />
          <YAxis 
            dataKey="name" 
            type="category" 
            width={100} 
            axisLine={false} 
            tickLine={false} 
            tick={{fill: '#64748B', fontSize: 11, fontWeight: 600}} 
          />
          <Tooltip 
            cursor={{fill: 'transparent'}}
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Bar dataKey="hours" fill={color} radius={[0, 4, 4, 0]} background={{ fill: '#F8F9FA' }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const UsageTable: React.FC<{ title: string; data: any[] }> = ({ title, data }) => (
  <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mb-8">
    <div className="p-6 border-b border-slate-100 bg-slate-50/20">
      <h3 className="font-bold text-slate-700">{title}</h3>
    </div>
    <table className="w-full text-left text-sm">
      <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
        <tr>
          <th className="px-8 py-4">Name</th>
          <th className="px-8 py-4">Category</th>
          <th className="px-8 py-4">Total Time</th>
          <th className="px-8 py-4 text-right">% of Usage</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {data.map((item, i) => (
          <tr key={i} className="hover:bg-slate-50 transition-colors group">
            <td className="px-8 py-4 flex items-center gap-2">
              <span className="text-blue-500 font-bold group-hover:underline cursor-pointer">{item.name}</span>
              <ExternalLink size={12} className="text-slate-300" />
            </td>
            <td className="px-8 py-4 text-slate-500">{item.category}</td>
            <td className="px-8 py-4 font-bold text-slate-600">{item.time}</td>
            <td className="px-8 py-4 text-right font-black text-slate-800">{item.percent}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const MainDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('Daily');
  const [showDateModal, setShowDateModal] = useState(false);

  const handleCustomRange = (start: Date, end: Date) => {
    const formatDate = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    const rangeStr = `custom:${formatDate(start)}:${formatDate(end)}`;
    setTimeRange(rangeStr);
  };

  const { registerExportHandler, triggerExport } = useExport();

  const fetchData = async () => {
    setLoading(true);
    const result = await db.getDashboardData(timeRange.toLowerCase());
    setData(result);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  useEffect(() => {
    registerExportHandler(() => {
      if (!data || !data.kpis) return;
      
      // Simple CSV generation
      const headers = ['Metric', 'Value', 'Target'];
      const rows = data.kpis.map((k: any) => [k.label, k.value, k.target || '-']);
      
      const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join("\n");
        
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `dashboard_export_${timeRange.toLowerCase()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }, [data, timeRange, registerExportHandler]);

  if (loading || !data) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-blue-600" size={48} />
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Hydrating Dashboard Context...</p>
        </div>
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <AlertTriangle className="text-red-500" size={48} />
          <p className="text-sm font-bold text-slate-500">Failed to load dashboard data</p>
          <button onClick={fetchData} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-32">
      {/* Top Header Section */}
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-black text-blue-600 tracking-tight">Admin Dashboard</h1>
          <div className="flex items-center gap-4 text-xs text-slate-400 font-bold">
            <span>Last updated: {new Date().toLocaleString()}</span>
            <button onClick={fetchData} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"><RefreshCcw size={14} /></button>
            <button onClick={triggerExport} className="flex items-center gap-2 border border-slate-300 px-4 py-2 rounded-xl hover:bg-slate-50 transition-all bg-white font-bold text-slate-800 shadow-sm">
              <Download size={14} />
              Export
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-bold text-slate-500 uppercase tracking-tighter w-12">User:</label>
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="Search user..." 
                className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-medium" 
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="text-sm font-bold text-slate-500 uppercase tracking-tighter w-24">Supervisor:</label>
            <select className="flex-1 py-2.5 px-4 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-medium">
              <option>All Supervisors</option>
            </select>
          </div>
        </div>

        {/* Time Range Tabs */}
        <div className="flex gap-3 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm w-fit">
          {['Daily', 'Yesterday', 'Weekly', 'Monthly'].map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all ${
                timeRange === range 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                  : 'text-blue-600 hover:bg-blue-50 border border-transparent'
              }`}
            >
              {range}
            </button>
          ))}
          <button 
            onClick={() => setShowDateModal(true)}
            className={`px-12 py-2.5 rounded-xl text-sm font-bold transition-all ml-4 bg-white border ${
              timeRange.startsWith('custom:')
                ? 'border-purple-600 text-purple-600 shadow-md shadow-purple-100'
                : 'border-purple-200 text-purple-600 hover:bg-purple-50'
            }`}
          >
            {timeRange.startsWith('custom:') ? `${timeRange.split(':')[1]} - ${timeRange.split(':')[2]}` : 'Custom Range'}
          </button>
        </div>

        <DateRangeModal
          isOpen={showDateModal}
          onClose={() => setShowDateModal(false)}
          onApply={handleCustomRange}
        />
      </div>

      {/* KPI Cards Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {data.kpis.slice(0, 4).map((k: any, i: number) => (
          <KPICard key={i} label={k.label} value={k.value} target={k.target} />
        ))}
      </div>

      {/* KPI Cards Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {data.kpis.slice(4).map((k: any, i: number) => (
          <KPICard key={i} label={k.label} value={k.value} target={k.target} />
        ))}
      </div>

      {/* User Status Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto">
        {/* Active Users */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[400px]">
          <div className="p-6 border-b border-slate-50 flex items-center justify-between">
            <h3 className="font-black text-slate-800 tracking-tight flex items-center gap-2">Active Users</h3>
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {data.statusLists.activeUsers.map((u: any, i: number) => (
              <div key={i} className="flex items-center gap-4 p-3 bg-green-50/20 rounded-lg border-l-4 border-green-500 group hover:bg-green-50 transition-all">
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold shrink-0">
                  {u.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">{u.name}</p>
                  <p className="text-[10px] font-medium text-slate-500">Active for {u.duration}</p>
                </div>
              </div>
            ))}
            {data.statusLists.activeUsers.length === 0 && (
              <div className="flex flex-col items-center justify-center h-48 text-center text-slate-400">
                <p className="text-xs font-bold">No active users currently</p>
              </div>
            )}
          </div>
        </div>

        {/* Started Late */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[400px]">
          <div className="p-6 border-b border-slate-50 flex items-center justify-between">
            <h3 className="font-black text-slate-800 tracking-tight flex items-center gap-2">Started Late</h3>
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {data.statusLists.startedLate.map((u: any, i: number) => (
              <div key={i} className="flex items-center gap-4 p-3 bg-amber-50/20 rounded-lg border-l-4 border-amber-500 group">
                <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold shrink-0">
                  {u.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{u.name}</p>
                        {/* Show date for Weekly/Monthly views */}
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{u.dateLabel}</p>
                    </div>
                    <span className="text-[9px] font-black text-amber-600 ml-2 whitespace-nowrap">{u.delay}</span>
                  </div>
                  <p className="text-[9px] text-slate-500 mt-0.5">Sch: {u.scheduled} • Started: {u.started}</p>
                </div>
              </div>
            ))}
            {data.statusLists.startedLate.length === 0 && (
              <div className="flex flex-col items-center justify-center h-48 text-center text-slate-400">
                 <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-300 mb-3">
                   <CheckCircle2 size={20} />
                 </div>
                 <p className="text-xs font-bold">No one started late</p>
              </div>
            )}
          </div>
        </div>

        {/* Not Started */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[400px]">
         <div className="p-6 border-b border-slate-50 flex items-center justify-between">
            <h3 className="font-black text-slate-800 tracking-tight flex items-center gap-2">Not Started</h3>
            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
             {data.statusLists.notStarted && data.statusLists.notStarted.length > 0 ? (
                data.statusLists.notStarted.map((u: any, i: number) => (
                  <div key={i} className="flex items-center gap-4 p-3 bg-red-50/20 rounded-lg border-l-4 border-red-500 group">
                    <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white font-bold shrink-0">
                      {u.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{u.name}</p>
                      <p className="text-[10px] font-medium text-red-500">Not started yet</p>
                    </div>
                  </div>
                ))
             ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4 border border-slate-100">
                    <CheckCircle2 size={32} />
                  </div>
                  <p className="text-xs font-bold text-slate-400">All users started work</p>
                </div>
             )}
          </div>
        </div>
      </div>

      {/* Analytical Trends Section (Original Scroll Down Content) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SimpleTrendChart data={data.trends.daily} color="#3b82f6" label="Daily Time Tracking Trend" unit="h" />
        <SimpleTrendChart data={data.trends.productive} color="#22c55e" label="Productive Time Trend" unit="h" />
        <SimpleTrendChart data={data.trends.idle} color="#f59e0b" label="Idle Time Trend" unit="m" />
        <SimpleTrendChart data={data.trends.break} color="#ef4444" label="Break Time Trend" unit="m" />
      </div>

      {/* User Rankings Section */}
      <div className="space-y-8">
        <HorizontalBarChart items={data.rankings.topUsers} color="#3b82f6" label="Top Users by Tracked Hours" maxVal={9} />
        <HorizontalBarChart items={data.rankings.bottomUsers} color="#ef4444" label="Bottom Users by Tracked Hours" maxVal={3.5} />
      </div>

      {/* High-Level Productivity Gauges */}
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
        <h3 className="text-sm font-bold text-slate-700 mb-8 uppercase tracking-widest">Highest % Productive Time By User</h3>
        <div className="flex flex-wrap justify-around gap-4">
          {data.gauges.productive.map((g: any, i: number) => (
            <Gauge key={i} label={g.name} percentage={g.percentage} color="#22c55e" />
          ))}
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
        <h3 className="text-sm font-bold text-slate-700 mb-8 uppercase tracking-widest">Highest % Unproductive Time By User</h3>
        <div className="flex flex-wrap justify-around gap-4">
          {data.gauges.unproductive.map((g: any, i: number) => (
            <Gauge key={i} label={g.name} percentage={g.percentage} color="#ef4444" />
          ))}
        </div>
      </div>

      {/* Efficiency Metrics Tables */}
      <div className="grid grid-cols-1 gap-8">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 bg-slate-50/50 border-b border-slate-100">
            <h3 className="font-bold text-slate-700 uppercase tracking-tighter">Users with Highest % Idle Time</h3>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-blue-50/30 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
              <tr><th className="px-8 py-4">User</th><th className="px-8 py-4">% Idle Time</th><th className="px-8 py-4">Idle Minutes</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.efficiency.idleTimeTable.map((row: any, i: number) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-8 py-4 font-bold text-slate-700">{row.name}</td>
                  <td className="px-8 py-4 font-bold text-red-500">{row.percent}</td>
                  <td className="px-8 py-4 text-slate-500">{row.minutes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 bg-slate-50/50 border-b border-slate-100">
            <h3 className="font-bold text-slate-700 uppercase tracking-tighter">Users with Highest % Break Time</h3>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-blue-50/30 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
              <tr><th className="px-8 py-4">User</th><th className="px-8 py-4">% Break Time</th><th className="px-8 py-4">Break Minutes</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.efficiency.breakTimeTable.map((row: any, i: number) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-8 py-4 font-bold text-slate-700">{row.name}</td>
                  <td className="px-8 py-4 font-bold text-red-500">{row.percent}</td>
                  <td className="px-8 py-4 text-slate-500">{row.minutes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activity Distribution Visualisation */}
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
        <h3 className="text-sm font-bold text-slate-700 mb-8 uppercase tracking-widest">User Activity Level Distribution</h3>
        <div className="space-y-8">
          <div className="flex items-center gap-8">
            <span className="w-24 text-sm font-black text-green-600 uppercase tracking-tighter">Very High</span>
            <div className="flex flex-wrap gap-2">
              {data.distribution.veryHigh.map((name: string, i: number) => (
                <span key={i} className="px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-[10px] font-bold border border-green-100">{name}</span>
              ))}
              <span className="px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-[10px] font-bold border border-green-100">+9 more</span>
            </div>
          </div>
          <div className="flex items-center gap-8">
            <span className="w-24 text-sm font-black text-amber-500 uppercase tracking-tighter">High</span>
            <div className="flex flex-wrap gap-2">
              {data.distribution.high.map((name: string, i: number) => (
                <span key={i} className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-[10px] font-bold border border-amber-100">{name}</span>
              ))}
              <span className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-[10px] font-bold border border-amber-100">+13 more</span>
            </div>
          </div>
          <div className="flex items-center gap-8">
            <span className="w-24 text-sm font-black text-red-500 uppercase tracking-tighter">Low</span>
            <div className="flex flex-wrap gap-2">
              {data.distribution.low.map((name: string, i: number) => (
                <span key={i} className="px-3 py-1.5 bg-red-50 text-red-700 rounded-full text-[10px] font-bold border border-red-100">{name}</span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-8">
            <span className="w-24 text-sm font-black text-red-800 uppercase tracking-tighter">Very Low</span>
            <div className="flex flex-wrap gap-2">
              {data.distribution.veryLow.map((name: string, i: number) => (
                <span key={i} className="px-3 py-1.5 bg-red-100 text-red-900 rounded-full text-[10px] font-bold border border-red-200">{name}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Top Apps and Domains Lists */}
      <UsageTable title="Top Used Productive Websites & Apps" data={data.usage.productiveApps} />
      <UsageTable title="Top Used Unproductive Websites & Apps" data={data.usage.unproductiveApps} />
      <UsageTable title="Top Used Neutral/Unrated Websites & Apps" data={data.usage.neutralApps} />

      {/* Scroll to top button */}
      <button 
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-8 right-8 w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-2xl hover:bg-blue-700 transition-all active:scale-95 group z-50"
      >
        <ChevronUp size={28} strokeWidth={3} className="group-hover:-translate-y-1 transition-transform" />
      </button>
    </div>
  );
};

export default MainDashboard;
