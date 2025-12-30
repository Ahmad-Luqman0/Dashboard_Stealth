import React, { useState, useEffect } from 'react';
import { Eye, Edit2, Trash2, Plus, Loader2, Search, Filter, Lock } from 'lucide-react';
import { db } from '../services/dataService';

const UsersPage: React.FC = () => {
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Admin logic state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [resetModal, setResetModal] = useState<{open: boolean, userId: any, name: string}>({ open: false, userId: null, name: '' });
  const [newPass, setNewPass] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await db.getDashboardUsers();
      setUsers(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
    const stored = localStorage.getItem('er_session');
    if (stored) setCurrentUser(JSON.parse(stored));
  }, []);

  // Admin Actions
  const handleDelete = async (id: any) => {
      if (window.confirm('Are you sure you want to delete this user?')) {
          const res = await db.deleteDashboardUser(id);
          if (res.error) alert(res.error);
          else fetchUsers();
      }
  };

  const handleResetPass = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!resetModal.userId) return;
      const res = await db.updateDashboardUser(resetModal.userId, { newPassword: newPass });
      if (res.error) alert(res.error);
      else {
          alert('Password updated successfully');
          setResetModal({ open: false, userId: null, name: '' });
          setNewPass('');
      }
  };

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(users.length / rowsPerPage);
  
  const currentUsers = users.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
      name: '',
      username: '',
      email: '',
      password: '',
      phone: '',
      type: 'employee',
      status: 'active'
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (submitting) return;
      
      setSubmitting(true);
      try {
        const res = await db.addDashboardUser(formData);
        if (res.error) {
            alert(res.error);
        } else {
            setIsModalOpen(false);
            setFormData({ name: '', username: '', email: '', password: '', phone: '', type: 'employee', status: 'active' });
            fetchUsers();
        }
      } catch (err) {
        console.error(err);
        alert('An unexpected error occurred');
      } finally {
        setSubmitting(false);
      }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 relative">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Users</h1>
        </div>
        <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-200 hover:-translate-y-1 active:scale-95 text-sm"
        >
          <Plus size={18} strokeWidth={2.5} />
          Add New User
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <Loader2 className="animate-spin text-blue-600 mx-auto" size={32} />
                    <p className="text-slate-400 mt-4 font-bold uppercase tracking-widest text-[10px]">Loading Users...</p>
                  </td>
                </tr>
              ) : (
                currentUsers.map((user, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-700">{user.name}</span>
                        {user.username && <span className="text-xs text-slate-400 font-normal">@{user.username}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium">{user.email}</td>
                    <td className="px-6 py-4 text-slate-500 font-medium">{user.phone || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${user.status.toLowerCase() === 'active' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                       <span className="text-[11px] font-bold text-slate-500 uppercase">{user.type}</span>
                    </td>
                    <td className="px-6 py-4">
                       {currentUser?.type === 'admin' && (
                          <div className="flex items-center gap-2">
                             <button onClick={() => setResetModal({ open: true, userId: user.id, name: user.name })} className="text-slate-400 hover:text-blue-600 transition-colors" title="Change Password">
                               <Lock size={16} />
                             </button>
                             {/* Prevent deleting self */}
                             {currentUser.id !== user.id && (
                                 <button onClick={() => handleDelete(user.id)} className="text-slate-400 hover:text-red-600 transition-colors" title="Delete User">
                                   <Trash2 size={16} />
                                 </button>
                             )}
                          </div>
                       )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-end px-6 py-4 bg-white border-t border-slate-100 gap-6">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
             <span>Rows per page:</span>
             <select 
               value={rowsPerPage} 
               onChange={(e) => {
                 setRowsPerPage(Number(e.target.value));
                 setCurrentPage(1);
               }}
               className="bg-transparent outline-none font-bold text-slate-700 cursor-pointer"
             >
               <option value={5}>5</option>
               <option value={10}>10</option>
               <option value={20}>20</option>
             </select>
          </div>
          
          <div className="flex items-center gap-4 text-xs">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed font-medium"
            >
              Prev
            </button>
            <span className="text-slate-500">
              Page {currentPage} of {totalPages || 1}
            </span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed font-medium"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h2 className="text-xl font-bold text-slate-800">Add New User</h2>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-8 space-y-5">
                    <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Name</label>
                            <input name="name" required value={formData.name} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium" placeholder="John Doe" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Username</label>
                            <input name="username" required value={formData.username} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium" placeholder="johndoe" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email</label>
                        <input name="email" type="email" required value={formData.email} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium" placeholder="john@example.com" />
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone (Optional)</label>
                            <input name="phone" value={formData.phone} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium" placeholder="+1 234..." />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Role</label>
                            <select name="type" value={formData.type} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium">
                                <option value="employee">Employee</option>
                                <option value="supervisor">Supervisor</option>
                                <option value="manager">Manager</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
                        <input name="password" type="password" required value={formData.password} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium" placeholder="••••••••" />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors text-sm">Cancel</button>
                        <button type="submit" disabled={submitting} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all transform active:scale-95 text-sm flex justify-center items-center gap-2">
                            {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
                            {submitting ? 'Creating...' : 'Create User'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetModal.open && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h2 className="text-lg font-bold text-slate-800">Reset Password</h2>
                    <button onClick={() => setResetModal({ open: false, userId: null, name: '' })} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>
                <div className="p-6">
                    <p className="text-sm text-slate-500 mb-4">Set new password for <strong>{resetModal.name}</strong></p>
                    <form onSubmit={handleResetPass} className="space-y-4">
                        <input 
                            type="password"
                            required
                            value={newPass}
                            onChange={(e) => setNewPass(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium" 
                            placeholder="New Password" 
                        />
                         <div className="flex gap-3 pt-2">
                            <button type="button" onClick={() => setResetModal({ open: false, userId: null, name: '' })} className="flex-1 px-4 py-2 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors text-xs">Cancel</button>
                            <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all active:scale-95 text-xs">Update</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
