/* ─── EcoSphere App — root component ────────────────────────────────────── */

import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthPage from './pages/AuthPage';
import EcoWorld from './pages/EcoWorld';
import SettingsPage from './pages/SettingsPage';

type AppPage = 'dashboard' | 'settings';

function AppContent() {
  const { isAuthenticated, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<AppPage>('dashboard');

  if (loading) {
    return (
      <div className="eco-loading">
        <div className="eco-loading-spinner" />
        <p>Initializing EcoSphere...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  if (currentPage === 'settings') {
    return <SettingsPage onBack={() => setCurrentPage('dashboard')} />;
  }

  return <EcoWorld onNavigateSettings={() => setCurrentPage('settings')} />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
