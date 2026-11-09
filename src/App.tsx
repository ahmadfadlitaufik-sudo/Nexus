/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { LoginPage } from './pages/LoginPage';
import { PendingApprovalView } from './components/PendingApprovalView';
import { OwnerNotificationCenter } from './components/OwnerNotificationCenter';
import { Menu, Plus, Compass } from 'lucide-react';

// Halaman dimuat sesuai kebutuhan (code splitting) agar pembukaan pertama lebih cepat.
const PublicLanding = lazy(() => import('./pages/PublicLanding').then((m) => ({ default: m.PublicLanding })));
const OwnerDashboard = lazy(() => import('./pages/OwnerDashboard').then((m) => ({ default: m.OwnerDashboard })));
const OwnerReportsPage = lazy(() => import('./pages/OwnerReportsPage').then((m) => ({ default: m.OwnerReportsPage })));
const ConsultantDashboard = lazy(() => import('./pages/ConsultantDashboard').then((m) => ({ default: m.ConsultantDashboard })));
const GroupDashboard = lazy(() => import('./pages/GroupDashboard').then((m) => ({ default: m.GroupDashboard })));
const GroupList = lazy(() => import('./pages/GroupList').then((m) => ({ default: m.GroupList })));
const GroupDetail = lazy(() => import('./pages/GroupDetail').then((m) => ({ default: m.GroupDetail })));
const ClientPortal = lazy(() => import('./pages/ClientPortal').then((m) => ({ default: m.ClientPortal })));
const ClientList = lazy(() => import('./pages/ClientList').then((m) => ({ default: m.ClientList })));
const ClientDetail = lazy(() => import('./pages/ClientDetail').then((m) => ({ default: m.ClientDetail })));
const TeamSettings = lazy(() => import('./pages/TeamSettings').then((m) => ({ default: m.TeamSettings })));
const ContentCalendar = lazy(() => import('./pages/ContentCalendar').then((m) => ({ default: m.ContentCalendar })));
const MaterialLibrary = lazy(() => import('./pages/MaterialLibrary').then((m) => ({ default: m.MaterialLibrary })));
const CaseStudyConsents = lazy(() => import('./pages/CaseStudyConsents').then((m) => ({ default: m.CaseStudyConsents })));
const ContentDashboard = lazy(() => import('./pages/ContentDashboard').then((m) => ({ default: m.ContentDashboard })));
const SecurityAuditPage = lazy(() => import('./pages/SecurityAuditPage').then((m) => ({ default: m.SecurityAuditPage })));
const AccountApprovalPage = lazy(() => import('./pages/AccountApprovalPage').then((m) => ({ default: m.AccountApprovalPage })));
const ActivityLog = lazy(() => import('./components/ActivityLog').then((m) => ({ default: m.ActivityLog })));
const AttendancePage = lazy(() => import('./pages/AttendancePage').then((m) => ({ default: m.AttendancePage })));
const SessionFormModal = lazy(() => import('./components/SessionFormModal').then((m) => ({ default: m.SessionFormModal })));
const NewClientModal = lazy(() => import('./components/NewClientModal').then((m) => ({ default: m.NewClientModal })));

const PageLoading = () => (
  <div className="py-20 flex justify-center">
    <div className="w-7 h-7 border-3 border-blue-200 border-t-[#00236f] rounded-full animate-spin" />
  </div>
);

function MainApp() {
  const { userProfile, loading } = useAuth();
  // When entering first time, show login page as requested by user
  const [currentTab, setCurrentTab] = useState<string>('login');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Modals state
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>(undefined);
  const [sessionTargetClientId, setSessionTargetClientId] = useState<string | undefined>(undefined);
  const [showNewClientModal, setShowNewClientModal] = useState(false);

  // Sync route on login or role change
  useEffect(() => {
    if (!loading && userProfile) {
      if (currentTab === 'landing' || currentTab === 'login') {
        if (userProfile.role === 'client' || userProfile.role === 'klien') {
          setCurrentTab('portal');
        } else {
          setCurrentTab('dashboard');
        }
      }
    }
  }, [userProfile, loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-500 font-['Inter']">
        <img src="/logo-nexus.png" alt="Nexus" className="h-14 w-auto mb-5" />
        <div className="w-8 h-8 border-3 border-blue-200 border-t-[#00236f] rounded-full animate-spin mb-4" />
        <p className="text-xs font-semibold tracking-wide">Menghubungkan ke Nexus Client Hub...</p>
      </div>
    );
  }

  // If user is on public landing page
  if (currentTab === 'landing') {
    return (
      <Suspense fallback={<PageLoading />}>
      <PublicLanding
        onOpenLogin={() => setCurrentTab('login')}
        isLoggedIn={!!userProfile}
        onGoToDashboard={() => {
          if (userProfile?.role === 'client' || userProfile?.role === 'klien') {
            setCurrentTab('portal');
          } else {
            setCurrentTab('dashboard');
          }
        }}
      />
      </Suspense>
    );
  }

  // If user is on login page
  if (currentTab === 'login' && !userProfile) {
    return (
      <LoginPage
        onBackToLanding={() => setCurrentTab('landing')}
        onLoginSuccess={() => {
          // Auth state update will trigger redirection
        }}
      />
    );
  }

  // If not logged in and attempted to view authenticated page, show login
  if (!userProfile) {
    return (
      <LoginPage
        onBackToLanding={() => setCurrentTab('landing')}
        onLoginSuccess={() => {}}
      />
    );
  }

  // If user is pending approval or rejected, gate access behind PendingApprovalView
  if (userProfile.status === 'pending' || userProfile.status === 'rejected') {
    return <PendingApprovalView />;
  }

  const role = userProfile.role;
  const isOwner = role === 'owner';
  const isClient = role === 'client' || role === 'klien';
  const isConsultantOrStaff = !isClient && !isOwner;

  const handleOpenSessionModal = (sessionId?: string, clientId?: string) => {
    setActiveSessionId(sessionId);
    setSessionTargetClientId(clientId);
    setShowSessionModal(true);
  };

  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
    setCurrentTab('client-detail');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-['Inter'] flex">
      {/* Universal 2-Group Sidebar (Client Hub & Team Hub) */}
      <Sidebar
        currentTab={currentTab}
        onNavigate={(tab) => {
          if (tab === 'clients') setSelectedClientId(null);
          setCurrentTab(tab);
        }}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Workspace Area (offset by sidebar width on desktop) */}
      <div className="flex-1 md:pl-64 flex flex-col min-w-0">
        {/* Top bar for mobile and top actions */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 md:hidden cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-[#00236f]">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Zona WITA (UTC+8)</span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500 font-normal">Pusat Pendampingan Bisnis</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isOwner && (
              <>
                <OwnerNotificationCenter
                  variant="popover"
                  onNavigate={(tab) => {
                    if (tab === 'clients') setSelectedClientId(null);
                    setCurrentTab(tab);
                  }}
                />
                {/* Tombol cepat hanya di Dashboard (Daftar Klien punya tombolnya sendiri). */}
                {currentTab === 'dashboard' && (
                  <button
                    onClick={() => setShowNewClientModal(true)}
                    aria-label="Tambah Klien Baru"
                    className="inline-flex items-center gap-1.5 bg-[#00236f] hover:bg-[#1e3a8a] text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition shadow-xs cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Tambah Klien Baru</span>
                  </button>
                )}
              </>
            )}
          </div>
        </header>

        {/* Content Canvas */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Suspense fallback={<PageLoading />}>
          {/* GROUPS VIEWS (Universal across roles) */}
          {currentTab === 'groups' && (
            <GroupList
              onSelectGroup={(gid) => {
                setSelectedGroupId(gid);
                setCurrentTab('group-detail');
              }}
            />
          )}

          {currentTab === 'group-detail' && selectedGroupId && (
            <GroupDetail
              groupId={selectedGroupId}
              onBack={() => setCurrentTab('groups')}
              onSelectClient={handleSelectClient}
            />
          )}

          {/* TIM GRUP DASHBOARD */}
          {role === 'tim_grup' && currentTab === 'dashboard' && (
            <GroupDashboard
              onSelectGroup={(gid) => {
                setSelectedGroupId(gid);
                setCurrentTab('group-detail');
              }}
              onSelectClient={handleSelectClient}
            />
          )}

          {/* TIM KONTEN DASHBOARD */}
          {role === 'tim_konten' && currentTab === 'dashboard' && (
            <ContentDashboard onNavigate={setCurrentTab} />
          )}

          {/* ABSEN & TO-DO HARIAN (tim internal) */}
          {!isClient && currentTab === 'attendance' && <AttendancePage />}

          {/* UNIVERSAL CONTENT & MEDIA TABS */}
          {!isClient && currentTab === 'content-calendar' && <ContentCalendar />}
          {!isClient && currentTab === 'material-library' && <MaterialLibrary />}
          {currentTab === 'case-study-consents' && <CaseStudyConsents />}

          {/* OWNER VIEWS */}
          {isOwner && (
            <>
              {currentTab === 'dashboard' && (
                <OwnerDashboard
                  onSelectClient={handleSelectClient}
                  onOpenNewClientModal={() => setShowNewClientModal(true)}
                  onNavigate={setCurrentTab}
                  onOpenSessionModal={handleOpenSessionModal}
                />
              )}
              {currentTab === 'clients' && (
                <ClientList
                  onSelectClient={handleSelectClient}
                  onOpenNewClientModal={() => setShowNewClientModal(true)}
                />
              )}
              {currentTab === 'client-detail' && selectedClientId && (
                <ClientDetail
                  clientId={selectedClientId}
                  onBack={() => setCurrentTab('clients')}
                  onOpenSessionModal={handleOpenSessionModal}
                />
              )}
              {currentTab === 'team' && <TeamSettings />}
              {currentTab === 'approvals' && <AccountApprovalPage onNavigate={setCurrentTab} />}
              {currentTab === 'security-audit' && <SecurityAuditPage />}
              {currentTab === 'reports' && (
                <OwnerReportsPage
                  onSelectClient={handleSelectClient}
                  onOpenNewClientModal={() => setShowNewClientModal(true)}
                  onNavigate={setCurrentTab}
                  onOpenSessionModal={handleOpenSessionModal}
                />
              )}
              {currentTab === 'activity-log' && <ActivityLog className="py-2" />}
            </>
          )}

          {/* CONSULTANT & STAFF VIEWS */}
          {isConsultantOrStaff && role !== 'tim_grup' && role !== 'tim_konten' && (
            <>
              {currentTab === 'dashboard' && (
                <ConsultantDashboard
                  onSelectClient={handleSelectClient}
                  onOpenSessionModal={handleOpenSessionModal}
                />
              )}
              {currentTab === 'clients' && (
                <ClientList
                  onSelectClient={handleSelectClient}
                  onOpenNewClientModal={() => setShowNewClientModal(true)}
                />
              )}
              {currentTab === 'client-detail' && selectedClientId && (
                <ClientDetail
                  clientId={selectedClientId}
                  onBack={() => setCurrentTab('clients')}
                  onOpenSessionModal={handleOpenSessionModal}
                />
              )}
            </>
          )}

          {/* TIM GRUP CLIENT VIEWS (Basic client overview) */}
          {role === 'tim_grup' && currentTab === 'clients' && (
            <ClientList
              onSelectClient={handleSelectClient}
              onOpenNewClientModal={() => setShowNewClientModal(true)}
            />
          )}

          {role === 'tim_grup' && currentTab === 'client-detail' && selectedClientId && (
            <ClientDetail
              clientId={selectedClientId}
              onBack={() => setCurrentTab('clients')}
              onOpenSessionModal={handleOpenSessionModal}
            />
          )}

          {/* CLIENT PORTAL VIEWS */}
          {isClient && currentTab === 'portal' && (
            <>
              <ClientPortal />
            </>
          )}
          </Suspense>
        </main>
      </div>

      {/* Global Modals (dimuat saat dibuka) */}
      <Suspense fallback={null}>
      {showSessionModal && (
      <SessionFormModal
        isOpen={showSessionModal}
        onClose={() => {
          setShowSessionModal(false);
          setActiveSessionId(undefined);
          setSessionTargetClientId(undefined);
        }}
        sessionId={activeSessionId}
        clientId={sessionTargetClientId}
        onSessionSaved={() => {}}
      />
      )}

      {showNewClientModal && (
      <NewClientModal
        isOpen={showNewClientModal}
        onClose={() => setShowNewClientModal(false)}
        onClientCreated={(newId) => {
          handleSelectClient(newId);
        }}
      />
      )}
      </Suspense>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
