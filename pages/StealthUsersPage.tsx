import React, { useState, useEffect } from 'react';
import { db } from '../services/dataService';
import { Plus, Trash2, X, Clock, User as UserIcon, Mail, Phone as PhoneIcon, UserCheck, Globe } from 'lucide-react';
import { useTimezone } from '../contexts/TimezoneContext';

interface StealthUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  usertype: string;
  status: string;
  created_at: string;
  total_sessions: number;
  total_time: number;
  company: string | null;
  shift_start?: string;
  shift_end?: string;
  breaktime_start?: string;
  breaktime_end?: string;
}

interface UserType {
  id: number;
  name: string;
}

interface StealthUsersPageProps {
  userType?: string;
}

const StealthUsersPage = ({ userType }: StealthUsersPageProps) => {
  const { timezone } = useTimezone();
  const [users, setUsers] = useState<StealthUser[]>([]);
  const [userTypes, setUserTypes] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableCompanies, setAvailableCompanies] = useState<any[]>([]);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    usertype_id: '',
    shift_start: '09:00:00',
    shift_end: '18:00:00',
    breaktime_start: '',
    breaktime_end: '',
    company: ''
  });

  useEffect(() => {
    loadUsers();
    loadUserTypes();
    db.getCompanies().then(setAvailableCompanies);
  }, []);

  const loadUserTypes = async () => {
    try {
      const data = await db.getUserTypes();
      setUserTypes(data);
    } catch (e) {
      console.error('Failed to load user types');
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await db.getUsers();
      setUsers(data);
    } catch (e) {
      setError('Failed to load stealth users');
      console.error(e);
    }
    setLoading(false);
  };

  const getTZOffsetMs = (tz: string) => {
    try {
      const now = new Date();
      const fmt = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric',
        hour12: false
      });
      const parts = fmt.formatToParts(now);
      const map: any = {};
      parts.forEach(p => map[p.type] = p.value);
      
      const tzDate = Date.UTC(
        parseInt(map.year), 
        parseInt(map.month) - 1, 
        parseInt(map.day), 
        parseInt(map.hour) === 24 ? 0 : parseInt(map.hour), 
        parseInt(map.minute), 
        parseInt(map.second)
      );
      const utcDate = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());
      
      return tzDate - utcDate;
    } catch (e) {
      return 0;
    }
  };

  const convertToUTC = (timeStr: string) => {
    if (!timeStr) return null;
    
    try {
      const offsetMs = getTZOffsetMs(timezone);
      const [h, m, s] = timeStr.split(':').map(Number);
      
      const now = new Date();
      // Create a timestamp as if it was UTC
      const pseudoUtcTime = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), h, m, s || 0);
      // Subtract the offset to get the real UTC time
      const finalUtcDate = new Date(pseudoUtcTime - offsetMs);
      return finalUtcDate.toISOString().split('T')[1].split('.')[0];
    } catch (e) {
      console.error('Timezone conversion error:', e);
      return timeStr;
    }
  };

  const convertFromUTC = (timeStr: string | null | undefined) => {
    if (!timeStr) return '';
    try {
      const offsetMs = getTZOffsetMs(timezone);
      const [h, m, s] = timeStr.split(':').map(Number);
      
      const now = new Date();
      const utcTime = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), h, m, s || 0);
      // Add the offset to get the local time in the target timezone
      const localTime = new Date(utcTime + offsetMs);
      
      const hour = String(localTime.getUTCHours()).padStart(2, '0');
      const minute = String(localTime.getUTCMinutes()).padStart(2, '0');
      const second = String(localTime.getUTCSeconds()).padStart(2, '0');
      
      return `${hour}:${minute}:${second}`;
    } catch (e) {
      return timeStr || '';
    }
  };

  const handleEditClick = (user: StealthUser) => {
    setEditingUserId(user.id);
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      usertype_id: userTypes.find(t => t.name === user.usertype)?.id.toString() || '',
      shift_start: convertFromUTC(user.shift_start) || '09:00:00',
      shift_end: convertFromUTC(user.shift_end) || '18:00:00',
      breaktime_start: convertFromUTC(user.breaktime_start),
      breaktime_end: convertFromUTC(user.breaktime_end),
      company: user.company || ''
    });
    setShowAddModal(true);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Explicit Validation
    if (!formData.name.trim() || !formData.email.trim() || !formData.usertype_id) {
        alert('Please fill in all mandatory fields: Name, Email, and User Role.');
        return;
    }

    setIsSubmitting(true);
    try {
      // Convert times to UTC before sending to API
      const payload = {
        ...formData,
        shift_start: convertToUTC(formData.shift_start),
        shift_end: convertToUTC(formData.shift_end),
        breaktime_start: convertToUTC(formData.breaktime_start),
        breaktime_end: convertToUTC(formData.breaktime_end),
        usertype_id: parseInt(formData.usertype_id)
      };

      const result = editingUserId 
        ? await db.updateUser(editingUserId, payload)
        : await db.addUser(payload);

      if (result.success) {
        setShowAddModal(false);
        setEditingUserId(null);
        setFormData({
          name: '',
          email: '',
          phone: '',
          usertype_id: '',
          shift_start: '09:00:00',
          shift_end: '18:00:00',
          breaktime_start: '',
          breaktime_end: '',
          company: ''
        });
        loadUsers();
      } else {
        alert(result.error || `Failed to ${editingUserId ? 'update' : 'add'} user`);
      }
    } catch (e) {
      alert(`Failed to ${editingUserId ? 'update' : 'add'} user`);
    }
    setIsSubmitting(false);
  };

  const handleDeleteUser = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this user? This will remove all their session data.')) {
      try {
        const result = await db.deleteUser(id);
        if (result.success) {
          loadUsers();
        } else {
          alert('Failed to delete user');
        }
      } catch (e) {
        alert('Failed to delete user');
      }
    }
  };

  const formatTime = (milliseconds: number | string) => {
    const ms = typeof milliseconds === 'string' ? parseFloat(milliseconds) : milliseconds;
    if (!ms || isNaN(ms)) return '0h 0m';
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
             <UserCheck className="text-indigo-500" />
             Registered Stealth Users
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage users monitored by the stealth engine</p>
        </div>
        {userType === 'admin' && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-indigo-200 dark:shadow-none font-semibold text-sm"
          >
            <Plus size={18} />
            Add Monitored User
          </button>
        )}
      </div>

      {error && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#fee2e2',
          border: '1px solid #fca5a5',
          borderRadius: '6px',
          color: '#991b1b',
          marginBottom: '16px'
        }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          <p className="text-slate-500 font-medium">Loading monitored users...</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-x-auto">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold text-[11px] uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 text-left">Name</th>
                <th className="px-6 py-4 text-left">Email</th>
                <th className="px-6 py-4 text-left">Company</th>
                <th className="px-6 py-4 text-left">Type</th>
                <th className="px-6 py-4 text-left">Status</th>
                <th className="px-6 py-4 text-left">Tracked Days</th>
                <th className="px-6 py-4 text-left">Total Time Tracked</th>
                {userType === 'admin' && <th className="px-6 py-4 text-left text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                    No stealth users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b border-slate-50 dark:border-slate-800/50 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-slate-800 dark:text-white">{user.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{user.email}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-400">{user.company || '-'}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="badge badge-blue">
                        {user.usertype || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`badge ${user.status === 'active' ? 'badge-green' : 'badge-red'}`}>
                        {user.status || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-300">
                      {user.total_sessions || 0}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-300">
                      {formatTime(user.total_time)}
                    </td>
                    {userType === 'admin' && (
                      <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                         <button 
                          onClick={() => handleEditClick(user)}
                          className="text-slate-400 hover:text-indigo-600 transition-colors p-2 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg"
                          title="Edit User"
                         >
                           <UserIcon size={16} />
                         </button>
                         <button 
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-slate-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg"
                          title="Delete User"
                         >
                           <Trash2 size={16} />
                         </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                {editingUserId ? <UserIcon className="text-indigo-500" size={20} /> : <Plus className="text-indigo-500" size={20} />}
                {editingUserId ? 'Edit Monitored User' : 'Add Monitored User'}
              </h2>
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setEditingUserId(null);
                }} 
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-indigo-500 uppercase tracking-widest flex items-center gap-2">
                    <UserIcon size={12} /> Personal Details
                  </h3>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">FULL NAME</label>
                    <input 
                      required
                      type="text" 
                      placeholder="e.g. John Doe"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">EMAIL ADDRESS</label>
                    <input 
                      required
                      type="email" 
                      placeholder="john@example.com"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">PHONE (OPTIONAL)</label>
                    <input 
                      type="text" 
                      placeholder="+1 234 567 890"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">USER ROLE</label>
                    <select 
                      required
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                      value={formData.usertype_id}
                      onChange={e => setFormData({...formData, usertype_id: e.target.value})}
                    >
                      <option value="">Select Role</option>
                      {userTypes.map(type => (
                        <option key={type.id} value={type.id}>{type.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Company</label>
                    <select 
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                      value={formData.company}
                      onChange={e => setFormData({...formData, company: e.target.value})}
                    >
                      <option value="">Select Company</option>
                      {availableCompanies.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Shift Info */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-indigo-500 uppercase tracking-widest flex items-center gap-2">
                    <Clock size={12} /> Shift & Breaks
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">SHIFT START</label>
                      <input 
                        required
                        type="time" 
                        step="1"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                        value={formData.shift_start}
                        onChange={e => setFormData({...formData, shift_start: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">SHIFT END</label>
                      <input 
                        required
                        type="time" 
                        step="1"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                        value={formData.shift_end}
                        onChange={e => setFormData({...formData, shift_end: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">BREAK START</label>
                      <input 
                        type="time" 
                        step="1"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                        value={formData.breaktime_start}
                        onChange={e => setFormData({...formData, breaktime_start: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">BREAK END</label>
                      <input 
                        type="time" 
                        step="1"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                        value={formData.breaktime_end}
                        onChange={e => setFormData({...formData, breaktime_end: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-8 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
                >
                  {isSubmitting ? (editingUserId ? 'Updating...' : 'Adding...') : (editingUserId ? 'Update User' : 'Save User')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .badge {
          padding: 6px 12px;
          fontSize: 10px;
          fontWeight: 800;
          borderRadius: 8px;
          display: inline-block;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        
        .badge-blue {
          background-color: rgba(99, 102, 241, 0.1);
          color: #6366f1;
          border: 1px solid rgba(99, 102, 241, 0.2);
        }
        
        .badge-green {
          background-color: rgba(16, 185, 129, 0.1);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }
        
        .badge-red {
          background-color: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .dark .badge-blue {
          background-color: rgba(99, 102, 241, 0.2);
          color: #a5b4fc;
        }
        
        .dark .badge-green {
          background-color: rgba(16, 185, 129, 0.2);
          color: #6ee7b7;
        }
        
        .dark .badge-red {
          background-color: rgba(239, 68, 68, 0.2);
          color: #fca5a5;
        }
      `}</style>
    </div>
  );
};

export default StealthUsersPage;
