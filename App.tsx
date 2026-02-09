
import React, { useState, useEffect } from 'react';
//Vercel Analytics
import { Analytics } from '@vercel/analytics/react';
import Layout from './components/Layout';
import ExecutiveDashboard from './pages/ExecutiveDashboard';
import SummaryDashboard from './pages/SummaryDashboard';
import MainDashboard from './pages/MainDashboard';
import UsersPage from './pages/UsersPage';
import ProfilePage from './pages/ProfilePage';
import DeviceMappingsPage from './pages/DeviceMappingsPage';
import UnregisteredSessionsPage from './pages/UnregisteredSessionsPage';
import StealthUsersPage from './pages/StealthUsersPage';
import LoginPage from './pages/LoginPage';
import { ExportProvider } from './contexts/ExportContext';
import { TimezoneProvider } from './contexts/TimezoneContext';

enum Page {
  EXECUTIVE = 'executive',
  SUMMARY = 'summary',
  DASHBOARD = 'dashboard',
  STEALTH_USERS = 'stealth-users',
  USERS = 'users',
  DEVICE_MAPPINGS = 'device-mappings',
  UNREGISTERED_SESSIONS = 'unregistered-sessions',
  PROFILE = 'profile'
}

const PAGE_STORAGE_KEY = 'dashboard_current_page';

// Valid pages for localStorage validation
const validPages = Object.values(Page) as string[];

const App: React.FC = () => {
  // Always start at Executive Dashboard on page load
  const [currentPage, setCurrentPage] = useState<Page>(Page.EXECUTIVE);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any | null>(null);

  // Note: We don't persist page state anymore - always start fresh at Executive Dashboard

  // Session token expiry duration
  const SESSION_DURATION = 24 * 60 * 60 * 1000;

  // Check for existing session on mount
  useEffect(() => {
    const savedSession = localStorage.getItem('er_session');
    if (savedSession) {
      try {
        const sessionData = JSON.parse(savedSession);
        const { user: userData, expiresAt } = sessionData;
        
        // Check if session has expired
        if (expiresAt && Date.now() < expiresAt) {
          setIsAuthenticated(true);
          setUser(userData);
        } else {
          // Session expired - clear it
          localStorage.removeItem('er_session');
        }
      } catch (e) {
        // Invalid session data - clear it
        localStorage.removeItem('er_session');
      }
    }
  }, []);

  // Check session expiry periodically (every minute)
  useEffect(() => {
    const checkExpiry = () => {
      const savedSession = localStorage.getItem('er_session');
      if (savedSession) {
        try {
          const sessionData = JSON.parse(savedSession);
          if (sessionData.expiresAt && Date.now() >= sessionData.expiresAt) {
            handleLogout();
          }
        } catch (e) {
          handleLogout();
        }
      }
    };

    const interval = setInterval(checkExpiry, 60 * 1000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const handleLogin = (userData: any) => {
    const expiresAt = Date.now() + SESSION_DURATION;
    const sessionData = { user: userData, expiresAt };
    
    setIsAuthenticated(true);
    setUser(userData);
    localStorage.setItem('er_session', JSON.stringify(sessionData));
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('er_session');
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case Page.EXECUTIVE: return <ExecutiveDashboard />;
      case Page.SUMMARY: return <SummaryDashboard />;
      case Page.DASHBOARD: return <MainDashboard />;
      case Page.STEALTH_USERS:
        // Only allow admin users to view stealth users
        return user?.type === 'admin' ? <StealthUsersPage /> : <ExecutiveDashboard />;
      case Page.USERS: return <UsersPage />;
      case Page.DEVICE_MAPPINGS: 
        // Only allow admin users to view device mappings
        return user?.type === 'admin' ? <DeviceMappingsPage /> : <ExecutiveDashboard />;
      case Page.UNREGISTERED_SESSIONS:
        // Only allow admin users to view unregistered sessions
        return user?.type === 'admin' ? <UnregisteredSessionsPage /> : <ExecutiveDashboard />;
      case Page.PROFILE: return <ProfilePage />;
      default: return <MainDashboard />;
    }
  };

  return (
    <TimezoneProvider>
      <ExportProvider>
        <Layout 
          currentPath={currentPage} 
          onNavigate={(p: any) => setCurrentPage(p)}
          onLogout={handleLogout}
          userName={user?.name || 'Authorized User'}
          userType={user?.type}
        >
          {renderPage()}
        </Layout>
      </ExportProvider>
      <Analytics />
    </TimezoneProvider>
  );
};

export default App;
