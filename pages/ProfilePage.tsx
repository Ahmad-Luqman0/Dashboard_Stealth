import React, { useState, useEffect } from 'react';
import { UserCircle, Save, Lock, Phone } from 'lucide-react';
import { db } from '../services/dataService';

const ProfilePage: React.FC = () => {
    const [user, setUser] = useState<any>(null);
    const [formData, setFormData] = useState({
        phone: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [msg, setMsg] = useState({ text: '', type: '' });

    useEffect(() => {
        const stored = localStorage.getItem('er_session');
        if (stored) {
            const u = JSON.parse(stored);
            setUser(u);
            setFormData(prev => ({ ...prev, phone: u.phone || '' }));
        }
    }, []);

    const validatedPassword = (pass: string) => {
        // 1 special char, 1 upper case, 1 number, 1 lower case, total 8 characters
        const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        return regex.test(pass);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMsg({ text: '', type: '' });

        if (formData.newPassword) {
            if (formData.newPassword !== formData.confirmPassword) {
                setMsg({ text: "Passwords don't match", type: 'error' });
                return;
            }
            if (!validatedPassword(formData.newPassword)) {
                setMsg({ text: "Password must be at least 8 chars, include 1 uppercase, 1 lowercase, 1 number, and 1 special char.", type: 'error' });
                return;
            }
        }

        setMsg({ text: 'Saving changes...', type: 'info' });

        const res = await db.updateDashboardUser(user.id, {
            phone: formData.phone,
            ...(formData.newPassword ? { newPassword: formData.newPassword } : {})
        });

        if (res.error) {
            setMsg({ text: res.error, type: 'error' });
        } else {
            setMsg({ text: 'Profile updated successfully!', type: 'success' });
            // Update local storage
            const updatedUser = { ...user, ...res.user };
            localStorage.setItem('er_session', JSON.stringify(updatedUser));
            setUser(updatedUser);
            setFormData(prev => ({ ...prev, newPassword: '', confirmPassword: '' }));
        }
    };

    if (!user) return null;

    return (
        <div className="max-w-3xl mx-auto space-y-8 pb-20">
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">My Profile</h1>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center gap-6">
                    <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 shadow-inner">
                        <UserCircle size={48} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">{user.name}</h2>
                        <p className="text-slate-500 font-medium">@{user.username || 'username'}</p>
                        <span className="inline-block mt-2 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-100 uppercase tracking-wide">
                            {user.type}
                        </span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-8">
                    {/* Public Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2 opacity-60">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
                            <input disabled value={user.email} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-600 cursor-not-allowed" />
                            <p className="text-[10px] text-slate-400">Contact admin to change email</p>
                        </div>
                         <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <Phone size={12} />
                                Phone Number
                            </label>
                            <input 
                                value={formData.phone} 
                                onChange={e => setFormData({...formData, phone: e.target.value})}
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-700" 
                                placeholder="+1 (555) 000-0000" 
                            />
                        </div>
                    </div>

                    <div className="border-t border-slate-100 pt-8">
                        <div className="flex items-center gap-2 mb-6">
                            <Lock size={16} className="text-slate-400" />
                            <h3 className="font-bold text-slate-700">Security</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">New Password</label>
                                <input 
                                    type="password"
                                    value={formData.newPassword} 
                                    onChange={e => setFormData({...formData, newPassword: e.target.value})}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" 
                                    placeholder="••••••••" 
                                />
                            </div>
                             <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Confirm Password</label>
                                <input 
                                    type="password"
                                    value={formData.confirmPassword} 
                                    onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                                    className={`w-full bg-white border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-4 transition-all ${
                                        formData.confirmPassword && formData.newPassword !== formData.confirmPassword 
                                        ? 'border-red-300 focus:ring-red-500/10 focus:border-red-500' 
                                        : 'border-slate-200 focus:ring-blue-500/10 focus:border-blue-500'
                                    }`}
                                    placeholder="••••••••" 
                                />
                            </div>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-4 leading-relaxed">
                            Password must be at least <strong className="text-slate-600">8 characters</strong> long and include <strong className="text-slate-600">1 uppercase</strong> letter, <strong className="text-slate-600">1 lowercase</strong> letter, <strong className="text-slate-600">1 number</strong>, and <strong className="text-slate-600">1 special character</strong>.
                        </p>
                    </div>

                    {msg.text && (
                        <div className={`p-4 rounded-xl text-sm font-bold flex items-center gap-3 ${msg.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                            {msg.text}
                        </div>
                    )}

                    <div className="flex justify-end pt-4">
                        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all transform active:scale-95 text-sm flex items-center gap-2">
                            <Save size={18} />
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProfilePage;
