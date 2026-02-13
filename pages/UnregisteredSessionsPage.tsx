import React, { useState, useEffect } from 'react';
import { db } from '../services/dataService';
import { Plus, UserCheck, Link as LinkIcon, Trash2, X, Monitor, User as UserIcon, Settings, Shield, Clock, ExternalLink, ShieldAlert } from 'lucide-react';

interface UnregisteredSession {
  id: number;
  session_id: string;
  device_id: string | null;
  system_name: string | null;
  windows_username: string | null;
  ip_address: string | null;
  os_version: string | null;
  domain: string | null;
  created_at: string;
  total_time: number;
  productive_time: number;
  wasted_time: number;
  neutral_time: number;
  idle_time: number;
}

interface User {
  id: number;
  name: string;
  email: string;
}

interface UserType {
  id: number;
  name: string;
}

interface WindowsUsernameMapping {
  id: number;
  user_id: number;
  windows_username: string;
  created_at: string;
  user_name: string;
  user_email: string;
}

const UnregisteredSessionsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'sessions' | 'mappings'>('sessions');
  const [sessions, setSessions] = useState<UnregisteredSession[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [userTypes, setUserTypes] = useState<UserType[]>([]);
  const [windowsMappings, setWindowsMappings] = useState<WindowsUsernameMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showWindowsMappingModal, setShowWindowsMappingModal] = useState(false);
 const [selectedSession, setSelectedSession] = useState<UnregisteredSession | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    phone: '',
    usertype_id: ''
  });

  const [mapForm, setMapForm] = useState({
    user_id: ''
  });

  const [windowsMappingForm, setWindowsMappingForm] = useState({
    user_id: '',
    windows_username: ''
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    if (activeTab === 'sessions') {
      const [sessionsData, usersData, typesData] = await Promise.all([
        db.getUnregisteredSessions(),
        db.getUsers(),
        db.getUserTypes()
      ]);
      setSessions(sessionsData);
      setUsers(usersData);
      setUserTypes(typesData);
    } else {
      const [mappingsData, usersData] = await Promise.all([
        db.getWindowsUsernameMappings(),
        db.getUsers()
      ]);
      setWindowsMappings(mappingsData);
      setUsers(usersData);
    }
    setLoading(false);
  };

  const handleRegisterUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedSession) return;

    const result = await db.registerUserFromSession({
      name: registerForm.name,
      email: registerForm.email,
      phone: registerForm.phone || undefined,
      usertype_id: parseInt(registerForm.usertype_id),
      session_id: selectedSession.session_id,
      device_id: selectedSession.device_id || undefined,
      windows_username: selectedSession.windows_username || undefined
    });

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess('User registered successfully');
      setShowRegisterModal(false);
      setRegisterForm({ name: '', email: '', phone: '', usertype_id: '' });
      setSelectedSession(null);
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const handleMapUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedSession) return;

    const result = await db.mapUserToSession({
      user_id: parseInt(mapForm.user_id),
      session_id: selectedSession.session_id,
      device_id: selectedSession.device_id || undefined,
      windows_username: selectedSession.windows_username || undefined
    });

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess('User mapped to session successfully');
      setShowMapModal(false);
      setMapForm({ user_id: '' });
      setSelectedSession(null);
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const handleAddWindowsMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const result = await db.addWindowsUsernameMapping({
      user_id: parseInt(windowsMappingForm.user_id),
      windows_username: windowsMappingForm.windows_username
    });

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess('Windows username mapping added successfully');
      setShowWindowsMappingModal(false);
      setWindowsMappingForm({ user_id: '', windows_username: '' });
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const handleDeleteWindowsMapping = async (id: number) => {
    if (!confirm('Are you sure you want to delete this Windows username mapping?')) {
      return;
    }

    const result = await db.deleteWindowsUsernameMapping(id);
    if (result.error) {
      setError(result.error);
    } else {
      setSuccess('Windows username mapping deleted successfully');
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
            Unregistered Sessions Management
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
            <Shield size={16} className="text-amber-500" />
            Manage stealth sessions from unregistered users and Windows username mappings
          </p>
        </div>
        
        {activeTab === 'mappings' && (
          <button
            onClick={() => setShowWindowsMappingModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-indigo-200 dark:shadow-none font-semibold"
          >
            <Plus size={18} />
            Add Mapping
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100/50 dark:bg-slate-800/50 p-1.5 rounded-2xl w-fit border border-slate-200 dark:border-slate-700/50">
        <button
          onClick={() => setActiveTab('sessions')}
          className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'sessions' 
              ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-md' 
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <ShieldAlert size={18} />
          Unregistered Sessions
        </button>
        <button
          onClick={() => setActiveTab('mappings')}
          className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'mappings' 
              ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-md' 
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <LinkIcon size={18} />
          Windows Username Mappings
        </button>
      </div>

      {/* Alerts */}
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl flex items-center gap-3 animate-slide-in">
            <Shield size={18} />
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-4 py-3 rounded-xl flex items-center gap-3 animate-slide-in">
            <UserCheck size={18} />
            {success}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white/50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mb-4"></div>
          <p className="text-slate-500 font-medium">Synchronizing data...</p>
        </div>
      ) : activeTab === 'sessions' ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-bottom border-slate-200 dark:border-slate-700">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">System Info</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Windows User</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Device ID</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Activity</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sessions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-2 opacity-50">
                        <Monitor size={48} className="text-slate-300" />
                        <p className="text-slate-500 font-medium italic">No unregistered sessions found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  sessions.map((session) => (
                    <tr key={session.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{session.system_name || 'Unknown System'}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <Settings size={12} />
                          {session.ip_address || 'No IP recorded'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-mono font-bold">
                          {session.windows_username || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-mono text-slate-400 dark:text-slate-500 italic">
                          {session.device_id || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5">
                            <Clock size={12} className="text-indigo-500" />
                            {formatTime(session.total_time)}
                          </div>
                          <div className="w-20 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-indigo-500" 
                              style={{ width: `${Math.min(100, (session.productive_time/session.total_time)*100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                        {new Date(session.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setSelectedSession(session);
                              setShowRegisterModal(true);
                              setRegisterForm({
                                name: session.windows_username || '',
                                email: '',
                                phone: '',
                                usertype_id: ''
                              });
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-xl transition-all border border-transparent hover:border-emerald-100 dark:hover:border-emerald-500/20"
                          >
                            <UserCheck size={14} />
                            Register
                          </button>
                          <button
                            onClick={() => {
                              setSelectedSession(session);
                              setShowMapModal(true);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-xl transition-all border border-transparent hover:border-blue-100 dark:hover:border-blue-500/20"
                          >
                            <LinkIcon size={14} />
                            Map User
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-bottom border-slate-200 dark:border-slate-700">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">User</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Windows Username</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {windowsMappings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-2 opacity-50">
                        <LinkIcon size={48} className="text-slate-300" />
                        <p className="text-slate-500 font-medium italic">No Windows username mappings found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  windowsMappings.map((mapping) => (
                    <tr key={mapping.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{mapping.user_name}</td>
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{mapping.user_email}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-mono font-bold">
                          {mapping.windows_username}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                        {new Date(mapping.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDeleteWindowsMapping(mapping.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                          title="Delete Mapping"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Register User Modal */}
      {showRegisterModal && selectedSession && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 w-full max-w-md shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Register User</h2>
              <button 
                onClick={() => {
                  setShowRegisterModal(false);
                  setRegisterForm({ name: '', email: '', phone: '', usertype_id: '' });
                  setSelectedSession(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl mb-6 border border-slate-100 dark:border-slate-700/50 text-sm">
              <div className="flex justify-between mb-2">
                <span className="text-slate-500 dark:text-slate-400">System:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{selectedSession.system_name}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-500 dark:text-slate-400">Windows User:</span>
                <span className="font-semibold text-slate-900 dark:text-white font-monospace">{selectedSession.windows_username || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Device ID:</span>
                <span className="font-semibold text-slate-900 dark:text-white font-monospace text-xs">{selectedSession.device_id || '-'}</span>
              </div>
            </div>

            <form onSubmit={handleRegisterUser} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Name *</label>
                <input
                  type="text"
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                  required
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  placeholder="Full Name"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Email *</label>
                <input
                  type="email"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                  required
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Phone (Optional)</label>
                <input
                  type="text"
                  value={registerForm.phone}
                  onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">User Type *</label>
                <select
                  value={registerForm.usertype_id}
                  onChange={(e) => setRegisterForm({ ...registerForm, usertype_id: e.target.value })}
                  required
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none"
                >
                  <option value="">Select user type</option>
                  {userTypes.map(type => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowRegisterModal(false);
                    setRegisterForm({ name: '', email: '', phone: '', usertype_id: '' });
                    setSelectedSession(null);
                  }}
                  className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-lg shadow-indigo-200 dark:shadow-none transition-all"
                >
                  Register User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Map User Modal */}
      {showMapModal && selectedSession && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 w-full max-w-md shadow-2xl border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Map User</h2>
              <button 
                onClick={() => {
                  setShowMapModal(false);
                  setMapForm({ user_id: '' });
                  setSelectedSession(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl mb-6 border border-slate-100 dark:border-slate-700/50 text-sm">
              <div className="flex justify-between mb-2">
                <span className="text-slate-500 dark:text-slate-400">System:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{selectedSession.system_name}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-500 dark:text-slate-400">Windows User:</span>
                <span className="font-semibold text-slate-900 dark:text-white font-monospace">{selectedSession.windows_username || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Device ID:</span>
                <span className="font-semibold text-slate-900 dark:text-white font-monospace text-xs">{selectedSession.device_id || '-'}</span>
              </div>
            </div>

            <form onSubmit={handleMapUser} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Select User *</label>
                <select
                  value={mapForm.user_id}
                  onChange={(e) => setMapForm({ ...mapForm, user_id: e.target.value })}
                  required
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none"
                >
                  <option value="">Select a user</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.name} ({user.email})</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowMapModal(false);
                    setMapForm({ user_id: '' });
                    setSelectedSession(null);
                  }}
                  className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-lg shadow-indigo-200 dark:shadow-none transition-all"
                >
                  Map User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Windows Username Mapping Modal */}
      {showWindowsMappingModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 w-full max-w-md shadow-2xl border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Add Mapping</h2>
              <button 
                onClick={() => {
                  setShowWindowsMappingModal(false);
                  setWindowsMappingForm({ user_id: '', windows_username: '' });
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAddWindowsMapping} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">User *</label>
                <select
                  value={windowsMappingForm.user_id}
                  onChange={(e) => setWindowsMappingForm({ ...windowsMappingForm, user_id: e.target.value })}
                  required
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none"
                >
                  <option value="">Select a user</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.name} ({user.email})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Windows Username *</label>
                <input
                  type="text"
                  value={windowsMappingForm.windows_username}
                  onChange={(e) => setWindowsMappingForm({ ...windowsMappingForm, windows_username: e.target.value })}
                  required
                  placeholder="e.g., john.doe"
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowWindowsMappingModal(false);
                    setWindowsMappingForm({ user_id: '', windows_username: '' });
                  }}
                  className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-lg shadow-indigo-200 dark:shadow-none transition-all"
                >
                  Add Mapping
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnregisteredSessionsPage;
