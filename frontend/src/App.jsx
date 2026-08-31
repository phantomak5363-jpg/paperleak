import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { PaperDetailModal } from './components/PaperDetailModal';

import { LoginPage } from './pages/LoginPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { PaperSetterDashboard } from './pages/PaperSetterDashboard';
import { ModeratorDashboard } from './pages/ModeratorDashboard';
import { ControllerDashboard } from './pages/ControllerDashboard';
import { PrintingStaffDashboard } from './pages/PrintingStaffDashboard';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { SecurityAlertsPage } from './pages/SecurityAlertsPage';
import { UsersPage } from './pages/UsersPage';

const MainLayout = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tabFilter, setTabFilter] = useState(null);
  const [inspectPaperId, setInspectPaperId] = useState(null);
  const [pageKey, setPageKey] = useState(0);

  const handleTabChange = (tab, filter = null) => {
    setActiveTab(tab);
    setTabFilter(filter);
    setPageKey(k => k + 1);
  };

  if (!user) return <LoginPage />;

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        if (user.role === 'ADMIN')           return <AdminDashboard key={pageKey} onInspectPaper={setInspectPaperId} onNavigate={handleTabChange} />;
        if (user.role === 'PAPER_SETTER')    return <PaperSetterDashboard key={pageKey} onInspectPaper={setInspectPaperId} initialFilter={tabFilter} />;
        if (user.role === 'MODERATOR')       return <ModeratorDashboard key={pageKey} onInspectPaper={setInspectPaperId} initialFilter={tabFilter} />;
        if (user.role === 'EXAM_CONTROLLER') return <ControllerDashboard key={pageKey} onInspectPaper={setInspectPaperId} initialFilter={tabFilter} />;
        if (user.role === 'PRINTING_STAFF')  return <PrintingStaffDashboard key={pageKey} initialFilter={tabFilter} />;
        return <AdminDashboard key={pageKey} onInspectPaper={setInspectPaperId} onNavigate={handleTabChange} />;
      case 'setter_workspace': case 'my_papers': case 'papers':
        return <PaperSetterDashboard key={pageKey} onInspectPaper={setInspectPaperId} initialFilter={tabFilter} />;
      case 'moderator_queue': case 'reviews':
        return <ModeratorDashboard key={pageKey} onInspectPaper={setInspectPaperId} initialFilter={tabFilter} />;
      case 'controller_schedule': case 'schedules':
        return <ControllerDashboard key={pageKey} onInspectPaper={setInspectPaperId} initialFilter={tabFilter} />;
      case 'printing_portal': case 'printing':
        return <PrintingStaffDashboard key={pageKey} initialFilter={tabFilter} />;
      case 'audit':   return <AuditLogsPage key={pageKey} />;
      case 'alerts':  return <SecurityAlertsPage key={pageKey} />;
      case 'users':   return <UsersPage key={pageKey} />;
      default:        return <AdminDashboard key={pageKey} onInspectPaper={setInspectPaperId} onNavigate={handleTabChange} />;
    }
  };

  return (
    <div className="app-bg min-h-screen flex flex-col">

      {/* Ambient blobs — light version */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 -left-20 w-[500px] h-[500px] rounded-full opacity-40"
          style={{ background: '#bfdbfe', filter: 'blur(80px)', animation: 'blobDrift 10s ease-in-out infinite alternate' }} />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full opacity-30"
          style={{ background: '#c7d2fe', filter: 'blur(70px)', animation: 'blobDrift 13s ease-in-out infinite alternate-reverse' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full opacity-20"
          style={{ background: '#a5f3fc', filter: 'blur(80px)', animation: 'blobDrift 8s ease-in-out infinite alternate' }} />
      </div>

      {/* Dot grid */}
      <div className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(59,130,246,0.08) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }} />

      {/* App shell */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar activeTab={activeTab} setActiveTab={handleTabChange} role={user.role} />
          <main className="flex-1 overflow-y-auto p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
              {renderContent()}
            </div>
          </main>
        </div>
      </div>

      {inspectPaperId && (
        <PaperDetailModal paperId={inspectPaperId} onClose={() => setInspectPaperId(null)} />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <MainLayout />
      </ToastProvider>
    </AuthProvider>
  );
}
