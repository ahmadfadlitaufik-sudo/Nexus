/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { PublicLanding } from './pages/PublicLanding';
import { LoginPage } from './pages/LoginPage';
import { OwnerDashboard } from './pages/OwnerDashboard';
import { ConsultantDashboard } from './pages/ConsultantDashboard';
import { GroupDashboard } from './pages/GroupDashboard';
import { GroupList } from './pages/GroupList';
import { GroupDetail } from './pages/GroupDetail';
import { ClientPortal } from './pages/ClientPortal';
import { ClientList } from './pages/ClientList';
import { ClientDetail } from './pages/ClientDetail';
import { TeamSettings } from './pages/TeamSettings';
import { ContentCalendar } from './pages/ContentCalendar';
import { MaterialLibrary } from './pages/MaterialLibrary';
import { CaseStudyConsents } from './pages/CaseStudyConsents';
import { ContentDashboard } from './pages/ContentDashboard';
import { SecurityAuditPage } from './pages/SecurityAuditPage';
import { AccountApprovalPage } from './pages/AccountApprovalPage';
import { PendingApprovalView } from './components/PendingApprovalView';
import { OwnerNotificationCenter } from './components/OwnerNotificationCenter';
import { ActivityLog } from './components/ActivityLog';
import { SessionFormModal } from './components/SessionFormModal';
import { NewClientModal } from './components/NewClientModal';
import { Menu, Plus, Compass } from 'lucide-react';

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
        <div className="w-10 h-10 border-3 border-blue-200 border-t-[#00236f] rounded-full animate-spin mb-4" />
        <p className="text-xs font-semibold tracking-wide">Menghubungkan ke Nexust Client Hub...</p>
      </div>
    );
  }

  // If user is on public landing page
  if (currentTab === 'landing') {
    return (
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
              <span className="text-slate-500 font-normal">WFA Business Advisory Hub</span>
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
                <button
                  onClick={() => setShowNewClientModal(true)}
                  className="inline-flex items-center gap-1.5 bg-[#00236f] hover:bg-[#1e3a8a] text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Tambah Klien Baru</span>
                </button>
              </>
            )}
          </div>
        </header>

        {/* Content Canvas */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

          {/* UNIVERSAL CONTENT & MEDIA TABS */}
          {currentTab === 'content-calendar' && <ContentCalendar />}
          {currentTab === 'material-library' && <MaterialLibrary />}
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
        </main>
      </div>

      {/* Global Modals */}
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

      <NewClientModal
        isOpen={showNewClientModal}
        onClose={() => setShowNewClientModal(false)}
        onClientCreated={(newId) => {
          handleSelectClient(newId);
        }}
      />
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
