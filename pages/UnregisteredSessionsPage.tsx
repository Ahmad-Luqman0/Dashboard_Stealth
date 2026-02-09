import React, { useState, useEffect } from 'react';
import { db } from '../services/dataService';

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
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1f2937', marginBottom: '12px' }}>
          Unregistered Sessions Management
        </h1>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>
          Manage stealth sessions from unregistered users and Windows username mappings
        </p>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '2px solid #e5e7eb', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('sessions')}
            style={{
              padding: '12px 24px',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'sessions' ? '2px solid #3b82f6' : '2px solid transparent',
              color: activeTab === 'sessions' ? '#3b82f6' : '#6b7280',
              fontWeight: activeTab === 'sessions' ? '600' : '500',
              cursor: 'pointer',
              marginBottom: '-2px'
            }}
          >
            Unregistered Sessions
          </button>
          <button
            onClick={() => setActiveTab('mappings')}
            style={{
              padding: '12px 24px',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'mappings' ? '2px solid #3b82f6' : '2px solid transparent',
              color: activeTab === 'mappings' ? '#3b82f6' : '#6b7280',
              fontWeight: activeTab === 'mappings' ? '600' : '500',
              cursor: 'pointer',
              marginBottom: '-2px'
            }}
          >
            Windows Username Mappings
          </button>
        </div>
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

      {success && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#d1fae5',
          border: '1px solid #6ee7b7',
          borderRadius: '6px',
          color: '#065f46',
          marginBottom: '16px'
        }}>
          {success}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
      ) : activeTab === 'sessions' ? (
        <div>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <tr>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>System Info</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Windows User</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Device ID</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Activity</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Created</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                      No unregistered sessions found.
                    </td>
                  </tr>
                ) : (
                  sessions.map((session) => (
                    <tr key={session.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937' }}>{session.system_name || 'Unknown'}</div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>{session.ip_address || '-'}</div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontFamily: 'monospace', color: '#374151' }}>
                        {session.windows_username || '-'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', fontFamily: 'monospace', color: '#6b7280' }}>
                        {session.device_id || '-'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontSize: '13px', color: '#374151' }}>Total: {formatTime(session.total_time)}</div>
                        <div style={{ fontSize: '11px', color: '#10b981' }}>Prod: {formatTime(session.productive_time)}</div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>
                        {new Date(session.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
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
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#10b981',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '13px',
                              fontWeight: '500'
                            }}
                          >
                            Register
                          </button>
                          <button
                            onClick={() => {
                              setSelectedSession(session);
                              setShowMapModal(true);
                            }}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '13px',
                              fontWeight: '500'
                            }}
                          >
                            Map
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
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <button
              onClick={() => setShowWindowsMappingModal(true)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              + Add Mapping
            </button>
          </div>

          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <tr>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>User</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Email</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Windows Username</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Created</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {windowsMappings.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                      No Windows username mappings found.
                    </td>
                  </tr>
                ) : (
                  windowsMappings.map((mapping) => (
                    <tr key={mapping.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px 16px', fontSize: '14px', color: '#1f2937' }}>{mapping.user_name}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{mapping.user_email}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontFamily: 'monospace', color: '#374151' }}>
                        {mapping.windows_username}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>
                        {new Date(mapping.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button
                          onClick={() => handleDeleteWindowsMapping(mapping.id)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '500'
                          }}
                        >
                          Delete
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
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            width: '90%',
            maxWidth: '500px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px', color: '#1f2937' }}>
              Register New User
            </h2>

            <div style={{ backgroundColor: '#f3f4f6', padding: '12px', borderRadius: '6px', marginBottom: '20px', fontSize: '13px' }}>
              <div style={{ marginBottom: '4px' }}><strong>System:</strong> {selectedSession.system_name}</div>
              <div style={{ marginBottom: '4px' }}><strong>Windows User:</strong> {selectedSession.windows_username || '-'}</div>
              <div><strong>Device ID:</strong> {selectedSession.device_id || '-'}</div>
            </div>

            <form onSubmit={handleRegisterUser}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                  Name *
                </label>
                <input
                  type="text"
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                  Email *
                </label>
                <input
                  type="email"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                  Phone (Optional)
                </label>
                <input
                  type="text"
                  value={registerForm.phone}
                  onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                  User Type *
                </label>
                <select
                  value={registerForm.usertype_id}
                  onChange={(e) => setRegisterForm({ ...registerForm, usertype_id: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="">Select user type</option>
                  {userTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowRegisterModal(false);
                    setRegisterForm({ name: '', email: '', phone: '', usertype_id: '' });
                    setSelectedSession(null);
                    setError('');
                  }}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
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
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            width: '90%',
            maxWidth: '500px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px', color: '#1f2937' }}>
              Map Existing User to Session
            </h2>

            <div style={{ backgroundColor: '#f3f4f6', padding: '12px', borderRadius: '6px', marginBottom: '20px', fontSize: '13px' }}>
              <div style={{ marginBottom: '4px' }}><strong>System:</strong> {selectedSession.system_name}</div>
              <div style={{ marginBottom: '4px' }}><strong>Windows User:</strong> {selectedSession.windows_username || '-'}</div>
              <div><strong>Device ID:</strong> {selectedSession.device_id || '-'}</div>
            </div>

            <form onSubmit={handleMapUser}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                  Select User *
                </label>
                <select
                  value={mapForm.user_id}
                  onChange={(e) => setMapForm({ ...mapForm, user_id: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="">Select a user</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowMapModal(false);
                    setMapForm({ user_id: '' });
                    setSelectedSession(null);
                    setError('');
                  }}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
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
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            width: '90%',
            maxWidth: '500px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px', color: '#1f2937' }}>
              Add Windows Username Mapping
            </h2>

            <form onSubmit={handleAddWindowsMapping}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                  User *
                </label>
                <select
                  value={windowsMappingForm.user_id}
                  onChange={(e) => setWindowsMappingForm({ ...windowsMappingForm, user_id: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="">Select a user</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                  Windows Username *
                </label>
                <input
                  type="text"
                  value={windowsMappingForm.windows_username}
                  onChange={(e) => setWindowsMappingForm({ ...windowsMappingForm, windows_username: e.target.value })}
                  required
                  placeholder="e.g., john.doe"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowWindowsMappingModal(false);
                    setWindowsMappingForm({ user_id: '', windows_username: '' });
                    setError('');
                  }}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
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
