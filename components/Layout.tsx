
import React from 'react';
import { LayoutDashboard, Users, BarChart3, PieChart, LogOut, ChevronLeft, ChevronRight, UserCircle, Globe, Server, UserCog, Moon, Sun } from 'lucide-react';
import { useExport } from '../contexts/ExportContext';
import { useTimezone, TIMEZONE_OPTIONS } from '../contexts/TimezoneContext';

import { db } from '../services/dataService'; // Ensure this import exists

interface LayoutProps {
  children: React.ReactNode;
  currentPath: string;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  userName: string;
  userType?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, currentPath, onNavigate, onLogout, userName, userType }) => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [user, setUser] = React.useState<any>(null);
  const [isDarkMode, setIsDarkMode] = React.useState(false);
  const { triggerExport } = useExport();
  const { timezone, setTimezone } = useTimezone();
  
  React.useEffect(() => {
    try {
        const stored = localStorage.getItem('er_session');
        if (stored) {
            const u = JSON.parse(stored);
            setUser(u);
        }
    } catch (e) { console.error("Failed to load user", e); }
    
    // Load dark mode preference
    const darkMode = localStorage.getItem('darkMode') === 'true';
    setIsDarkMode(darkMode);
    if (darkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);
  
  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const menuItems = [
    { id: 'executive', label: 'Executive Dashboard', icon: BarChart3 },
    { id: 'summary', label: 'Summary Dashboard', icon: PieChart },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ];

  // Add Registered Stealth Users menu item only for admin users at position 4
  const adminStealthUsers = userType === 'admin' ? [
    { id: 'stealth-users', label: 'Stealth Users', icon: Users }
  ] : [];


  // Dashboard Users at position 5
  const dashboardUsersItem = [
    { id: 'users', label: 'Dashboard Users', icon: UserCircle }
  ];

  // Additional admin-only items
  const adminMenuItems = userType === 'admin' ? [
    { id: 'device-mappings', label: 'Device Mappings', icon: Server },
    { id: 'unregistered-sessions', label: 'Unregistered Sessions', icon: UserCog }
  ] : [];

  const allMenuItems = [...menuItems, ...adminStealthUsers, ...dashboardUsersItem, ...adminMenuItems];


  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden relative">
      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-slate-200 transition-all duration-300 flex flex-col shadow-sm z-30`}>
        <div className="p-6 flex items-center justify-between">
          {isSidebarOpen && (
            <div className="flex items-center justify-center">
                <img src="/Logo_overwatch.png" alt="Overwatch" className="h-20 w-auto object-contain" />
              </div>
          )}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400">
            {isSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-4 mt-4">
          {allMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 mb-2 rounded-xl transition-all ${
                currentPath === item.id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 font-semibold' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              <item.icon size={20} />
              {isSidebarOpen && <span className="text-sm">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div 
            onClick={() => onNavigate('profile')}
            className={`flex items-center ${isSidebarOpen ? 'gap-3 p-3' : 'justify-center p-2'} rounded-2xl overflow-hidden border cursor-pointer transition-colors group ${currentPath === 'profile' ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-200' : 'bg-blue-50/50 border-blue-100/50 hover:bg-blue-100/50'}`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${currentPath === 'profile' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-600 group-hover:bg-white group-hover:scale-110'}`}>
              <UserCircle size={24} strokeWidth={2} />
            </div>
            {isSidebarOpen && (
              <div className="min-w-0 flex flex-col">
                <p className={`text-sm font-bold truncate leading-tight ${currentPath === 'profile' ? 'text-white' : 'text-slate-800'}`}>{user?.name || 'User'}</p>
                <p className={`text-[10px] font-medium truncate ${currentPath === 'profile' ? 'text-blue-100' : 'text-slate-500'}`}>{user?.email || userName}</p>
              </div>
            )}
          </div>
          <div className="mt-4 flex items-center justify-center text-[10px] text-slate-300 font-bold tracking-widest uppercase">
             {isSidebarOpen && <span>Powered by Intelly</span>}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm z-20">
          <div className="text-sm font-semibold text-slate-500">
            {allMenuItems.find(item => item.id === currentPath)?.label || 'Dashboard'}
          </div>
          <div className="flex items-center gap-4">
            {/* Timezone Dropdown */}
            <div className="flex items-center gap-2">
              <Globe size={16} className="text-slate-400" />
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-600 cursor-pointer"
              >
                {TIMEZONE_OPTIONS.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="flex items-center gap-2 text-slate-600 px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-slate-100 transition-all border border-slate-200"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
              {isDarkMode ? 'Light' : 'Dark'}
            </button>
            <button 
              onClick={onLogout}
              className="flex items-center gap-2 text-red-500 px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-red-50 transition-all border border-transparent hover:border-red-100"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </header>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {children}
        </div>

        {/* Floating Action Mock */}
        <button onClick={triggerExport} className="fixed bottom-8 right-8 w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-300 hover:bg-blue-700 transition-all hover:-translate-y-1 active:scale-95 group">
           <svg className="w-6 h-6 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
        </button>

        {/* Powered By Footer */}
        {isSidebarOpen && (
          <div className="fixed bottom-2 left-2 text-[10px] text-slate-400 font-medium">
            Powered by <span className="font-bold text-blue-500">Intelly</span>
          </div>
        )}
      </main>
    </div>
  );
};

export default Layout;
