
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

  // Session persistence removed as per request (Start in logged out state)
  /*
  useEffect(() => {
    const savedUser = localStorage.getItem('er_session');
    if (savedUser) {
      setIsAuthenticated(true);
      setUser(JSON.parse(savedUser));
    }
  }, []);
  */

  const handleLogin = (userData: any) => {
    setIsAuthenticated(true);
    setUser(userData);
    localStorage.setItem('er_session', JSON.stringify(userData));
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
