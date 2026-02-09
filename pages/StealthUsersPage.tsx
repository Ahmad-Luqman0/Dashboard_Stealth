import React, { useState, useEffect } from 'react';
import { db } from '../services/dataService';

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
}

const StealthUsersPage: React.FC = () => {
  const [users, setUsers] = useState<StealthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

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

  const formatTime = (milliseconds: number | string) => {
    const ms = typeof milliseconds === 'string' ? parseFloat(milliseconds) : milliseconds;
    if (!ms || isNaN(ms)) return '0h 0m';
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1f2937' }}>Registered Stealth Users</h1>
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
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
      ) : (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <tr>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Name</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Email</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Phone</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Type</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Sessions</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Total Time</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Created</th>
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
                  <tr key={user.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#1f2937', fontWeight: '500' }}>{user.name}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{user.email}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{user.phone || '-'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className="badge badge-blue">
                        {user.usertype || 'N/A'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`badge ${user.status === 'active' ? 'badge-green' : 'badge-red'}`}>
                        {user.status || 'N/A'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#1f2937', fontWeight: '500' }}>
                      {user.total_sessions || 0}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#1f2937', fontWeight: '500' }}>
                      {formatTime(user.total_time)}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        .badge {
          padding: 4px 8px;
          fontSize: 12px;
          fontWeight: 600;
          borderRadius: 4px;
          display: inline-block;
        }
        
        .badge-blue {
          backgroundColor: #eff6ff;
          color: #1d4ed8;
        }
        
        .badge-green {
          backgroundColor: #d1fae5;
          color: #065f46;
        }
        
        .badge-red {
          backgroundColor: #fee2e2;
          color: #991b1b;
        }
      `}</style>
    </div>
  );
};

export default StealthUsersPage;
