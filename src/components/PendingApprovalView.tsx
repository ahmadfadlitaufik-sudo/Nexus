import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Clock,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  LogOut,
  MessageCircle,
  Mail,
  Phone,
  Building2,
  Briefcase,
} from 'lucide-react';
import { formatDateIndo } from '../utils/formatters';

interface PendingApprovalViewProps {
  onLogout?: () => void;
}

export const PendingApprovalView: React.FC<PendingApprovalViewProps> = () => {
  const { userProfile, refreshCurrentUser, logout } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  const isRejected = userProfile?.status === 'rejected';

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshMessage(null);
    try {
      await refreshCurrentUser();
      setRefreshMessage('Status akun berhasil diperbarui.');
      setTimeout(() => setRefreshMessage(null), 3000);
    } catch (err) {
      setRefreshMessage('Gagal memperbarui status. Silakan coba sesaat lagi.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const getCategoryLabel = () => {
    switch (userProfile?.registrationCategory) {
      case 'bod':
        return 'Dewan Direksi (BOD)';
      case 'staff':
        return 'Staf & Tim Nexus';
      case 'client':
        return 'Klien / Mitra Usaha';
      default:
        return userProfile?.role === 'klien' ? 'Klien' : 'Staf Tim';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-['Inter']">
      <div className="max-w-md w-full mx-auto">
        {/* Brand header */}
        <div className="text-center mb-6">
          <img src="/logo-nexus.png" alt="Nexus" className="h-14 w-auto mx-auto mb-3" />
          <h2 className="text-2xl font-black text-slate-900 font-['Plus_Jakarta_Sans'] tracking-tight">
            Nexus Client &amp; Team Hub
          </h2>
          <p className="text-xs text-slate-500 mt-1">Platform Pendampingan Bisnis UKM Berbasis WFA</p>
        </div>

        {/* Status card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
          {isRejected ? (
            <div>
              <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto mb-4">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="text-center text-lg font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                Permohonan Belum Disetujui
              </h3>
              <p className="text-center text-xs text-slate-600 mt-1">
                Mohon maaf, permohonan pendaftaran akun Anda saat ini belum dapat disetujui oleh Owner / Managing Partner.
              </p>

              {userProfile?.rejectionReason && (
                <div className="mt-4 p-3.5 bg-red-50/70 border border-red-200 rounded-xl text-xs text-red-800">
                  <span className="font-semibold block mb-0.5">Catatan Penolakan:</span>
                  <p>{userProfile.rejectionReason}</p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-center text-lg font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                Menunggu Persetujuan Owner / BOD
              </h3>
              <p className="text-center text-xs text-slate-600 mt-1">
                Akun pendaftaran Anda telah tercatat dan saat ini sedang dalam proses verifikasi oleh Founder &amp; Managing Partner (Ahmad Fadli Taufik).
              </p>
            </div>
          )}

          {/* User profile summary */}
          <div className="mt-6 bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-2.5 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-slate-500">Nama Pendaftar</span>
              <span className="font-bold text-slate-900">{userProfile?.displayName}</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-slate-500">Email</span>
              <span className="font-medium text-slate-800">{userProfile?.email}</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-slate-500">Kategori Registrasi</span>
              <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                {getCategoryLabel()}
              </span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-slate-500">Jabatan / Usaha Diajukan</span>
              <span className="font-medium text-slate-800">
                {userProfile?.title || userProfile?.companyName || 'Staf Pendamping'}
              </span>
            </div>
            {userProfile?.phone && (
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500">No. WhatsApp</span>
                <span className="font-medium text-slate-800">{userProfile.phone}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Status Akun</span>
              <span
                className={`font-bold px-2 py-0.5 rounded-full uppercase tracking-wider text-xs ${
                  isRejected
                    ? 'bg-red-100 text-red-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {isRejected ? 'Ditolak' : 'Menunggu Approval (Pending)'}
              </span>
            </div>
          </div>

          {refreshMessage && (
            <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-xs text-center font-medium">
              {refreshMessage}
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-6 space-y-2.5">
            {!isRejected && (
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-[#00236f] hover:bg-[#1e3a8a] text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Memeriksa Status...' : 'Periksa Status Persetujuan'}
              </button>
            )}

            <a
              href="https://wa.me/6282355522710?text=Halo%20Owner%20Nexus,%20saya%20sudah%20mendaftar%20akun%20di%20Client%20Hub%20dan%20menunggu%20approval."
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Hubungi Owner via WhatsApp
            </a>

            <button
              type="button"
              onClick={logout}
              className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Keluar / Ganti Akun
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          Sistem Pengawasan Keamanan &amp; Hak Akses Berjenjang • Nexus Growth Partner
        </p>
      </div>
    </div>
  );
};
