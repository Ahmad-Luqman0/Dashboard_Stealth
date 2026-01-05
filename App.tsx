
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import ExecutiveDashboard from './pages/ExecutiveDashboard';
import SummaryDashboard from './pages/SummaryDashboard';
import MainDashboard from './pages/MainDashboard';
import UsersPage from './pages/UsersPage';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/LoginPage';
import { ExportProvider } from './contexts/ExportContext';

enum Page {
  EXECUTIVE = 'executive',
  SUMMARY = 'summary',
  DASHBOARD = 'dashboard',
  USERS = 'users',
  PROFILE = 'profile'
}

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(Page.EXECUTIVE);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any | null>(null);

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
      case Page.USERS: return <UsersPage />;
      case Page.PROFILE: return <ProfilePage />;
      default: return <MainDashboard />;
    }
  };

  return (
    <ExportProvider>
      <Layout 
        currentPath={currentPage} 
        onNavigate={(p: any) => setCurrentPage(p)}
        onLogout={handleLogout}
        userName={user?.name || 'Authorized User'}
      >
        {renderPage()}
      </Layout>
    </ExportProvider>
  );
};

export default App;
