
import React, { useState, useEffect } from 'react';
import { useExport } from '../contexts/ExportContext';
import { useTimezone } from '../contexts/TimezoneContext';
import { RefreshCcw, Download, Loader2, ExternalLink, ChevronUp, ChevronRight, ChevronDown, Search, User, Users, CheckCircle2, Clock, AlertTriangle, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { db } from '../services/dataService';
import DateRangeModal from '../components/DateRangeModal';

import KPICard from '../components/KPICard';

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

const HorizontalBarChart: React.FC<{ items: any[]; color: string; label: string; maxVal: number; onBarClick?: (item: any) => void }> = ({ items, color, label, maxVal, onBarClick }) => (
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
          <Bar 
            dataKey="hours" 
            fill={color} 
            radius={[0, 4, 4, 0]} 
            background={{ fill: '#F8F9FA' }}
            style={{ cursor: onBarClick ? 'pointer' : 'default' }}
            onClick={(data) => onBarClick && onBarClick(data)}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);

// Helper to format seconds to "Xh Ym"
const formatDuration = (seconds?: number | string) => {
  if (!seconds) return "0h 0m";
  const sec = Number(seconds);
  if (isNaN(sec)) return "0h 0m";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}h ${m}m`;
};

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
        {data.map((item, i) => {
          // URLs are identified by '(URL)' tag or containing a dot implies domain, BUT exclude '(APP)' explicitly
          const isUrl = item.name.includes('(URL)') || (item.name.includes('.') && !item.name.includes('(APP)'));
          
          // Clean up the name for the potential URL link
          const cleanName = item.name.replace(' (URL)', '').replace(' (APP)', '');
          const url = isUrl ? `https://${cleanName}` : '#';

          return (
            <tr key={i} className="hover:bg-slate-50 transition-colors group">
              <td className="px-8 py-4 flex items-center gap-2">
                {isUrl ? (
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-bold hover:text-blue-800 group-hover:underline cursor-pointer flex items-center gap-1 transition-colors">
                        {item.name} <ExternalLink size={12} className="text-blue-400" />
                    </a>
                ) : (
                    <span className="text-blue-600 font-bold">{item.name}</span>
                )}
              </td>
              <td className="px-8 py-4 text-slate-500">{item.category}</td>
              <td className="px-8 py-4 font-bold text-slate-600">{item.time}</td>
              <td className="px-8 py-4 text-right font-black text-slate-800">{item.percent}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

const MainDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('Daily');
  const [showDateModal, setShowDateModal] = useState(false);
  const [userBreakdown, setUserBreakdown] = useState<any[]>([]);
  const [summaryData, setSummaryData] = useState<any>(null); // New state for raw KPI data
  const [selectedCategory, setSelectedCategory] = useState<{label: string, users: any[]} | null>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null); // New state for user detail modal

  // User search/filter state
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [filterUserId, setFilterUserId] = useState<string | null>(null);
  const [filterUserName, setFilterUserName] = useState<string>('All Users');
  const [userSearchOpen, setUserSearchOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [timelineData, setTimelineData] = useState<any>(null);
  const [expandedTimelineRows, setExpandedTimelineRows] = useState<Set<number>>(new Set());

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

  // Helper to format seconds to "Xh Ym" (Local version for component scope if needed, but module level one covers UsageTable)
  // We can remove this local one if we use the module level one, but keeping it won't hurt, or we can just comment it out to avoid shadow variable warning
  // const formatDuration = ... 


  // Helper Helpers
  const getDurationInDays = () => {
    if (timeRange === 'Daily' || timeRange === 'Yesterday') return 1;
    if (timeRange === 'Weekly') return 7;
    if (timeRange === 'Monthly') return 30;
    if (timeRange.startsWith('custom:')) {
        const parts = timeRange.split(':');
        if (parts.length === 3) {
            const start = new Date(parts[1]);
            const end = new Date(parts[2]);
            const diffTime = Math.abs(end.getTime() - start.getTime());
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
        }
    }
    return 1;
  };

  const calculateTarget = (minutesPerDay: number, activeUsers: number, days: number) => {
    const totalMinutes = minutesPerDay * Math.max(activeUsers, 1) * days;
    return totalMinutes * 60; // seconds
  };

  // Helper for dynamic tooltip: "X minutes (Y%)"
  const getTooltip = (actual?: number, target?: number) => {
      if (!actual && actual !== 0) return undefined;
      const act = Number(actual);
      const tgt = Number(target);
      const mins = Math.round(act / 60);
      const pct = tgt > 0 ? Math.round((act / tgt) * 100) : 0;
      return `${mins} minutes (${pct}%)`;
  };

  const { registerExportHandler, triggerExport } = useExport();
  const { formatDateTime, formatTime, timezone } = useTimezone();

  // Fetch all users for the dropdown on mount
  useEffect(() => {
    db.getUsers().then(setAllUsers);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
        const [dashboardData, breakdownData, summaryStats] = await Promise.all([
            db.getDashboardData(timeRange.toLowerCase(), undefined, filterUserId || undefined, timezone),
            db.getUserActivityBreakdown(timeRange.toLowerCase(), undefined, filterUserId || undefined),
            db.getSummaryKPIs(timeRange.toLowerCase(), undefined, filterUserId || undefined)
        ]);
        setData(dashboardData);
        setUserBreakdown(breakdownData);
        setSummaryData(summaryStats);
    } catch (error) {
        console.error("Failed to fetch dashboard data", error);
        setData({ error: true });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [timeRange, filterUserId, timezone]);

  // Fetch timeline data when a user is selected or timezone changes
  useEffect(() => {
    if (filterUserId) {
      db.getUserTimeline(filterUserId, timeRange.toLowerCase(), timezone).then(setTimelineData);
    } else {
      setTimelineData(null);
    }
  }, [filterUserId, timeRange, timezone]);

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

  if (loading || !data || !summaryData) {
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

  const days = getDurationInDays();
  const activeUsers = Number(summaryData?.active_users || 0);
  const totalUsers = Number(summaryData?.registered_users || 0);

  // Targets (minutes per user per day)
  const targetTotal = calculateTarget(460, activeUsers, days);
  const targetProductive = calculateTarget(390, activeUsers, days);
  const targetUnproductive = calculateTarget(40, activeUsers, days);
  const targetNeutral = calculateTarget(20, activeUsers, days);
  const targetIdle = calculateTarget(10, activeUsers, days);
  const targetBreak = calculateTarget(80, activeUsers, days);


  // Helper to get trend direction and color based on actual/target percentage
  const getTrend = (actual: number | undefined, target: number | undefined) => {
      const act = Number(actual || 0);
      const tgt = Number(target || 1);
      const pct = tgt > 0 ? (act / tgt) * 100 : 0;
      if (pct >= 50) {
          return { trend: 'up', trendColor: 'green' };
      } else {
          return { trend: 'down', trendColor: 'red' };
      }
  };

  const kpiList = [
    { 
        label: "Total time tracked", 
        main: formatDuration(summaryData?.total_time), 
        sub: formatDuration(targetTotal),
        ...getTrend(summaryData?.total_time, targetTotal),
        tooltip: getTooltip(summaryData?.total_time, targetTotal)
    },
    { 
        label: "Productive time", 
        main: formatDuration(summaryData?.productive_time), 
        sub: formatDuration(targetProductive),
        ...getTrend(summaryData?.productive_time, targetProductive),
        tooltip: getTooltip(summaryData?.productive_time, targetProductive)
    },
    { 
        label: "Unproductive time", 
        main: formatDuration(summaryData?.unproductive_time), 
        sub: formatDuration(targetUnproductive),
        ...getTrend(summaryData?.unproductive_time, targetUnproductive),
        tooltip: getTooltip(summaryData?.unproductive_time, targetUnproductive)
    },
    { 
        label: "Neutral & unrated time", 
        main: formatDuration(summaryData?.neutral_time), 
        sub: formatDuration(targetNeutral),
        ...getTrend(summaryData?.neutral_time, targetNeutral),
        tooltip: getTooltip(summaryData?.neutral_time, targetNeutral)
    },
    { 
        label: "Idle time", 
        main: formatDuration(summaryData?.idle_time), 
        sub: formatDuration(targetIdle),
        ...getTrend(summaryData?.idle_time, targetIdle),
        tooltip: getTooltip(summaryData?.idle_time, targetIdle)
    },
    { 
        label: "Break time", 
        main: formatDuration(summaryData?.break_time), 
        sub: formatDuration(targetBreak),
        ...getTrend(summaryData?.break_time, targetBreak),
        tooltip: getTooltip(summaryData?.break_time, targetBreak)
    },
    { 
        label: "Total active users", 
        main: `${activeUsers}`, 
        sub: undefined,
        trend: undefined,
        trendColor: undefined,
        tooltip: "Active users count"
    },
    { 
        label: "Total registered users", 
        main: `${totalUsers}`, 
        sub: "",
        trend: undefined,
        trendColor: undefined,
        tooltip: "Registered users count"
    },

  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-32">
      {/* Top Header Section */}
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-black text-blue-600 tracking-tight">Admin Dashboard</h1>
          <div className="flex items-center gap-4 text-xs text-slate-400 font-bold">
            <span>Last updated: {formatDateTime(new Date())}</span>
            <button onClick={fetchData} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"><RefreshCcw size={14} /></button>
            <button onClick={triggerExport} className="flex items-center gap-2 border border-slate-300 px-4 py-2 rounded-xl hover:bg-slate-50 transition-all bg-white font-bold text-slate-800 shadow-sm">
              <Download size={14} />
              Export
            </button>
          </div>
        </div>

        {/* Filter Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
          {/* Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* User Search Input */}
            <div className="flex items-center gap-4 relative">
              <label className="text-sm font-medium text-slate-500">User:</label>
              <div className="flex-1 relative">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text"
                    placeholder={filterUserId ? filterUserName : "Search users..."}
                    value={userSearchQuery}
                    onChange={(e) => {
                      setUserSearchQuery(e.target.value);
                      setUserSearchOpen(true);
                    }}
                    onFocus={() => setUserSearchOpen(true)}
                    className={`w-full py-2 pl-9 pr-4 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm ${filterUserId ? 'text-blue-600 font-medium' : ''}`}
                  />
                  {filterUserId && (
                    <button 
                      onClick={() => {
                        setFilterUserId(null);
                        setFilterUserName('All Users');
                        setUserSearchQuery('');
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                
                {userSearchOpen && userSearchQuery.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                    <div className="max-h-60 overflow-y-auto">
                      <button 
                        onClick={() => {
                          setFilterUserId(null);
                          setFilterUserName('All Users');
                          setUserSearchOpen(false);
                          setUserSearchQuery('');
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-blue-50 transition-colors flex items-center gap-2 text-slate-700 border-b border-slate-100"
                      >
                        <Users size={14} />
                        All Users
                      </button>
                      {allUsers
                        .filter(u => u.name.toLowerCase().startsWith(userSearchQuery.toLowerCase()) || 
                                     u.name.toLowerCase().includes(userSearchQuery.toLowerCase()))
                        .map((u) => (
                          <button 
                            key={u.id}
                            onClick={() => {
                              setFilterUserId(u.id.toString());
                              setFilterUserName(u.name);
                              setUserSearchOpen(false);
                              setUserSearchQuery('');
                            }}
                            className={`w-full px-4 py-2.5 text-left text-sm hover:bg-blue-50 transition-colors flex items-center gap-2 ${filterUserId === u.id.toString() ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-700'}`}
                          >
                            <User size={14} />
                            {u.name}
                          </button>
                        ))
                      }
                      {allUsers.filter(u => u.name.toLowerCase().startsWith(userSearchQuery.toLowerCase()) || u.name.toLowerCase().includes(userSearchQuery.toLowerCase())).length === 0 && (
                        <div className="px-4 py-3 text-sm text-slate-400 text-center">No users found</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-slate-500">Supervisor:</label>
              <select className="flex-1 py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm">
                <option>All Supervisors</option>
              </select>
            </div>
          </div>

          {/* Time Range Tabs */}
          <div className="flex gap-2">
            {['Daily', 'Yesterday', 'Weekly', 'Monthly'].map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-8 py-2 rounded-lg text-sm font-medium border capitalize ${
                  timeRange === range 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'text-blue-600 border-blue-100 hover:bg-blue-50'
                }`}
              >
                {range}
              </button>
            ))}
            <button 
              onClick={() => setShowDateModal(true)}
              className={`flex-1 px-8 py-2 rounded-lg text-sm font-medium border transition-colors ${
                timeRange.startsWith('custom:')
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'border-purple-200 text-purple-600 hover:bg-purple-50'
              }`}
            >
              {timeRange.startsWith('custom:') ? `${timeRange.split(':')[1]} - ${timeRange.split(':')[2]}` : 'Custom Range'}
            </button>
          </div>
        </div>

        <DateRangeModal
          isOpen={showDateModal}
          onClose={() => setShowDateModal(false)}
          onApply={handleCustomRange}
        />
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiList.map((k, i) => (
            <KPICard 
                key={i} 
                label={k.label} 
                mainValue={k.main} 
                subValue={k.sub} 
                trend={k.trend as any}
                trendColor={k.trendColor as any}
                tooltip={k.tooltip}
            />
        ))}
      </div>

      {/* User Status Panels - Only show for Daily/Yesterday */}
      {(timeRange === 'Daily' || timeRange === 'Yesterday') && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto">
        {/* Active Users */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[400px]">
          <div className="p-6 border-b border-slate-50 flex items-center justify-between">
            <h3 className="font-black text-slate-800 tracking-tight flex items-center gap-2">Active Users</h3>
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {data.statusLists.activeUsers.map((u: any, i: number) => (
              <div 
                key={i} 
                className="flex items-center gap-4 p-3 bg-green-50/20 rounded-lg border-l-4 border-green-500 group hover:bg-green-50 transition-all cursor-pointer"
                onClick={() => {
                    const fullUser = userBreakdown.find((ub: any) => ub.name === u.name) || u;
                    setSelectedUser(fullUser);
                }}
              >
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
      )}

      {/* Analytical Trends Section (Original Scroll Down Content) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SimpleTrendChart data={data.trends.daily} color="#3b82f6" label="Daily Time Tracking Trend" unit="h" />
        <SimpleTrendChart data={data.trends.productive} color="#22c55e" label="Productive Time Trend" unit="h" />
        <SimpleTrendChart data={data.trends.idle} color="#f59e0b" label="Idle Time Trend" unit="m" />
        <SimpleTrendChart data={data.trends.break} color="#ef4444" label="Break Time Trend" unit="m" />
      </div>

      {/* Activity Timeline - Only show when a user is selected */}
      {filterUserId && timelineData && timelineData.sessions && timelineData.sessions.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-800">Activity Timeline - {timelineData.userName || filterUserName}</h2>
            <p className="text-sm text-slate-500 mt-1">
              {timelineData.sessions.length} day{timelineData.sessions.length > 1 ? 's' : ''} timeline - Track work periods across multiple days
            </p>
          </div>
          
          {/* Sessions Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left w-12">Action</th>
                  <th className="px-4 py-3 text-left w-32">Date</th>
                  <th className="px-4 py-3 text-left w-20">Duration</th>
                  <th className="px-4 py-3 text-left w-40">Work Period</th>
                  <th className="px-4 py-3 text-left">Timeline (24 Hour View)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {timelineData.sessions.map((day: any, idx: number) => {
                  const isExpanded = expandedTimelineRows.has(idx);
                  const toggleExpand = () => {
                    setExpandedTimelineRows(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has(idx)) {
                        newSet.delete(idx);
                      } else {
                        newSet.add(idx);
                      }
                      return newSet;
                    });
                  };
                  
                  return (
                    <React.Fragment key={idx}>
                      <tr className="hover:bg-slate-50">
                        <td className="px-4 py-4">
                          <button 
                            onClick={toggleExpand}
                            className="w-8 h-8 rounded-lg bg-blue-100 hover:bg-blue-200 flex items-center justify-center transition-colors"
                            title={isExpanded ? 'Collapse' : 'Expand'}
                          >
                            {isExpanded ? (
                              <ChevronDown size={16} className="text-blue-600" />
                            ) : (
                              <ChevronRight size={16} className="text-blue-600" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-medium text-slate-800">{day.displayDate}</p>
                          <p className="text-xs text-slate-400">{day.sessionCount} session{day.sessionCount > 1 ? 's' : ''}</p>
                        </td>
                        <td className="px-4 py-4">
                          <span className="font-bold text-green-600">{formatDuration(day.totalTime)}</span>
                        </td>
                        <td className="px-4 py-4 text-slate-600">{day.workPeriod}</td>
                        <td className="px-4 py-4">
                          {/* 24 Hour Timeline Bar */}
                          {/* Labels above timeline */}
                          <div className="flex justify-between mb-1 text-[9px] text-slate-400">
                            <span>2 AM</span>
                            <span>6 AM</span>
                            <span>10 AM</span>
                            <span>2 PM</span>
                            <span>6 PM</span>
                            <span>10 PM</span>
                          </div>
                          <div className="relative h-6 bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                            {/* Active periods only - green bars */}
                            {day.sessions.flatMap((session: any, sIdx: number) => 
                              (session.activePeriods || []).map((period: any, pIdx: number) => {
                                // Use API-provided hour values (already timezone-adjusted) or fallback to parsing
                                let startHour = period.startHour;
                                let endHour = period.endHour;
                                
                                // Fallback to parsing if hour values not provided
                                if (startHour === undefined || endHour === undefined) {
                                  const parseTime = (timeStr: string) => {
                                    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
                                    if (!match) return 0;
                                    let hour = parseInt(match[1]);
                                    const min = parseInt(match[2]);
                                    const ampm = match[3].toUpperCase();
                                    if (ampm === 'PM' && hour !== 12) hour += 12;
                                    if (ampm === 'AM' && hour === 12) hour = 0;
                                    return hour + min / 60;
                                  };
                                  startHour = parseTime(period.startTime);
                                  endHour = parseTime(period.endTime);
                                }
                                
                                const startPct = (startHour / 24) * 100;
                                const widthPct = Math.max(((endHour - startHour) / 24) * 100, 0.5);
                                
                                return (
                                  <div
                                    key={`${sIdx}-${pIdx}`}
                                    className="absolute top-1 bottom-1 bg-green-500 rounded"
                                    style={{
                                      left: `${startPct}%`,
                                      width: `${widthPct}%`
                                    }}
                                    title={`Active: ${period.startTime} - ${period.endTime}`}
                                  />
                                );
                              })
                            )}
                          </div>
                        </td>
                      </tr>
                      
                      {/* Expandable Activity Breakdown Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/50">
                          <td colSpan={5} className="p-6">
                            <h4 className="text-sm font-bold text-slate-700 mb-4">
                              Activity Breakdown - {day.displayDate}
                            </h4>
                            
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                              <div className="bg-white p-4 rounded-xl border border-slate-100">
                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active Time</p>
                                <p className="text-2xl font-bold text-green-600 mt-1">{formatDuration(day.activeTime)}</p>
                              </div>
                              <div className="bg-white p-4 rounded-xl border border-slate-100">
                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Idle Time</p>
                                <p className="text-2xl font-bold text-slate-600 mt-1">{formatDuration(day.idleTime)}</p>
                              </div>
                              <div className="bg-white p-4 rounded-xl border border-slate-100">
                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Sessions</p>
                                <p className="text-2xl font-bold text-blue-600 mt-1">{day.sessionCount}</p>
                              </div>
                            </div>

                            {/* All Periods Bar */}
                            <div>
                              <p className="text-xs font-bold text-slate-600 mb-2">All Periods</p>
                              <div className="space-y-2">
                                {/* Show each individual active period from all sessions */}
                                {day.sessions.flatMap((session: any, sIdx: number) => 
                                  (session.activePeriods || [{ startTime: session.startTime, endTime: session.endTime, duration: session.activeTime }])
                                    .map((period: any, pIdx: number) => (
                                      <div key={`${sIdx}-${pIdx}`} className="flex items-center justify-between py-1">
                                        <span className="text-xs text-green-600 flex items-center gap-1">
                                          <span className="w-2 h-2 bg-green-500 rounded-full"></span> Active
                                        </span>
                                        <span className="text-xs text-slate-500">{period.startTime} - {period.endTime}</span>
                                        <span className="text-xs font-bold text-slate-600">{formatDuration(period.duration)}</span>
                                      </div>
                                    ))
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User Rankings Section */}
      <div className="space-y-8">
        <HorizontalBarChart 
          items={data.rankings.topUsers} 
          color="#3b82f6" 
          label="Top Users by Tracked Hours" 
          maxVal={9} 
          onBarClick={(item) => {
            if (item?.userId) {
              setFilterUserId(item.userId);
              setFilterUserName(item.name);
              setUserSearchQuery('');
              setExpandedTimelineRows(new Set());
            }
          }}
        />
        <HorizontalBarChart 
          items={data.rankings.bottomUsers} 
          color="#ef4444" 
          label="Bottom Users by Tracked Hours" 
          maxVal={3.5}
          onBarClick={(item) => {
            if (item?.userId) {
              setFilterUserId(item.userId);
              setFilterUserName(item.name);
              setUserSearchQuery('');
              setExpandedTimelineRows(new Set());
            }
          }}
        />
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

       {/* User Activity Level Distribution */}
       <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
         <h3 className="text-sm font-bold text-slate-700 mb-8 uppercase tracking-widest">User Activity Level Distribution</h3>
         <div className="space-y-8">
           {(() => {
               const groups = {
                 'Very High': [] as any[],
                 'High': [] as any[],
                 'Low': [] as any[],
                 'Very Low': [] as any[]
               };
       
               userBreakdown.forEach(user => {
                  const tracked = Number(user.tracked);
                  const idle = Number(user.idle);
                  const breakTime = Number(user.break_time || 0);
                  
                  // Formula: ((Tracked - Idle - Break) / Tracked) * 100
                  const activeTime = tracked - idle - breakTime;
                  const progress = tracked > 0 ? (activeTime / tracked) * 100 : 0;
                  
                  if (progress >= 75) groups['Very High'].push(user);
                  else if (progress >= 50) groups['High'].push(user);
                  else if (progress >= 25) groups['Low'].push(user);
                  else groups['Very Low'].push(user);
               });

               const renderCategory = (label: string, users: any[], colorClass: string, bgClass: string, borderClass: string) => (
                   <div 
                        className="flex items-center gap-8 cursor-pointer group"
                        onClick={() => setSelectedCategory({ label, users })}
                   >
                     <span className={`w-24 text-sm font-black ${colorClass} uppercase tracking-tighter group-hover:scale-105 transition-transform`}>{label}</span>
                     <div className="flex flex-wrap gap-2">
                       {users.map((u, i) => (
                         <span 
                           key={i} 
                           onClick={(e) => { e.stopPropagation(); setSelectedUser(u); }}
                           className={`px-3 py-1.5 ${bgClass} ${colorClass} rounded-full text-[10px] font-bold ${borderClass} group-hover:shadow-sm transition-shadow cursor-pointer hover:scale-105`}
                         >
                           {u.name}
                         </span>
                       ))}
                       {users.length === 0 && <span className="text-slate-400 text-xs italic">No users</span>}
                     </div>
                   </div>
               );

               return (
                   <>
                       {renderCategory('Very High', groups['Very High'], 'text-green-600', 'bg-green-50', 'border border-green-100')}
                       {renderCategory('High', groups['High'], 'text-amber-500', 'bg-amber-50', 'border border-amber-100')}
                       {renderCategory('Low', groups['Low'], 'text-orange-500', 'bg-orange-50', 'border border-orange-100')}
                       {renderCategory('Very Low', groups['Very Low'], 'text-red-500', 'bg-red-50', 'border border-red-100')}
                   </>
               );
           })()}
         </div>
       </div>

       {/* Modal Overlay */}
       {selectedCategory && (
            <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedCategory(null)}>
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                    {/* Modal Header */}
                    <div className={`p-6 border-b border-slate-100 flex justify-between items-center ${
                            selectedCategory.label === 'Very High' ? 'bg-green-50' :
                            selectedCategory.label === 'High' ? 'bg-yellow-50' :
                            selectedCategory.label === 'Low' ? 'bg-orange-50' : 'bg-red-50'
                    }`}>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">{selectedCategory.label} Activity Users</h3>
                            <p className="text-slate-500 text-sm mt-1">Total users: {selectedCategory.users.length}</p>
                        </div>
                        <button onClick={() => setSelectedCategory(null)} className="p-2 hover:bg-black/5 rounded-full transition-colors text-slate-500">
                            <X size={20} />
                        </button>
                    </div>
                    
                    {/* Modal Body */}
                    <div className="p-6 overflow-y-auto bg-slate-50/50">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {selectedCategory.users.map((user, idx) => {
                                    const tracked = Number(user.tracked);
                                    const idle = Number(user.idle);
                                    const breakTime = Number(user.break_time || 0);
                                    const active = tracked - idle - breakTime; 
                                    const productive = Number(user.productive);
                                    
                                    const progress = tracked > 0 ? (active / tracked) * 100 : 0;
                                    
                                    return (
                                        <div key={idx} className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className="font-bold text-slate-800 text-lg leading-tight">{user.name}</h4>
                                                    <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs text-slate-500">Activity Level:</span>
                                                    <span className="text-sm font-bold text-slate-700">{progress.toFixed(1)}%</span>
                                                    </div>
                                                </div>
                                                <span className="text-lg font-bold text-slate-400">{progress.toFixed(1)}%</span>
                                            </div>
                                            
                                            <div className="grid grid-cols-5 gap-2 text-center text-xs">
                                                <div className="space-y-1">
                                                    <p className="text-green-600 font-bold">Active</p>
                                                    <p className="text-slate-600 font-medium">{formatDuration(active)}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-amber-500 font-bold">Idle</p>
                                                    <p className="text-slate-600 font-medium">{formatDuration(idle)}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-purple-500 font-bold">Break</p>
                                                    <p className="text-slate-600 font-medium">{formatDuration(breakTime)}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-blue-600 font-bold">Productive</p>
                                                    <p className="text-slate-600 font-medium">{formatDuration(productive)}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-blue-600 font-bold">Tracked</p>
                                                    <p className="text-slate-600 font-medium">{formatDuration(tracked)}</p>
                                                </div>
                                            </div>

                                            <div className="space-y-1.5 pt-2 border-t border-slate-50">
                                                <div className="flex justify-between text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                                                    <span>Activity Progress</span>
                                                    <span>{progress.toFixed(1)}%</span>
                                                </div>
                                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                    <div 
                                                    className={`h-full rounded-full ${progress >= 85 ? 'bg-green-500' : progress >= 50 ? 'bg-blue-500' : 'bg-red-500'}`} 
                                                    style={{ width: `${progress}%` }} 
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                    </div>
                </div>
            </div>
        )}

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
                <tr 
                    key={i} 
                    className="hover:bg-slate-50 cursor-pointer group"
                    onClick={() => {
                        const fullUser = userBreakdown.find((ub: any) => ub.name === row.name) || row;
                        setSelectedUser(fullUser);
                    }}
                >
                  <td className="px-8 py-4 font-bold text-slate-700 group-hover:text-blue-600 transition-colors">{row.name}</td>
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

      {/* User Detail Modal */}
      {selectedUser && (
             <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => setSelectedUser(null)}>
                 <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h3 className="text-lg font-bold text-slate-800">User Details</h3>
                        <button onClick={() => setSelectedUser(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                    </div>
                    <div className="p-6">
                        <div className="flex justify-between items-start mb-6">
                             <div>
                                 <h4 className="font-bold text-slate-800 text-xl leading-tight">{selectedUser.name}</h4>
                                 <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-slate-500">Total Tracked:</span>
                                    <span className="text-sm font-bold text-slate-700">{formatDuration(selectedUser.tracked || selectedUser.total_time)}</span>
                                 </div>
                             </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-6">
                             <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                                 <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Active Time</p>
                                 <p className="text-lg font-bold text-green-600">{formatDuration(Number(selectedUser.tracked) - Number(selectedUser.idle) - Number(selectedUser.break_time))}</p>
                             </div>
                             <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                                 <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Idle Time</p>
                                 <p className="text-lg font-bold text-amber-500">{formatDuration(selectedUser.idle)}</p>
                             </div>
                             <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                                 <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Break Time</p>
                                 <p className="text-lg font-bold text-purple-500">{formatDuration(selectedUser.break_time)}</p>
                             </div>
                              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                                 <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Productive</p>
                                 <p className="text-lg font-bold text-blue-600">{formatDuration(selectedUser.productive)}</p>
                             </div>
                        </div>
                    </div>
                 </div>
             </div>
      )}
    </div>
  );
};

export default MainDashboard;
