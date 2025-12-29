import React, { useState, useEffect } from 'react';
import { useExport } from '../contexts/ExportContext';
import KPICard from '../components/KPICard';
import { Download, ExternalLink, RefreshCcw, Loader2 } from 'lucide-react';
import { db } from '../services/dataService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import DateRangeModal from '../components/DateRangeModal';

const SummaryDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [productiveApps, setProductiveApps] = useState<any[]>([]);
  const [unproductiveApps, setUnproductiveApps] = useState<any[]>([]);
  const [userActivity, setUserActivity] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any>({ unproductive: [], trends: [] });
  const [selectedRange, setSelectedRange] = useState('daily');
  const [shifts, setShifts] = useState<any[]>([]);
  const [selectedShift, setSelectedShift] = useState('All');
  const [showDateModal, setShowDateModal] = useState(false);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      // Fetch shifts if empty
      if (shifts.length === 0) {
          db.getShifts().then(setShifts);
      }

      const [summary, prodApps, unprodApps, activity, charts] = await Promise.all([
        db.getSummaryKPIs(selectedRange, selectedShift === 'All' ? undefined : selectedShift),
        db.getTopApps('productive', selectedRange, selectedShift === 'All' ? undefined : selectedShift),
        db.getTopApps('unproductive', selectedRange, selectedShift === 'All' ? undefined : selectedShift),
        db.getUserActivityStats(selectedRange, selectedShift === 'All' ? undefined : selectedShift),
        db.getChartData(selectedRange, selectedShift === 'All' ? undefined : selectedShift)
      ]);
      setData(summary);
      setProductiveApps(prodApps);
      setUnproductiveApps(unprodApps);
      setUserActivity(activity);
      setChartData(charts);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSummary();
  }, [selectedRange, selectedShift]);

  const { registerExportHandler, triggerExport } = useExport();

  useEffect(() => {
    registerExportHandler(() => {
      if (!data) return;

      const kpis = [
        { label: "Total time tracked", value: formatDuration(data?.total_time) },
        { label: "Productive time", value: formatDuration(data?.productive_time) },
        { label: "Unproductive time", value: formatDuration(data?.unproductive_time) },
        { label: "Neutral time", value: formatDuration(data?.neutral_time) },
        { label: "Idle time", value: formatDuration(data?.idle_time) },
        { label: "Break time", value: formatDuration(data?.break_time) },
        { label: "Active Users", value: data?.active_users || 0 },
        { label: "Registered Users", value: data?.registered_users || 0 },
      ];

      // Prepare Tables
      const prodRows = productiveApps.map(a => [a.name, a.category, a.total_time]);
      const unprodRows = unproductiveApps.map(a => [a.name, a.category, a.total_time]);

      let csv = "data:text/csv;charset=utf-8,";
      
      // KPI Section
      csv += "SUMMARY KPIS\n";
      csv += ["Metric,Value"].join("\n") + "\n";
      csv += kpis.map(k => `${k.label},${k.value}`).join("\n") + "\n\n";

      // Productive Apps Section
      csv += "TOP PRODUCTIVE APPS\n";
      csv += ["Name,Category,Time"].join(",") + "\n";
      csv += prodRows.map(r => r.join(",")).join("\n") + "\n\n";

      // Unproductive Apps Section
      csv += "TOP UNPRODUCTIVE APPS\n";
      csv += ["Name,Category,Time"].join(",") + "\n";
      csv += unprodRows.map(r => r.join(",")).join("\n");

      const encodedUri = encodeURI(csv);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `summary_dashboard_${selectedRange}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }, [data, selectedRange, registerExportHandler, productiveApps, unproductiveApps]);

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

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  // Helper to format seconds to "Xh Ym"
  const formatDuration = (seconds?: number | string) => {
    if (!seconds) return "0h 0m";
    const sec = Number(seconds);
    if (isNaN(sec)) return "0h 0m";
    
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const totalTime = Number(data?.total_time || 0);
  const totalUsers = Number(data?.registered_users || 0);
  const totalTimeFormatted = formatDuration(totalTime);

  const kpiList = [
    { label: "Total time tracked", main: formatDuration(data?.total_time), sub: "" },
    { label: "Productive time", main: formatDuration(data?.productive_time), sub: totalTimeFormatted },
    { label: "Unproductive time", main: formatDuration(data?.unproductive_time), sub: totalTimeFormatted },
    { label: "Neutral time", main: formatDuration(data?.neutral_time), sub: totalTimeFormatted },
    { label: "Idle time", main: formatDuration(data?.idle_time), sub: totalTimeFormatted },
    { label: "Break time", main: formatDuration(data?.break_time), sub: totalTimeFormatted },
    { label: "Total active users", main: data?.active_users || "0", sub: undefined },
    { label: "Total registered users", main: `${totalUsers}`, sub: "" }
  ];

  const ranges = [
      { id: 'daily', label: 'Daily' },
      { id: 'yesterday', label: 'Yesterday' },
      { id: 'weekly', label: 'Weekly' },
      { id: 'monthly', label: 'Monthly' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Summary Dashboard</h1>
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span>Last updated: {new Date().toLocaleString()}</span>
          <button onClick={fetchSummary} className="p-1.5 hover:bg-slate-100 rounded transition-colors"><RefreshCcw size={14} /></button>
          <button onClick={triggerExport} className="flex items-center gap-2 border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors font-bold text-slate-800">
            <Download size={14} />
            Export
          </button>
        </div>
      </div>

      {/* Filter Card */}
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
           {ranges.map(range => (
            <button 
                key={range.id}
                onClick={() => setSelectedRange(range.id)}
                className={`px-8 py-2 rounded-lg text-sm font-medium border capitalize ${
                    selectedRange === range.id 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'text-blue-600 border-blue-100 hover:bg-blue-50'
                }`}
            >
              {range.label}
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
      </div>

      <DateRangeModal 
        isOpen={showDateModal} 
        onClose={() => setShowDateModal(false)} 
        onApply={handleCustomRange} 
      />

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiList.map((k, i) => <KPICard key={i} label={k.label} mainValue={k.main} subValue={k.sub} />)}
      </div>

      {/* Top Productive Apps */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Top Used Productive Websites & Apps</h2>
          <table className="w-full text-sm text-left">
              <thead className="bg-blue-50/50 text-slate-500 font-bold text-xs uppercase">
                  <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Total Time</th>
                      <th className="px-4 py-3">% of Productive Time</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                  {productiveApps.map((app, i) => {
                      const isUrl = app.name.includes('(URL)') || app.name.includes('.');
                      const url = isUrl ? `https://${app.name.replace(' (URL)', '').replace(' (APP)', '')}` : '#';
                      return (
                      <tr key={i} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-blue-600 font-medium">
                              {isUrl ? (
                                  <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:underline">
                                      {app.name} <ExternalLink size={12} />
                                  </a>
                              ) : (
                                  <span className="flex items-center gap-2">
                                      {app.name}
                                  </span>
                              )}
                          </td>
                          <td className="px-4 py-3 text-slate-500">{app.category}</td>
                          <td className="px-4 py-3 text-slate-600 font-medium">{formatDuration(app.total_time)}</td>
                          <td className="px-4 py-3 text-slate-500">{((Number(app.total_time) / Number(data.productive_time || 1)) * 100).toFixed(1)}%</td>
                      </tr>
                      );
                  })}
              </tbody>
          </table>
      </div>

       {/* Top Unproductive Apps */}
       <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Top Used Unproductive Websites & Apps</h2>
          <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase">
                  <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Total Time</th>
                      <th className="px-4 py-3">% of Unproductive Time</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                  {unproductiveApps.map((app, i) => {
                      const isUrl = app.name.includes('(URL)') || app.name.includes('.');
                      const url = isUrl ? `https://${app.name.replace(' (URL)', '').replace(' (APP)', '')}` : '#';
                      return (
                      <tr key={i} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-blue-600 font-medium">
                              {isUrl ? (
                                  <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:underline">
                                      {app.name} <ExternalLink size={12} />
                                  </a>
                              ) : (
                                  <span className="flex items-center gap-2">
                                      {app.name}
                                  </span>
                              )}
                          </td>
                          <td className="px-4 py-3 text-slate-500">{app.category}</td>
                          <td className="px-4 py-3 text-slate-600 font-medium">{formatDuration(app.total_time)}</td>
                          <td className="px-4 py-3 text-slate-500">{((Number(app.total_time) / Number(data.unproductive_time || 1)) * 100).toFixed(1)}%</td>
                      </tr>
                      );
                  })}
              </tbody>
          </table>
      </div>

       {/* Lowest Activity Difference */}
       <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-6">Users With Lowest Activity Difference</h2>
          <div className="space-y-6">
              {userActivity.map((user, i) => {
                  const activityPct = user.total_time > 0 ? ((user.productive_time / user.total_time) * 100).toFixed(0) : 0;
                  const maxTime = Math.max(...userActivity.map(u => Number(u.total_time)), 3600); // Avoid div/0, min 1hr baseline
                  const barWidth = ((user.total_time / maxTime) * 100).toFixed(1);

                  return (
                  <div key={i} className="space-y-2">
                      <div className="flex justify-between items-end">
                          <div>
                              <h3 className="font-bold text-slate-800">{user.name}</h3>
                              <p className="text-xs text-slate-400">Activity: {activityPct}%</p>
                          </div>
                          <div className="flex gap-4 text-xs">
                              <div className="text-center"><span className="text-green-500 font-bold block">Activity</span> {formatDuration(user.productive_time)}</div>
                              <div className="text-center"><span className="text-orange-500 font-bold block">Idle</span> {formatDuration(user.idle_time)}</div>
                          </div>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${barWidth}%` }}></div>
                      </div>
                  </div>
                  );
              })}
          </div>
      </div>

      {/* Charts Section */}
      <div className="space-y-6">
          {/* Row 1: Highest % Unproductive Time (Full Width) */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-4">Highest % Unproductive Time On Websites And Apps</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData.unproductive}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                        <YAxis fontSize={10} axisLine={false} tickLine={false} unit="%" />
                        <Tooltip 
                            cursor={{fill: 'transparent'}} 
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                    <div className="bg-slate-800 text-white text-xs p-2 rounded shadow-lg">
                                    <p className="font-bold mb-1">{data.name}</p>
                                    <p>Unproductive: {data.hours} hrs ({data.value}%)</p>
                                    </div>
                                );
                                }
                                return null;
                            }}
                        />
                        <Bar dataKey="value" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={40} name="Unproductive" />
                        <Legend iconType="circle" />
                    </BarChart>
                </ResponsiveContainer>
              </div>
          </div>

          {/* Row 2: Trends Charts (2 Columns) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Tracked & Productive Time Trends */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                  <h2 className="text-lg font-bold text-slate-800 mb-4">Tracked & Productive Time Trends</h2>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData.trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#64748B'}} dy={10} />
                            <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#64748B'}} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#1E293B', border: 'none', borderRadius: '8px', color: '#fff' }}
                                itemStyle={{ color: '#fff' }}
                                labelStyle={{ color: '#94A3B8', marginBottom: '4px' }}
                            />
                            <Legend iconType="circle" wrapperStyle={{ top: -10, right: 0 }} />
                            <Line type="monotone" dataKey="tracked" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, strokeWidth: 2, fill: '#fff'}} activeDot={{r: 6, strokeWidth: 2, fill: '#fff'}} name="Tracked Time" />
                            <Line type="monotone" dataKey="productive" stroke="#22c55e" strokeWidth={3} dot={{r: 4, strokeWidth: 2, fill: '#fff'}} activeDot={{r: 6, strokeWidth: 2, fill: '#fff'}} name="Productive Time" />
                        </LineChart>
                    </ResponsiveContainer>
                  </div>
              </div>

              {/* Break & Idle Time Trends */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                  <h2 className="text-lg font-bold text-slate-800 mb-4">Break & Idle Time Trends</h2>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData.trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#64748B'}} dy={10} />
                            <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#64748B'}} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#1E293B', border: 'none', borderRadius: '8px', color: '#fff' }}
                                itemStyle={{ color: '#fff' }}
                                labelStyle={{ color: '#94A3B8', marginBottom: '4px' }}
                            />
                            <Legend iconType="circle" wrapperStyle={{ top: -10, right: 0 }} />
                            <Line type="monotone" dataKey="idle" stroke="#ef4444" strokeWidth={3} dot={{r: 4, strokeWidth: 2, fill: '#fff'}} activeDot={{r: 6, strokeWidth: 2, fill: '#fff'}} name="Idle Time" />
                            <Line type="monotone" dataKey="break" stroke="#f97316" strokeWidth={3} dot={{r: 4, strokeWidth: 2, fill: '#fff'}} activeDot={{r: 6, strokeWidth: 2, fill: '#fff'}} name="Break Time" />
                        </LineChart>
                    </ResponsiveContainer>
                  </div>
              </div>
          </div>
      </div>

    </div>
  );
};

export default SummaryDashboard;
