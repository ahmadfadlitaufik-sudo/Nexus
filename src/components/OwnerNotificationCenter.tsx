import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Bell,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  UserCheck,
  Briefcase,
  Building2,
  Shield,
  ArrowRight,
  Check,
  X,
  ExternalLink,
  MessageCircle,
  Sparkles,
} from 'lucide-react';
import { UserProfile, UserRole } from '../types';
import {
  getAllUsers,
  approveUserRegistration,
  rejectUserRegistration,
} from '../services/db';
import { formatDateIndo } from '../utils/formatters';

interface OwnerNotificationCenterProps {
  variant?: 'popover' | 'banner' | 'compact';
  onNavigate?: (tab: string) => void;
  onActionComplete?: () => void;
  className?: string;
}

export const OwnerNotificationCenter: React.FC<OwnerNotificationCenterProps> = ({
  variant = 'popover',
  onNavigate,
  onActionComplete,
  className = '',
}) => {
  const { userProfile, availableDemoUsers, refreshDemoUsers } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Load pending users
  const loadPendingUsers = async () => {
    try {
      const all = await getAllUsers();
      const pending = all.filter((u) => u.status === 'pending');
      setPendingUsers(pending);
    } catch (err) {
      // Fallback to available demo users
      const fallbackPending = availableDemoUsers.filter((u) => u.status === 'pending');
      setPendingUsers(fallbackPending);
    }
  };

  useEffect(() => {
    loadPendingUsers();
  }, [availableDemoUsers]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Quick 1-click approve from notification
  const handleQuickApprove = async (user: UserProfile) => {
    setProcessingId(user.id);
    try {
      const approver = userProfile?.displayName || 'Ahmad Fadli Taufik (Owner)';
      let finalRole: UserRole = user.role;
      let finalTitle = user.title || 'Staf Pendamping WFA';

      if (user.registrationCategory === 'bod') {
        finalRole = 'owner';
        finalTitle = user.title || 'Managing Partner / Direksi';
      } else if (user.registrationCategory === 'client' || user.role === 'klien') {
        finalRole = 'klien';
        finalTitle = `Owner ${user.companyName || 'Bisnis'}`;
      }

      await approveUserRegistration(user.id, finalRole, finalTitle, approver);
      showToast(`Akun ${user.displayName} berhasil disetujui sebagai ${finalTitle}!`);
      await refreshDemoUsers();
      await loadPendingUsers();
      if (onActionComplete) onActionComplete();
    } catch (err) {
      console.error('Quick approve error:', err);
      showToast('Gagal menyetujui akun.');
    } finally {
      setProcessingId(null);
    }
  };

  // Quick reject from notification
  const handleQuickReject = async (user: UserProfile) => {
    setProcessingId(user.id);
    try {
      const approver = userProfile?.displayName || 'Ahmad Fadli Taufik (Owner)';
      await rejectUserRegistration(
        user.id,
        'Pendaftaran belum sesuai kuota atau kualifikasi saat ini.',
        approver
      );
      showToast(`Pendaftaran ${user.displayName} telah ditolak.`);
      await refreshDemoUsers();
      await loadPendingUsers();
      if (onActionComplete) onActionComplete();
    } catch (err) {
      console.error('Quick reject error:', err);
      showToast('Gagal memproses penolakan.');
    } finally {
      setProcessingId(null);
    }
  };

  const staffPending = pendingUsers.filter(
    (u) =>
      u.registrationCategory === 'staff' ||
      ['konsultan', 'tim_grup', 'tim_konten', 'staf_operasional'].includes(u.role)
  );
  const bodPending = pendingUsers.filter(
    (u) => u.registrationCategory === 'bod' || u.role === 'owner'
  );
  const clientPending = pendingUsers.filter(
    (u) => u.registrationCategory === 'client' || u.role === 'klien' || u.role === 'client'
  );

  // Time formatter helper
  const getRelativeTime = (isoString?: string) => {
    if (!isoString) return 'Baru saja mendaftar';
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Baru saja mendaftar';
      if (diffMins < 60) return `${diffMins} menit lalu`;
      if (diffHours < 24) return `${diffHours} jam lalu`;
      if (diffDays === 1) return 'Kemarin';
      return `${diffDays} hari lalu`;
    } catch {
      return formatDateIndo(isoString);
    }
  };

  // --------------------------------------------------------------------------
  // VARIANT 1: POPOVER (Notification Bell in Header / Navbar)
  // --------------------------------------------------------------------------
  if (variant === 'popover') {
    return (
      <div className={`relative ${className}`} ref={popoverRef}>
        {/* Bell Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`relative p-2 rounded-xl transition cursor-pointer flex items-center justify-center ${
            isOpen
              ? 'bg-[#00236f] text-white shadow-xs'
              : pendingUsers.length > 0
              ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300'
              : 'text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
          title="Pusat Notifikasi Persetujuan Akun"
        >
          <Bell className="w-4 h-4" />
          {pendingUsers.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-red-600 text-[9px] font-black text-white shadow-xs animate-bounce">
              {pendingUsers.length}
            </span>
          )}
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 font-['Inter']">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#00236f] to-[#1e3a8a] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <UserCheck className="w-4 h-4 text-blue-200" />
                </div>
                <div>
                  <h4 className="text-xs font-bold font-['Plus_Jakarta_Sans']">
                    Pusat Notifikasi BOD
                  </h4>
                  <p className="text-[10px] text-blue-200/90">
                    {pendingUsers.length > 0
                      ? `${pendingUsers.length} staf & pengguna menunggu persetujuan`
                      : 'Semua pendaftaran telah diproses'}
                  </p>
                </div>
              </div>

              {pendingUsers.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 uppercase">
                  Pending ({pendingUsers.length})
                </span>
              )}
            </div>

            {/* Toast feedback inside popover */}
            {toastMsg && (
              <div className="p-2.5 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-[11px] font-semibold flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{toastMsg}</span>
              </div>
            )}

            {/* Notification List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
              {pendingUsers.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  </div>
                  <p className="text-xs font-bold text-slate-800">Tidak ada permohonan tertunda</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Seluruh akun staf tim dan klien baru sudah terverifikasi.
                  </p>
                </div>
              ) : (
                pendingUsers.map((user) => {
                  const isStaff =
                    user.registrationCategory === 'staff' ||
                    ['konsultan', 'tim_grup', 'tim_konten'].includes(user.role);
                  const isBod = user.registrationCategory === 'bod' || user.role === 'owner';
                  const isProcessing = processingId === user.id;

                  const badgeClass = isBod
                    ? 'bg-purple-100 text-purple-800'
                    : isStaff
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-teal-100 text-teal-800';

                  const badgeLabel = isBod
                    ? 'Dewan Direksi (BOD)'
                    : isStaff
                    ? 'Staf Tim'
                    : 'Klien UKM';

                  return (
                    <div
                      key={user.id}
                      className="p-3.5 hover:bg-slate-50 transition flex flex-col gap-2.5"
                    >
                      <div className="flex items-start gap-2.5">
                        <img
                          src={
                            user.avatarUrl ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              user.displayName
                            )}&background=00236f&color=fff&bold=true`
                          }
                          alt={user.displayName}
                          className="w-9 h-9 rounded-xl object-cover shrink-0 border border-slate-200 mt-0.5"
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {user.displayName}
                            </span>
                            <span className="text-[9px] text-slate-400 shrink-0">
                              {getRelativeTime(user.createdAt)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${badgeClass}`}>
                              {badgeLabel}
                            </span>
                            <span className="text-[11px] text-slate-600 truncate">
                              {user.title || user.companyName || user.email}
                            </span>
                          </div>

                          {user.notes && (
                            <p className="text-[10px] text-slate-500 line-clamp-1 italic mt-1 bg-slate-50 p-1 rounded">
                              "{user.notes}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-100">
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleQuickApprove(user)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold inline-flex items-center gap-1 transition shadow-2xs cursor-pointer disabled:opacity-50"
                        >
                          <Check className="w-3 h-3" />
                          Setujui Cepat
                        </button>

                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleQuickReject(user)}
                          className="px-2 py-1 border border-slate-200 hover:bg-red-50 text-slate-600 hover:text-red-700 rounded-lg text-[10px] font-semibold inline-flex items-center gap-0.5 transition cursor-pointer disabled:opacity-50"
                        >
                          <X className="w-3 h-3" />
                          Tolak
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  if (onNavigate) onNavigate('approvals');
                }}
                className="text-xs font-bold text-[#0051d5] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                Buka Manajemen Persetujuan Lengkap
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // VARIANT 2: BANNER (Prominent Alert Card in Dashboard)
  // --------------------------------------------------------------------------
  if (pendingUsers.length === 0) return null;

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-r from-amber-500/10 via-amber-50 to-orange-50 border border-amber-300 rounded-2xl p-4 sm:p-5 shadow-xs animate-in fade-in ${className}`}
    >
      {/* Decorative accent */}
      <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-amber-400/10 blur-xl pointer-events-none" />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
            <Bell className="w-5 h-5 animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-amber-950 font-['Plus_Jakarta_Sans']">
                {pendingUsers.length} Pendaftaran Akun Staf &amp; Pengguna Menunggu Persetujuan
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-950 uppercase tracking-wider animate-pulse">
                Pemberitahuan BOD
              </span>
            </div>

            <p className="text-xs text-amber-900/80 mt-1 max-w-2xl leading-relaxed">
              Terdapat calon anggota tim dan pendaftar baru yang memerlukan verifikasi hak akses sebelum dapat masuk ke sistem pendampingan Nexus:
            </p>

            {/* Quick Chips of Pending Applicants */}
            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
              {staffPending.length > 0 && (
                <span className="text-[11px] font-semibold bg-white/80 border border-amber-300 px-2 py-0.5 rounded-md text-blue-900 inline-flex items-center gap-1">
                  <Briefcase className="w-3 h-3 text-blue-700" />
                  {staffPending.length} Calon Staf &amp; Konsultan
                </span>
              )}
              {bodPending.length > 0 && (
                <span className="text-[11px] font-semibold bg-white/80 border border-amber-300 px-2 py-0.5 rounded-md text-purple-900 inline-flex items-center gap-1">
                  <Shield className="w-3 h-3 text-purple-700" />
                  {bodPending.length} Calon Direksi (BOD)
                </span>
              )}
              {clientPending.length > 0 && (
                <span className="text-[11px] font-semibold bg-white/80 border border-amber-300 px-2 py-0.5 rounded-md text-teal-900 inline-flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-teal-700" />
                  {clientPending.length} Pendaftar Klien Baru
                </span>
              )}
            </div>

            {/* Avatar previews */}
            <div className="flex items-center gap-1.5 mt-3">
              <div className="flex -space-x-2 overflow-hidden">
                {pendingUsers.slice(0, 4).map((u) => (
                  <img
                    key={u.id}
                    className="inline-block h-6 w-6 rounded-full ring-2 ring-white object-cover"
                    src={
                      u.avatarUrl ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        u.displayName
                      )}&background=00236f&color=fff&bold=true`
                    }
                    alt={u.displayName}
                    title={`${u.displayName} (${u.title || u.role})`}
                  />
                ))}
              </div>
              <span className="text-[11px] font-semibold text-amber-900 ml-1">
                {pendingUsers[0]?.displayName}
                {pendingUsers.length > 1 ? ` dan ${pendingUsers.length - 1} lainnya` : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Right CTA */}
        <div className="flex items-center gap-2 self-start lg:self-center shrink-0">
          {onNavigate && (
            <button
              onClick={() => onNavigate('approvals')}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              Tinjau &amp; Setujui ({pendingUsers.length})
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
