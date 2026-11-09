import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Compass,
  LayoutDashboard,
  Users,
  Calendar,
  CheckSquare,
  TrendingUp,
  Briefcase,
  UserCheck,
  FileSpreadsheet,
  Activity,
  LogOut,
  ChevronDown,
  Sparkles,
  Shield,
  Layers,
  Bookmark,
  Clock,
  X,
  Camera,
} from 'lucide-react';
import { AvatarPickerModal } from './AvatarPickerModal';
import { DEMO_MODE } from '../config/appMode';

interface SidebarProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onNavigate,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { userProfile, logout, switchDemoRole, availableDemoUsers, updateAvatar } = useAuth();
  const [showRoleSelector, setShowRoleSelector] = React.useState(false);
  const [showAvatarModal, setShowAvatarModal] = React.useState(false);

  const role = userProfile?.role || 'owner';
  const isOwner = role === 'owner';
  const isConsultant = role === 'consultant' || role === 'konsultan';
  const isClient = role === 'client' || role === 'klien';
  const isTeamOrStaff =
    role === 'tim_grup' || role === 'tim_konten' || role === 'staf_operasional';

  const roleLabel =
    role === 'owner'
      ? 'Owner'
      : role === 'consultant' || role === 'konsultan'
      ? 'Konsultan'
      : role === 'client' || role === 'klien'
      ? 'Klien'
      : role === 'tim_grup'
      ? 'Tim Grup'
      : role === 'tim_konten'
      ? 'Tim Konten'
      : 'Staf Ops';

  const roleBadgeStyle =
    role === 'owner'
      ? 'bg-purple-100 text-purple-800'
      : isConsultant
      ? 'bg-blue-100 text-blue-800'
      : isClient
      ? 'bg-emerald-100 text-emerald-800'
      : 'bg-amber-100 text-amber-800';

  const handleNav = (tab: string) => {
    onNavigate(tab);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs md:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-300 md:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Header & Brand */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => handleNav(isClient ? 'portal' : 'dashboard')}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00236f] to-[#1e3a8a] text-white flex items-center justify-center font-bold text-lg shadow-sm shadow-blue-900/20 shrink-0">
                <Compass className="w-5 h-5 text-blue-200" />
              </div>
              <div>
                <span className="text-sm font-bold text-slate-900 tracking-tight block leading-tight font-['Plus_Jakarta_Sans']">
                  Nexust Growth
                </span>
                <span className="text-[10px] font-semibold text-[#0051d5] tracking-wide block uppercase">
                  Client & Team Hub
                </span>
              </div>
            </div>

            <button
              onClick={onCloseMobile}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 md:hidden cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Role Simulation Badge & Picker */}
          <div className="p-3 mx-3 mt-3 bg-slate-50 border border-slate-200/80 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {DEMO_MODE ? 'Simulasi Peran' : 'Akun Aktif'}
              </span>
              {DEMO_MODE && (
              <button
                onClick={() => setShowRoleSelector(!showRoleSelector)}
                className="text-[10px] font-semibold text-[#0051d5] hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                Ganti <ChevronDown className="w-3 h-3" />
              </button>
              )}
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-xs font-semibold text-slate-900 truncate max-w-[120px]">
                {userProfile?.displayName}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${roleBadgeStyle}`}>
                {roleLabel}
              </span>
            </div>

            {DEMO_MODE && showRoleSelector && (
              <div className="mt-2 pt-2 border-t border-slate-200 space-y-1 animate-in fade-in">
                {availableDemoUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      switchDemoRole(u.id);
                      setShowRoleSelector(false);
                    }}
                    className={`w-full text-left p-1.5 rounded text-[11px] flex items-center justify-between hover:bg-white transition cursor-pointer ${
                      userProfile?.id === u.id ? 'font-bold text-[#00236f] bg-blue-50' : 'text-slate-600'
                    }`}
                  >
                    <span className="truncate">{u.displayName}</span>
                    <span className="text-[9px] uppercase opacity-75 font-semibold">
                      {u.role}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Navigation Menus: Two Distinct Groups (Client Hub & Team Hub) */}
          <nav className="p-3 space-y-6 flex-1 text-xs font-medium">
            {/* GROUP 1: CLIENT HUB */}
            <div>
              <div className="px-3 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3 h-3 text-[#00236f]" />
                <span>Client Hub</span>
              </div>

              <div className="space-y-1">
                {/* Dashboard: adapts per role */}
                {!isClient ? (
                  <button
                    onClick={() => handleNav('dashboard')}
                    className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2.5 transition cursor-pointer ${
                      currentTab === 'dashboard'
                        ? 'bg-[#00236f] text-white font-semibold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4 shrink-0" />
                    <span>
                      {isOwner
                        ? 'Dashboard Utama Owner'
                        : role === 'tim_grup'
                        ? 'Dashboard Tim Grup'
                        : role === 'tim_konten'
                        ? 'Dashboard Tim Konten'
                        : 'Dashboard Konsultan'}
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleNav('portal')}
                    className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2.5 transition cursor-pointer ${
                      currentTab === 'portal'
                        ? 'bg-[#00236f] text-white font-semibold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4 shrink-0" />
                    <span>Portal Bisnis Saya</span>
                  </button>
                )}

                {/* Daftar Klien (Owner, Konsultan, Tim Grup - STRICTLY HIDDEN for Tim Konten) */}
                {!isClient && role !== 'tim_konten' && (
                  <button
                    onClick={() => handleNav('clients')}
                    className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2.5 transition cursor-pointer ${
                      currentTab === 'clients' || currentTab === 'client-detail'
                        ? 'bg-[#00236f] text-white font-semibold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Users className="w-4 h-4 shrink-0" />
                    <span>{isOwner ? 'Daftar Klien' : 'Klien Binaan Saya'}</span>
                  </button>
                )}

                {/* Daftar Grup & Mastermind */}
                <button
                  onClick={() => handleNav('groups')}
                  className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2.5 transition cursor-pointer ${
                    currentTab === 'groups' || currentTab === 'group-detail'
                      ? 'bg-[#00236f] text-white font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Layers className="w-4 h-4 shrink-0" />
                  <span>Daftar Grup &amp; Cohort</span>
                </button>
              </div>
            </div>

            {/* GROUP 2: CONTENT & MEDIA HUB (Kalender Konten, Perpustakaan, Izin Studi Kasus) */}
            <div>
              <div className="px-3 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-[#0051d5]" />
                <span>Content &amp; Material Hub</span>
              </div>

              <div className="space-y-1">
                {/* Kalender Konten */}
                <button
                  onClick={() => handleNav('content-calendar')}
                  className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2.5 transition cursor-pointer ${
                    currentTab === 'content-calendar'
                      ? 'bg-[#00236f] text-white font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Calendar className="w-4 h-4 shrink-0" />
                  <span>Kalender Konten</span>
                </button>

                {/* Perpustakaan Materi */}
                <button
                  onClick={() => handleNav('material-library')}
                  className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2.5 transition cursor-pointer ${
                    currentTab === 'material-library'
                      ? 'bg-[#00236f] text-white font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Bookmark className="w-4 h-4 shrink-0" />
                  <span>Perpustakaan Materi</span>
                </button>

                {/* Izin Studi Kasus */}
                <button
                  onClick={() => handleNav('case-study-consents')}
                  className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2.5 transition cursor-pointer ${
                    currentTab === 'case-study-consents'
                      ? 'bg-[#00236f] text-white font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Shield className="w-4 h-4 shrink-0" />
                  <span>Izin Studi Kasus</span>
                </button>
              </div>
            </div>

            {/* GROUP 3: TEAM & SYSTEM HUB */}
            <div>
              <div className="px-3 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase className="w-3 h-3 text-[#00236f]" />
                <span>Management Hub</span>
              </div>

              <div className="space-y-1">
                {/* Pengaturan Tim & Persetujuan Akun (Owner Only) */}
                {isOwner && (
                  <>
                    <button
                      onClick={() => handleNav('approvals')}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition cursor-pointer ${
                        currentTab === 'approvals'
                          ? 'bg-[#00236f] text-white font-semibold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <UserCheck className="w-4 h-4 shrink-0" />
                        <span>Approval Pendaftaran</span>
                      </div>
                      {availableDemoUsers.filter((u) => u.status === 'pending').length > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-500 text-white shadow-xs animate-pulse">
                          {availableDemoUsers.filter((u) => u.status === 'pending').length}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => handleNav('team')}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2.5 transition cursor-pointer ${
                        currentTab === 'team'
                          ? 'bg-[#00236f] text-white font-semibold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Users className="w-4 h-4 shrink-0" />
                      <span>Pengaturan Tim & Akses</span>
                    </button>

                    <button
                      onClick={() => handleNav('security-audit')}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2.5 transition cursor-pointer ${
                        currentTab === 'security-audit'
                          ? 'bg-[#00236f] text-white font-semibold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Shield className="w-4 h-4 shrink-0" />
                      <span>Log Audit Keamanan</span>
                    </button>
                  </>
                )}

                {/* Beranda Publik Link */}
                <button
                  onClick={() => handleNav('landing')}
                  className="w-full text-left px-3 py-2 rounded-xl flex items-center gap-2.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                >
                  <Compass className="w-4 h-4 shrink-0" />
                  <span>Lihat Beranda Publik</span>
                </button>
              </div>
            </div>
          </nav>

          {/* Footer User Profile & Logout */}
          <div className="p-4 border-t border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div
                  className="relative group cursor-pointer shrink-0"
                  onClick={() => setShowAvatarModal(true)}
                  title="Ganti Foto Avatar Profil"
                >
                  <img
                    src={
                      userProfile?.avatarUrl ||
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                    }
                    alt={userProfile?.displayName || 'User'}
                    className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-300 group-hover:ring-[#0051d5] transition"
                  />
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-white">
                    <Camera className="w-3.5 h-3.5 drop-shadow-sm" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#0051d5] text-white rounded-full flex items-center justify-center shadow-xs text-[8px] font-bold ring-1 ring-white">
                    ✎
                  </span>
                </div>

                <div className="overflow-hidden">
                  <div className="text-xs font-semibold text-slate-900 truncate flex items-center gap-1">
                    <span>{userProfile?.displayName}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                    <span className="capitalize">{userProfile?.role}</span>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => setShowAvatarModal(true)}
                      className="text-[#0051d5] hover:underline cursor-pointer"
                    >
                      Ganti Avatar
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={() => logout()}
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer shrink-0"
                title="Keluar"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Avatar Picker Modal */}
      {showAvatarModal && userProfile && (
        <AvatarPickerModal
          isOpen={showAvatarModal}
          onClose={() => setShowAvatarModal(false)}
          currentAvatarUrl={userProfile.avatarUrl}
          userDisplayName={userProfile.displayName}
          userRole={userProfile.role}
          onSaveAvatar={async (newAvatarUrl) => {
            await updateAvatar(newAvatarUrl);
          }}
        />
      )}
    </>
  );
};
