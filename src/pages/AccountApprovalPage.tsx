import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  Check,
  X,
  MessageCircle,
  Mail,
  Building2,
  Briefcase,
  Shield,
  Sparkles,
  Calendar,
  Layers,
  ArrowRight,
  UserCheck,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { UserProfile, UserRole, RegistrationCategory } from '../types';
import {
  getAllUsers,
  approveUserRegistration,
  rejectUserRegistration,
  getClients,
} from '../services/db';
import { formatDateIndo } from '../utils/formatters';

interface AccountApprovalPageProps {
  onNavigate?: (tab: string) => void;
}

export const AccountApprovalPage: React.FC<AccountApprovalPageProps> = ({ onNavigate }) => {
  const { userProfile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<
    'all' | 'pending' | 'staff' | 'bod' | 'client' | 'active' | 'rejected'
  >('pending');

  // Approval modal state
  const [approvingUser, setApprovingUser] = useState<UserProfile | null>(null);
  const [assignedRole, setAssignedRole] = useState<UserRole>('konsultan');
  const [assignedTitle, setAssignedTitle] = useState('');
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

  // Reject modal state
  const [rejectingUser, setRejectingUser] = useState<UserProfile | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);

  // Notification toast
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to fetch users for approval:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Open approve modal
  const handleOpenApproveModal = (target: UserProfile) => {
    setApprovingUser(target);
    // prefill suitable role
    if (target.registrationCategory === 'bod' || target.role === 'owner') {
      setAssignedRole('owner');
      setAssignedTitle(target.title || 'Managing Partner / Direksi');
    } else if (target.registrationCategory === 'client' || target.role === 'klien') {
      setAssignedRole('klien');
      setAssignedTitle(target.title || `Owner ${target.companyName || 'Bisnis'}`);
    } else if (target.role === 'tim_grup') {
      setAssignedRole('tim_grup');
      setAssignedTitle(target.title || 'Fasilitator Mastermind & Grup');
    } else if (target.role === 'tim_konten') {
      setAssignedRole('tim_konten');
      setAssignedTitle(target.title || 'Spesialis Konten & Media');
    } else {
      setAssignedRole('konsultan');
      setAssignedTitle(target.title || 'Konsultan Pendamping Bisnis');
    }
  };

  // Submit approval
  const handleConfirmApproval = async () => {
    if (!approvingUser) return;
    setIsSubmittingApproval(true);
    try {
      const approver = userProfile?.displayName || 'Ahmad Fadli Taufik (Owner)';
      await approveUserRegistration(approvingUser.id, assignedRole, assignedTitle, approver);
      showToast(
        'success',
        `Akun "${approvingUser.displayName}" berhasil disetujui sebagai ${assignedTitle}. Pengguna kini dapat masuk ke sistem.`
      );
      setApprovingUser(null);
      await fetchUsers();
    } catch (err) {
      console.error('Approval error:', err);
      showToast('error', 'Gagal memproses persetujuan akun.');
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  // Open reject modal
  const handleOpenRejectModal = (target: UserProfile) => {
    setRejectingUser(target);
    setRejectionReason('Mohon maaf, saat ini pendaftaran belum dapat kami setujui karena kuota atau kesesuaian profil.');
  };

  // Submit rejection
  const handleConfirmRejection = async () => {
    if (!rejectingUser) return;
    setIsSubmittingReject(true);
    try {
      const rejector = userProfile?.displayName || 'Ahmad Fadli Taufik (Owner)';
      await rejectUserRegistration(rejectingUser.id, rejectionReason, rejector);
      showToast(
        'success',
        `Permohonan akun "${rejectingUser.displayName}" telah ditolak dengan catatan penolakan.`
      );
      setRejectingUser(null);
      await fetchUsers();
    } catch (err) {
      console.error('Rejection error:', err);
      showToast('error', 'Gagal menolak permohonan.');
    } finally {
      setIsSubmittingReject(false);
    }
  };

  // Filtered list
  const filteredUsers = users.filter((u) => {
    // Search query match
    const q = searchQuery.toLowerCase();
    const matchSearch =
      u.displayName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.companyName && u.companyName.toLowerCase().includes(q)) ||
      (u.title && u.title.toLowerCase().includes(q)) ||
      (u.phone && u.phone.includes(q));

    if (!matchSearch) return false;

    // Filter tabs
    const status = u.status || 'active';
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'pending') return status === 'pending';
    if (selectedFilter === 'active') return status === 'active' || status === 'approved';
    if (selectedFilter === 'rejected') return status === 'rejected';
    if (selectedFilter === 'staff') return u.registrationCategory === 'staff' || ['konsultan', 'consultant', 'tim_grup', 'tim_konten', 'staf_operasional'].includes(u.role);
    if (selectedFilter === 'bod') return u.registrationCategory === 'bod' || u.role === 'owner';
    if (selectedFilter === 'client') return u.registrationCategory === 'client' || u.role === 'klien' || u.role === 'client';

    return true;
  });

  // Counters
  const pendingCount = users.filter((u) => u.status === 'pending').length;
  const activeCount = users.filter((u) => u.status === 'active' || u.status === 'approved' || !u.status).length;
  const rejectedCount = users.filter((u) => u.status === 'rejected').length;
  const staffCount = users.filter((u) => u.registrationCategory === 'staff' || ['konsultan', 'tim_grup', 'tim_konten'].includes(u.role)).length;

  return (
    <div className="space-y-6 font-['Inter'] pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 p-4 rounded-xl shadow-lg border flex items-center gap-3 animate-in fade-in slide-in-from-top-3 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span className="text-xs font-semibold">{toastMessage.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00236f] to-[#0051d5] text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-900/20">
              <UserCheck className="w-6 h-6 text-blue-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-['Plus_Jakarta_Sans'] tracking-tight">
                  Persetujuan Pendaftaran Akun
                </h1>
                {pendingCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                    {pendingCount} Menunggu Approval
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Verifikasi staf pendamping, fasilitator grup, tim konten, jajaran BOD, dan klien yang mendaftar secara mandiri.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center">
            <button
              onClick={fetchUsers}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Segarkan Data
            </button>
            {onNavigate && (
              <button
                onClick={() => onNavigate('team')}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#00236f] hover:bg-[#1e3a8a] text-white text-xs font-semibold rounded-xl transition shadow-xs cursor-pointer"
              >
                <Users className="w-3.5 h-3.5" />
                Daftar Tim &amp; Hak Akses
              </button>
            )}
          </div>
        </div>

        {/* 4 Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100">
          <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl">
            <div className="flex items-center justify-between text-amber-800 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Menunggu Approval</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-extrabold text-amber-900 font-['Plus_Jakarta_Sans']">
              {pendingCount}
            </div>
            <p className="text-[10px] text-amber-700 mt-0.5">Memerlukan verifikasi Owner</p>
          </div>

          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl">
            <div className="flex items-center justify-between text-emerald-800 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Akun Aktif / Terverifikasi</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-900 font-['Plus_Jakarta_Sans']">
              {activeCount}
            </div>
            <p className="text-[10px] text-emerald-700 mt-0.5">Akses penuh sesuai perannya</p>
          </div>

          <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl">
            <div className="flex items-center justify-between text-blue-800 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Staf &amp; Konsultan</span>
              <Briefcase className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-extrabold text-blue-900 font-['Plus_Jakarta_Sans']">
              {staffCount}
            </div>
            <p className="text-[10px] text-blue-700 mt-0.5">Konsultan, Grup &amp; Konten</p>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between text-slate-700 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Ditolak</span>
              <XCircle className="w-4 h-4 text-slate-500" />
            </div>
            <div className="text-2xl font-extrabold text-slate-800 font-['Plus_Jakarta_Sans']">
              {rejectedCount}
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">Pendaftaran tidak disetujui</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedFilter('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              selectedFilter === 'pending'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Menunggu Approval ({pendingCount})
          </button>
          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
              selectedFilter === 'all'
                ? 'bg-[#00236f] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Semua ({users.length})
          </button>
          <button
            onClick={() => setSelectedFilter('staff')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
              selectedFilter === 'staff'
                ? 'bg-[#00236f] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Staf &amp; Tim
          </button>
          <button
            onClick={() => setSelectedFilter('bod')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
              selectedFilter === 'bod'
                ? 'bg-[#00236f] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            BOD / Direksi
          </button>
          <button
            onClick={() => setSelectedFilter('client')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
              selectedFilter === 'client'
                ? 'bg-[#00236f] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Klien
          </button>
          <button
            onClick={() => setSelectedFilter('active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
              selectedFilter === 'active'
                ? 'bg-[#00236f] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Aktif ({activeCount})
          </button>
          <button
            onClick={() => setSelectedFilter('rejected')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
              selectedFilter === 'rejected'
                ? 'bg-[#00236f] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Ditolak ({rejectedCount})
          </button>
        </div>

        {/* Search */}
        <div className="relative sm:w-64 shrink-0">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama, email, usaha..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0051d5] focus:border-transparent transition"
          />
        </div>
      </div>

      {/* Users List */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#00236f]" />
          Memuat daftar pendaftaran pengguna...
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Tidak ada pendaftaran ditemukan</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {selectedFilter === 'pending'
              ? 'Seluruh permohonan pendaftaran staf, BOD, dan klien telah diproses dan disetujui.'
              : 'Tidak ada data pengguna yang cocok dengan kriteria pencarian Anda.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map((user) => {
            const isPending = user.status === 'pending';
            const isRejected = user.status === 'rejected';
            const isActive = !isPending && !isRejected;

            const categoryBadge =
              user.registrationCategory === 'bod' || user.role === 'owner'
                ? { label: 'Dewan Direksi (BOD)', color: 'bg-purple-100 text-purple-800 border-purple-200' }
                : user.registrationCategory === 'client' || user.role === 'klien' || user.role === 'client'
                ? { label: 'Klien / Mitra Program', color: 'bg-teal-100 text-teal-800 border-teal-200' }
                : { label: 'Staf & Tim Nexus', color: 'bg-blue-100 text-blue-800 border-blue-200' };

            const cleanPhone = user.phone?.replace(/[^0-9]/g, '') || '';
            const waLink = cleanPhone ? `https://wa.me/${cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone}` : null;

            return (
              <div
                key={user.id}
                className={`bg-white rounded-2xl border transition p-4 sm:p-5 ${
                  isPending
                    ? 'border-amber-300 shadow-sm hover:border-amber-400 bg-amber-50/20'
                    : isRejected
                    ? 'border-slate-200 opacity-75'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: User Identity */}
                  <div className="flex items-start gap-3.5">
                    <img
                      src={
                        user.avatarUrl ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}&background=00236f&color=fff&bold=true`
                      }
                      alt={user.displayName}
                      className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-200"
                    />

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                          {user.displayName}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase border ${categoryBadge.color}`}>
                          {categoryBadge.label}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            isPending
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : isRejected
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {isPending ? 'Pending Approval' : isRejected ? 'Ditolak' : 'Aktif'}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 flex flex-wrap items-center gap-y-1 gap-x-3">
                        <span className="font-semibold text-slate-800">
                          {user.title || (user.companyName ? `Owner ${user.companyName}` : 'Calon Staf')}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="inline-flex items-center gap-1 text-slate-500">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {user.email}
                        </span>
                        {user.phone && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="inline-flex items-center gap-1 text-slate-500">
                              <MessageCircle className="w-3 h-3 text-slate-400" />
                              {user.phone}
                            </span>
                          </>
                        )}
                        {user.createdAt && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="inline-flex items-center gap-1 text-slate-400">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              Daftar: {formatDateIndo(user.createdAt)}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Detail metadata if Client or Staff with notes */}
                      {(user.companyName || user.notes || user.programInterest || user.rejectionReason) && (
                        <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                          {user.companyName && (
                            <div className="flex items-center gap-1.5 text-slate-700">
                              <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span className="font-semibold">Bisnis:</span> {user.companyName}
                              {user.industry && <span className="text-slate-500">({user.industry})</span>}
                              {user.city && <span className="text-slate-500">• {user.city}</span>}
                              {user.teamSize && <span className="text-slate-500">• {user.teamSize}</span>}
                            </div>
                          )}
                          {user.programInterest && (
                            <div className="text-[11px] text-blue-700">
                              <span className="font-semibold">Minat Program:</span> {user.programInterest}
                            </div>
                          )}
                          {user.notes && (
                            <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-200/60 mt-1 italic">
                              "{user.notes}"
                            </div>
                          )}
                          {user.rejectionReason && (
                            <div className="text-[11px] text-red-700 bg-red-50 p-2 rounded-lg border border-red-200 mt-1">
                              <span className="font-semibold">Alasan Penolakan:</span> {user.rejectionReason}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-wrap items-center gap-2 lg:self-center shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    {waLink && (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 text-xs font-semibold hover:bg-emerald-100 transition cursor-pointer"
                        title="Hubungi pendaftar via WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                        Chat WA
                      </a>
                    )}

                    {isPending ? (
                      <>
                        <button
                          onClick={() => handleOpenApproveModal(user)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Setujui Akun
                        </button>
                        <button
                          onClick={() => handleOpenRejectModal(user)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-red-200 hover:bg-red-50 text-red-700 text-xs font-bold transition cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          Tolak
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleOpenApproveModal(user)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer"
                        >
                          Ubah Peran / Status
                        </button>
                        {isRejected && (
                          <button
                            onClick={() => handleOpenApproveModal(user)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 text-[#00236f] hover:bg-blue-100 text-xs font-bold border border-blue-200 transition cursor-pointer"
                          >
                            Setujui Ulang
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* APPROVAL MODAL */}
      {approvingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                    Persetujuan Pendaftaran Akun
                  </h3>
                  <p className="text-xs text-slate-500">
                    Konfirmasi dan tentukan hak peran untuk {approvingUser.displayName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setApprovingUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nama Pendaftar:</span>
                  <span className="font-bold text-slate-900">{approvingUser.displayName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Email:</span>
                  <span className="font-medium text-slate-800">{approvingUser.email}</span>
                </div>
                {approvingUser.companyName && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Nama Usaha:</span>
                    <span className="font-medium text-blue-700">{approvingUser.companyName}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1.5">
                  Tentukan Hak Peran (Role) di Sistem:
                </label>
                <select
                  value={assignedRole}
                  onChange={(e) => setAssignedRole(e.target.value as UserRole)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0051d5]"
                >
                  <option value="owner">Owner / Dewan Direksi (BOD) - Akses Penuh</option>
                  <option value="konsultan">Konsultan Bisnis / Advisor 1-on-1</option>
                  <option value="tim_grup">Fasilitator Grup &amp; Mastermind Cohort</option>
                  <option value="tim_konten">Tim Konten &amp; Media Pemasaran</option>
                  <option value="staf_operasional">Staf Operasional &amp; Admin</option>
                  <option value="klien">Klien UKM / Mentee</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1.5">
                  Jabatan Resmi (Title):
                </label>
                <input
                  type="text"
                  value={assignedTitle}
                  onChange={(e) => setAssignedTitle(e.target.value)}
                  placeholder="Contoh: Konsultan Bisnis & Strategi"
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0051d5]"
                />
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900">
                <span className="font-bold block mb-0.5">ℹ️ Catatan Sistem:</span>
                Setelah disetujui, akun ini akan langsung aktif. Pengguna dapat login dan mengakses dashboard sesuai peran yang Anda pilih di atas.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setApprovingUser(null)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmApproval}
                disabled={isSubmittingApproval}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {isSubmittingApproval ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Konfirmasi &amp; Setujui
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {rejectingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border border-red-200">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                    Tolak Pendaftaran Akun
                  </h3>
                  <p className="text-xs text-slate-500">
                    Berikan alasan penolakan untuk {rejectingUser.displayName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRejectingUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Alasan Penolakan:
                </label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Tuliskan catatan atau alasan penolakan..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Pendaftar akan melihat catatan ini jika mereka mencoba masuk kembali ke portal.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejectingUser(null)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmRejection}
                disabled={isSubmittingReject}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {isSubmittingReject ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <X className="w-3.5 h-3.5" />
                    Tolak Pendaftaran
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
