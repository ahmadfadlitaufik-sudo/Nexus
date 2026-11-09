import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  Briefcase,
  UserCheck,
  LogOut,
  ChevronDown,
  Layers,
  ShieldAlert,
  ArrowRight,
  Clock,
  Camera,
} from 'lucide-react';
import { AvatarPickerModal } from './AvatarPickerModal';
import { DEMO_MODE } from '../config/appMode';

interface NavbarProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  onOpenNewClientModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onNavigate, onOpenNewClientModal }) => {
  const { userProfile, logout, switchDemoRole, availableDemoUsers, updateAvatar } = useAuth();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  const role = userProfile?.role || 'owner';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      {/* Top Banner indicating WITA Zone & Active Session */}
      <div className="bg-[#00236f] text-white px-4 py-1.5 text-xs flex flex-wrap items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-medium tracking-wide">Nexus Growth Partner • Hub Konsultasi WFA</span>
          <span className="hidden sm:inline text-blue-200">| Zona Waktu WITA (UTC+8)</span>
        </div>

        {/* Demo Role Switcher Quick Pill — hanya di DEMO_MODE */}
        {DEMO_MODE && (
        <div className="relative">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center gap-1.5 bg-blue-900/80 hover:bg-blue-800 text-blue-100 px-2.5 py-0.5 rounded-full text-xs font-medium border border-blue-600/50 transition cursor-pointer"
            title="Ganti peran untuk menguji hak akses"
          >
            <span>Simulasi Peran:</span>
            <span className="font-bold uppercase text-white bg-[#0051d5] px-1.5 py-0.2 rounded text-[10px]">
              {role === 'owner' ? 'Owner' : role === 'consultant' ? 'Konsultan' : 'Klien'}
            </span>
            <ChevronDown className="w-3 h-3 text-blue-300" />
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-1.5 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 text-slate-800 animate-in fade-in slide-in-from-top-1">
              <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Pilih Akun / Peran Pengujian:
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                {availableDemoUsers.map((u) => {
                  const isCurrent = userProfile?.id === u.id;
                  const roleBadge =
                    u.role === 'owner'
                      ? 'bg-purple-100 text-purple-700'
                      : u.role === 'consultant'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-emerald-100 text-emerald-700';

                  return (
                    <button
                      key={u.id}
                      onClick={() => {
                        switchDemoRole(u.id);
                        setShowRoleMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition cursor-pointer ${
                        isCurrent ? 'bg-blue-50/70 font-semibold' : ''
                      }`}
                    >
                      <div>
                        <div className="text-slate-900 font-medium">{u.displayName}</div>
                        <div className="text-[11px] text-slate-500">{u.title || u.email}</div>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase ${roleBadge}`}>
                        {u.role === 'owner' ? 'Owner' : u.role === 'consultant' ? 'Konsultan' : 'Klien'}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="px-3 pt-2 pb-1 border-t border-slate-100 text-[10px] text-slate-400">
                Peralihan ini menguji pembatasan data & izin internal.
              </div>
            </div>
          )}
        </div>
        )}
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('dashboard')}>
            <img src="/logo-mark.png" alt="" className="h-10 w-auto" />
            <div>
              <span className="text-lg font-bold text-slate-900 tracking-tight block leading-tight font-['Plus_Jakarta_Sans']">
                Nexus Growth Partner
              </span>
              <span className="text-[11px] font-medium text-slate-500 block leading-tight">
                Client Hub • Pendampingan WFA
              </span>
            </div>
          </div>

          {/* Nav Links based on Role */}
          <nav className="hidden md:flex items-center gap-1">
            {role === 'owner' && (
              <>
                <button
                  onClick={() => onNavigate('dashboard')}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition cursor-pointer flex items-center gap-2 ${
                    currentTab === 'dashboard'
                      ? 'bg-blue-50 text-[#00236f] font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard Owner
                </button>
                <button
                  onClick={() => onNavigate('clients')}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition cursor-pointer flex items-center gap-2 ${
                    currentTab === 'clients'
                      ? 'bg-blue-50 text-[#00236f] font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Daftar Klien
                </button>
                <button
                  onClick={() => onNavigate('team')}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition cursor-pointer flex items-center gap-2 ${
                    currentTab === 'team'
                      ? 'bg-blue-50 text-[#00236f] font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Briefcase className="w-4 h-4" />
                  Pengaturan Tim
                </button>
              </>
            )}

            {role === 'consultant' && (
              <>
                <button
                  onClick={() => onNavigate('dashboard')}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition cursor-pointer flex items-center gap-2 ${
                    currentTab === 'dashboard'
                      ? 'bg-blue-50 text-[#00236f] font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard Konsultan
                </button>
                <button
                  onClick={() => onNavigate('clients')}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition cursor-pointer flex items-center gap-2 ${
                    currentTab === 'clients'
                      ? 'bg-blue-50 text-[#00236f] font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Klien Binaan Saya
                </button>
              </>
            )}

            {role === 'client' && (
              <>
                <button
                  onClick={() => onNavigate('portal')}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition cursor-pointer flex items-center gap-2 ${
                    currentTab === 'portal'
                      ? 'bg-blue-50 text-[#00236f] font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Portal Bisnis Saya
                </button>
              </>
            )}

            <button
              onClick={() => onNavigate('landing')}
              className="px-3 py-2 rounded-lg text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Beranda Publik
            </button>
          </nav>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-3">
            {role === 'owner' && onOpenNewClientModal && (
              <button
                onClick={onOpenNewClientModal}
                className="hidden sm:inline-flex items-center gap-1.5 bg-[#00236f] hover:bg-[#1e3a8a] text-white text-xs font-semibold px-3 py-2 rounded-lg transition shadow-xs cursor-pointer"
              >
                + Tambah Klien
              </button>
            )}

            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
              {/* Clickable Avatar to Change Photo */}
              <div
                className="relative group cursor-pointer"
                onClick={() => setShowAvatarModal(true)}
                title="Ganti Foto Avatar Profil"
              >
                <img
                  src={
                    userProfile?.avatarUrl ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                  }
                  alt={userProfile?.displayName || 'User'}
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-100 group-hover:ring-[#0051d5] transition shadow-xs"
                />
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-white">
                  <Camera className="w-4 h-4 drop-shadow-sm" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-[#0051d5] text-white rounded-full flex items-center justify-center shadow-xs text-[9px] font-bold ring-1 ring-white">
                  ✎
                </span>
              </div>

              <div className="hidden lg:block text-left">
                <div className="text-xs font-semibold text-slate-900 leading-tight">
                  {userProfile?.displayName}
                </div>
                <div className="text-[10px] text-slate-500 leading-tight">
                  {role === 'owner'
                    ? 'Owner / Principal'
                    : role === 'consultant'
                    ? 'Konsultan Bisnis'
                    : 'Klien'}
                </div>
              </div>
              <button
                onClick={() => logout()}
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                title="Keluar"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

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
    </header>
  );
};
