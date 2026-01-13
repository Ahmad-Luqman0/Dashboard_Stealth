
import React from 'react';
import { Download, RefreshCcw, Maximize2, Minimize2, ChevronRight, X } from 'lucide-react';
import { useExport } from '../contexts/ExportContext';
import { useTimezone } from '../contexts/TimezoneContext';
import DateRangeModal from '../components/DateRangeModal';

const ExecutiveDashboard: React.FC = () => {
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<any>(null);
  const [productiveApps, setProductiveApps] = React.useState<any[]>([]);
  const [unproductiveApps, setUnproductiveApps] = React.useState<any[]>([]);
  const [neutralApps, setNeutralApps] = React.useState<any[]>([]);
  const [selectedRange, setSelectedRange] = React.useState('daily');
  const [selectedUser, setSelectedUser] = React.useState<any>(null);
  const [shifts, setShifts] = React.useState<any[]>([]);
  const [userBreakdown, setUserBreakdown] = React.useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = React.useState<{label: string, users: any[]} | null>(null);
  const [selectedShift, setSelectedShift] = React.useState('All');
  const [expandedRow, setExpandedRow] = React.useState<string[]>([]);
  const [showDateModal, setShowDateModal] = React.useState(false);

  // ... (existing code)

  // Calculate Activity Breakdown Groups (Derived)
  const activityGroups = React.useMemo(() => {
    const g = {
        'Very High': [] as any[],
        'High': [] as any[],
        'Low': [] as any[],
        'Very Low': [] as any[]
    };
    userBreakdown.forEach(user => {
         const tracked = Number(user.tracked);
         const idle = Number(user.idle);
         const breakTime = Number(user.break_time || 0);
         const activeTime = tracked - idle - breakTime;
         const progress = tracked > 0 ? (activeTime / tracked) * 100 : 0;
         
         if (progress >= 75) g['Very High'].push(user);
         else if (progress >= 50) g['High'].push(user);
         else if (progress >= 25) g['Low'].push(user);
         else g['Very Low'].push(user);
    });
    return g;
  }, [userBreakdown]);

  // Derived: Top Idle Users
  const topIdleUsers = React.useMemo(() => {
      return Array.isArray(userBreakdown) ? [...userBreakdown]
          .filter(u => u && Number(u.idle) > 0)
          .sort((a, b) => Number(b.idle) - Number(a.idle))
          .map(u => ({
              name: u.name,
              category: 'User', 
              total_time: u.idle,
              ...u
          })) : [];
  }, [userBreakdown]);

  const activityCategories = [
    { label: 'Very High', users: activityGroups['Very High'], bg: 'bg-green-100', text: 'text-green-700', labelColor: 'text-green-600' }, 
    { label: 'High', users: activityGroups['High'], bg: 'bg-yellow-100', text: 'text-yellow-700', labelColor: 'text-yellow-600' }, 
    { label: 'Low', users: activityGroups['Low'], bg: 'bg-orange-100', text: 'text-orange-700', labelColor: 'text-orange-600' }, 
    { label: 'Very Low', users: activityGroups['Very Low'], bg: 'bg-red-100', text: 'text-red-700', labelColor: 'text-red-600' }, 
  ];

  // (This replaces lines 147-175 and moves them to main scope)

  // ... (renderExpandedContent for login can now reference activityCategories or be removed if moved to main view)
  // ... (In return statement, above Detailed View)

  // ... (In return statement, above Detailed View)
  
  /* User Detail Modal Logic (reuse card) */
  const renderUserDetail = (user: any) => {
        if (!user) return null;
        const tracked = Number(user.tracked);
        const idle = Number(user.idle);
        const breakTime = Number(user.break_time || 0);
        const active = tracked - idle - breakTime; 
        const productive = Number(user.productive);
        const progress = tracked > 0 ? (active / tracked) * 100 : 0;

         return (
             <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => setSelectedUser(null)}>
                 <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h3 className="text-lg font-bold text-slate-800">User Details</h3>
                        <button onClick={() => setSelectedUser(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                    </div>
                    <div className="p-6">
                        <div className="flex justify-between items-start mb-6">
                             <div>
                                 <h4 className="font-bold text-slate-800 text-xl leading-tight">{user.name}</h4>
                                 <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-slate-500">Activity Level:</span>
                                    <span className="text-sm font-bold text-slate-700">{progress.toFixed(1)}%</span>
                                 </div>
                             </div>
                             <span className={`text-xl font-bold ${progress >= 50 ? 'text-green-500' : 'text-slate-400'}`}>{progress.toFixed(1)}%</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-6">
                             <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                                 <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Active Time</p>
                                 <p className="text-lg font-bold text-green-600">{formatDuration(active)}</p>
                             </div>
                             <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                                 <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Idle Time</p>
                                 <p className="text-lg font-bold text-amber-500">{formatDuration(idle)}</p>
                             </div>
                             <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                                 <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Break Time</p>
                                 <p className="text-lg font-bold text-purple-500">{formatDuration(breakTime)}</p>
                             </div>
                              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                                 <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Productive</p>
                                 <p className="text-lg font-bold text-blue-600">{formatDuration(productive)}</p>
                             </div>
                        </div>

                        <div className="space-y-2">
                             <div className="flex justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
                                 <span>Activity Progress</span>
                                 <span>{progress.toFixed(1)}%</span>
                             </div>
                             <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                 <div 
                                    className={`h-full rounded-full ${progress >= 85 ? 'bg-green-500' : progress >= 50 ? 'bg-blue-500' : 'bg-red-500'} transition-all duration-500`} 
                                    style={{ width: `${progress}%` }} 
                                 />
                             </div>
                        </div>
                    </div>
                 </div>
             </div>
         );
  };

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

      const [summary, prod, unprod, neutral, userActivity] = await Promise.all([
        import('../services/dataService').then(m => m.db.getSummaryKPIs(selectedRange, selectedShift === 'All' ? undefined : selectedShift)),
        import('../services/dataService').then(m => m.db.getTopApps('productive', selectedRange, selectedShift === 'All' ? undefined : selectedShift)),
        import('../services/dataService').then(m => m.db.getTopApps('unproductive', selectedRange, selectedShift === 'All' ? undefined : selectedShift)),
        import('../services/dataService').then(m => m.db.getTopApps('neutral', selectedRange, selectedShift === 'All' ? undefined : selectedShift)),
        import('../services/dataService').then(m => m.db.getUserActivityBreakdown(selectedRange, selectedShift === 'All' ? undefined : selectedShift))
      ]);
      setData(summary);
      setProductiveApps(prod);
      setUnproductiveApps(unprod);
      setNeutralApps(neutral);
      setUserBreakdown(userActivity);
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
  const loggedInUsers = Number(data?.logged_in_users || 0);
  const totalTime = Number(data?.total_time || 0);
  const productiveTime = Number(data?.productive_time || 0);

  // Days multiplier for custom date ranges
  const getDaysMultiplier = (range: string) => {
    if (range.startsWith('custom:')) {
      const parts = range.split(':');
      if (parts.length === 3) {
        const start = new Date(parts[1]);
        const end = new Date(parts[2]);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
      }
    }
    switch (range) {
      case 'daily': return 1;
      case 'yesterday': return 1;
      case 'weekly': return 7;
      case 'monthly': return 30;
      default: return 1;
    }
  };

  const days = getDaysMultiplier(selectedRange);
  
  // Calculate target using formula: threshold_minutes × activeUsers × days × 60 (seconds)
  const calculateTarget = (minutesPerDay: number) => {
    return minutesPerDay * Math.max(activeUsers, 1) * days * 60;
  };

  // Targets using the correct formula (minutes per person per day)
  const targetSession = calculateTarget(460);        // Total time: 460 mins
  const targetProductivity = calculateTarget(390);   // Productive time: 390 mins
  const targetUnproductive = calculateTarget(40);    // Unproductive time: 40 mins
  const targetNeutral = calculateTarget(20);         // Neutral time: 20 mins
  const targetIdle = calculateTarget(10);            // Idle time: 10 mins
  const targetBreak = calculateTarget(80);           // Break time: 80 mins

  const rows = [
    { 
      id: 'login',
      label: "Login", 
      target: totalUsers.toString(), 
      actual: loggedInUsers.toString(), 
      percentage: totalUsers > 0 ? ((loggedInUsers / totalUsers) * 100).toFixed(2) : "0.00", 
      status: loggedInUsers < totalUsers * 0.9 ? 'red' : 'green',
      hasData: userBreakdown && userBreakdown.length > 0
    },
    { 
      id: 'session',
      label: "Session", 
      target: formatDuration(targetSession), 
      actual: formatDuration(totalTime), 
      percentage: calculatePercentage(totalTime, targetSession), 
      status: totalTime < targetSession * 0.8 ? 'red' : 'green',
      hasData: totalTime > 0 || unproductiveApps.length > 0 || neutralApps.length > 0 || topIdleUsers.length > 0
    },
    { 
      id: 'productivity',
      label: "Productivity", 
      target: formatDuration(targetProductivity), 
      actual: formatDuration(productiveTime), 
      percentage: calculatePercentage(productiveTime, targetProductivity), 
      status: productiveTime < targetProductivity * 0.8 ? 'red' : 'green',
      hasData: productiveApps && productiveApps.length > 0
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
    if (rowId === 'login') {
      return (
        <div className="bg-white p-6 border-t border-slate-100">
             <h3 className="text-sm font-bold text-slate-700 mb-4">User Activity Level Distribution</h3>
             <div className="space-y-4">
                 <div className="grid grid-cols-[120px_1fr] gap-4 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                     <div>Activity Level</div>
                     <div>Users</div>
                 </div>
                 {activityCategories.map((cat, idx) => (
                     <div key={idx} className="grid grid-cols-[120px_1fr] gap-4 items-center group">
                         <div 
                            className={`font-bold ${cat.labelColor} cursor-pointer hover:underline decoration-2 underline-offset-4`}
                            onClick={() => setSelectedCategory({ label: cat.label, users: cat.users })}
                         >
                            {cat.label}
                         </div>
                         <div className="flex flex-wrap gap-2 items-center">
                             {cat.users.length > 0 ? (
                                 <>
                                     {cat.users.slice(0, 5).map((u, i) => (
                                         <button 
                                            key={i} 
                                            onClick={(e) => { e.stopPropagation(); setSelectedUser(u); }}
                                            className={`px-3 py-1 rounded-full text-xs font-bold ${cat.bg} ${cat.text} shadow-sm border border-transparent hover:scale-105 active:scale-95 transition-all`}
                                         >
                                             {u.name}
                                         </button>
                                     ))}
                                     {cat.users.length > 5 && (
                                         <button 
                                            className={`px-3 py-1 rounded-full text-xs font-bold ${cat.bg} ${cat.text} shadow-sm cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1`}
                                            onClick={() => setSelectedCategory({ label: cat.label, users: cat.users })}
                                         >
                                             +{cat.users.length - 5} more
                                         </button>
                                     )}
                                 </>
                             ) : (
                                 <span className="text-slate-300 text-xs italic font-medium">No users</span>
                             )}
                              {cat.users.length > 0 && cat.users.length <= 5 && (
                                <button 
                                    onClick={() => setSelectedCategory({ label: cat.label, users: cat.users })}
                                    className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <ChevronRight size={14} />
                                </button>
                             )}
                         </div>
                     </div>
                 ))}
             </div>
             
             {/* Modal Overlay for Category List (keep legacy support) */}
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
                                     
                                     // Activity Level = (Active Time / Total Tracked Time) * 100
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
        </div>
      );

    }

    if (rowId === 'session') {
       const breakdown = [
           { id: 'session-unproductive', label: 'Unproductive Time', actual: data?.unproductive_time, target: targetUnproductive, apps: unproductiveApps, type: 'app' }, 
           { id: 'session-neutral', label: 'Neutral & Unrated Time', actual: data?.neutral_time, target: targetNeutral, apps: neutralApps, type: 'app' },
           { id: 'session-break', label: 'Break Time', actual: data?.break_time, target: targetBreak, apps: [], type: 'app' },
           { id: 'session-idle', label: 'Idle Time', actual: data?.idle_time, target: targetIdle, apps: topIdleUsers, type: 'user' },
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
                           const targetVal = Number(b.target) || 1;
                           const pct = (Number(b.actual) / targetVal) * 100;
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
                                           <div 
                                                className="cursor-pointer p-1 hover:bg-slate-200 rounded-full transition-colors inline-block"
                                                onClick={(e) => { e.stopPropagation(); toggleRow(b.id); }}
                                           >
                                                <ChevronRight size={14} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                           </div>
                                       ) : (
                                           null
                                       )}
                                   </td>
                                   <td className="px-6 py-3 font-medium text-slate-700">{b.label}</td>
                                   <td className="px-6 py-3 text-slate-500">{formatDuration(b.target)}</td>
                                   <td className="px-6 py-3 text-slate-500">{formatDuration(b.actual)}</td>
                                   <td className="px-6 py-3 text-slate-500">{pct.toFixed(2)}%</td>
                                   <td className="px-6 py-3 text-right overflow-visible">
                                       <div className="group relative inline-flex items-center justify-center">
                                           <div 
                                                className={`w-2.5 h-2.5 rounded-full ${pct <= 25 ? 'bg-green-500' : pct <= 50 ? 'bg-yellow-400' : 'bg-red-500'} shadow-sm transition-transform duration-300 group-hover:scale-150`} 
                                           />
                                           <div className="absolute bottom-full mb-2 right-[-50%] translate-x-[-10%] hidden group-hover:block w-max max-w-[200px] p-2 bg-slate-800 text-white text-[10px] rounded shadow-xl z-50 whitespace-pre text-center pointer-events-none">
                                               {`Percentage of ${b.label.toLowerCase()}\nGreen <= 25%, Yellow <= 50%, Red > 50%`}
                                               <div className="absolute top-full right-1/2 translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                                           </div>
                                       </div>
                                   </td>
                               </tr>
                               {isExpanded && hasApps && (
                                   <tr>
                                       <td colSpan={6} className="bg-white p-4 pl-16">
                                           <table className="w-full text-xs">
                                               {b.type === 'user' ? (
                                                    <thead className="text-slate-400 border-b border-slate-100">
                                                        <tr>
                                                            <th className="py-2 text-left w-1/2">User</th>
                                                            <th className="py-2 text-right w-1/4">Idle Minutes</th>
                                                            <th className="py-2 text-right w-1/4">Percentage Idle Time</th>
                                                        </tr>
                                                    </thead>
                                               ) : (
                                                    <thead className="text-slate-400 border-b border-slate-100">
                                                        <tr>
                                                            <th className="py-2 text-left">App/Website</th>
                                                            <th className="py-2 text-left">Category</th>
                                                            <th className="py-2 text-left">Time</th>
                                                            <th className="py-2 text-left">%</th>
                                                        </tr>
                                                    </thead>
                                               )}
                                               <tbody>
                                                   {b.apps.map((app: any, idx: number) => {
                                                        const totalSecs = Number(b.actual) || 1;
                                                        const appPct = ((Number(app.total_time) / totalSecs) * 100).toFixed(1);
                                                        
                                                        if (b.type === 'user') {
                                                            // User Row Render
                                                            return (
                                                                <tr key={idx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                                                                    <td className="py-2 font-medium text-blue-600">
                                                                        <button 
                                                                            onClick={(e) => { e.stopPropagation(); setSelectedUser(app); }}
                                                                            className="hover:underline flex items-center gap-1 cursor-pointer"
                                                                        >
                                                                            {app.name}
                                                                        </button>
                                                                    </td>
                                                                    <td className="py-2 text-slate-600 text-right">{formatDuration(app.total_time)}</td>
                                                                    <td className="py-2 font-bold text-red-500 text-right">{appPct}%</td>
                                                                </tr>
                                                            );
                                                        }

                                                        // App Row Render
                                                        const isUrl = app.name.includes('(URL)') || (app.name.includes('.') && !app.name.includes('(APP)'));
                                                        const cleanName = app.name.replace(' (URL)', '').replace(' (APP)', '');
                                                        const url = isUrl ? `https://${cleanName}` : '#';

                                                       return (
                                                           <tr key={idx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                                                               <td className="py-2 font-medium text-blue-600">
                                                                    {isUrl ? (
                                                                        <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline hover:text-blue-800 font-bold transition-colors">
                                                                            {app.name} <Maximize2 size={10} className="text-blue-400" />
                                                                        </a>
                                                                    ) : (
                                                                        <span className="flex items-center gap-1 font-bold">
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
                            
                            const isUrl = app.name.includes('(URL)') || (app.name.includes('.') && !app.name.includes('(APP)'));
                            const cleanName = app.name.replace(' (URL)', '').replace(' (APP)', '');
                            const url = isUrl ? `https://${cleanName}` : '#';
                            
                            return (
                                <tr key={i} className="border-b border-blue-100/30 hover:bg-blue-50/50">
                                    <td className="px-4 py-3 text-blue-600 font-medium">
                                        {isUrl ? (
                                            <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline hover:text-blue-800 font-bold transition-colors">
                                                {app.name} <Maximize2 size={10} className="text-blue-400" />
                                            </a>
                                        ) : (
                                            <span className="flex items-center gap-1 font-bold">
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
  const { formatDateTime, timezone } = useTimezone();

  // Helper to convert UTC time (HH:MM:SS) to timezone-aware formatted time
  const formatShiftTimeInTimezone = (timeStr: string) => {
    try {
      // Parse the time string (format: HH:MM:SS)
      const [hours, minutes] = timeStr.split(':').map(Number);
      // Create a date object with the UTC time on a fixed date
      const utcDate = new Date(Date.UTC(2000, 0, 1, hours, minutes, 0));
      // Format in the selected timezone
      return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: timezone
      }).format(utcDate);
    } catch (e) {
      return timeStr; // Fallback to original if conversion fails
    }
  };

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
          <span>Last updated: {formatDateTime(new Date())}</span>
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
                    {formatShiftTimeInTimezone(s.shift_start)} - {formatShiftTimeInTimezone(s.shift_end)}
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


      
      {selectedUser && renderUserDetail(selectedUser)}

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-800">Detailed View</h2>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center">
            {(() => {
                const allIds = ['login', 'session', 'productivity', 'online'];
                if (unproductiveApps.length > 0) allIds.push('session-unproductive');
                if (neutralApps.length > 0) allIds.push('session-neutral');
                if (topIdleUsers.length > 0) allIds.push('session-idle');
                if (data?.break_time > 0) allIds.push('session-break');
                
                const isAllExpanded = expandedRow.length > 0 && allIds.every(id => expandedRow.includes(id));

                return (
                    <button 
                      onClick={() => setExpandedRow(isAllExpanded ? [] : allIds)}
                      className={`p-1.5 rounded transition-colors ${
                        isAllExpanded 
                        ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                      title={isAllExpanded ? "Collapse All" : "Expand All"}
                    >
                      {isAllExpanded ? (
                        <Minimize2 size={16} />
                      ) : (
                        <Maximize2 size={16} />
                      )}
                    </button>
                );
            })()}
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
                    <tr onClick={() => row.hasData && toggleRow(row.id)} className={`transition-colors ${row.hasData ? 'hover:bg-slate-50 cursor-pointer' : ''}`}>
                    <td className="px-6 py-4 text-slate-400">
                        {row.hasData && (
                            <ChevronRight size={16} className={`transition-transformDuration-200 ${expandedRow.includes(row.id) ? 'rotate-90' : ''}`} />
                        )}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">{row.label}</td>
                    <td className="px-6 py-4 text-slate-500">{row.target}</td>
                    <td className="px-6 py-4 text-slate-500">{row.actual}</td>
                    <td className="px-6 py-4 text-slate-500 font-medium">{row.percentage}%</td>
                    <td className="px-6 py-4 text-right overflow-visible">
                        <div className="group relative inline-flex items-center justify-center">
                            <div className={`w-3 h-3 rounded-full ${getStatusColor(row.status)} shadow-sm transition-transform duration-300 group-hover:scale-150`} />
                            
                            <div className="absolute bottom-full mb-2 right-0 hidden group-hover:block w-max max-w-[200px] p-2 bg-slate-800 text-white text-[10px] rounded shadow-xl z-50 whitespace-normal text-center pointer-events-none">
                                {row.id === 'login' ? 'Percentage of users who logged in' : 
                                 row.id === 'session' ? 'Session Duration vs Target' :
                                 'Percentage of Productive Time'}
                                <div className="absolute top-full right-1 border-4 border-transparent border-t-slate-800"></div>
                            </div>
                        </div>
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
