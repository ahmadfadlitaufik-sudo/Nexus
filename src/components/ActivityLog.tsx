import { clearStoreCache } from '../services/store';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Download,
  Calendar,
  Clock,
  User,
  Building2,
  FileText,
  Lock,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Activity,
  Layers,
  ArrowUpDown,
  X,
  Terminal,
  Info,
  UserCheck,
  Plus,
  Key,
} from 'lucide-react';
import { ActivityLog as ActivityLogType, Client } from '../types';
import { getActivityLogs, getClients } from '../services/db';
import { formatWITA, todayWITA } from '../utils/formatters';

interface ActivityLogProps {
  className?: string;
  limit?: number;
  compact?: boolean;
  showExport?: boolean;
}

export const ActivityLog: React.FC<ActivityLogProps> = ({
  className = '',
  limit,
  compact = false,
  showExport = true,
}) => {
  const { userProfile } = useAuth();
  const isOwner = userProfile?.role === 'owner';

  const [logs, setLogs] = useState<ActivityLogType[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'approvals' | 'clients' | 'roles' | 'security'>('all');
  const [selectedLogDetail, setSelectedLogDetail] = useState<ActivityLogType | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = limit || (compact ? 5 : 8);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedLogs, fetchedClients] = await Promise.all([
        getActivityLogs(),
        getClients(),
      ]);
      setLogs(fetchedLogs);
      setClients(fetchedClients);
    } catch (err) {
      console.error('Error fetching activity log:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOwner) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [isOwner]);

  const handleRefresh = async () => {
    clearStoreCache(); // ambil data terbaru, bukan dari cache
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  // Helper to map clientId to business name
  const getClientBusinessName = (clientId?: string) => {
    if (!clientId) return null;
    const found = clients.find((c) => c.id === clientId);
    return found ? `${found.namaBisnis} (${found.namaPemilik})` : clientId;
  };

  // Categorize and tag activity log
  const categorizeLog = (log: ActivityLogType) => {
    const act = (log.action || '').toLowerCase();
    const det = (log.details || '').toLowerCase();

    // 1. Account approvals and registrations
    if (
      act.includes('persetujuan') ||
      act.includes('approval') ||
      act.includes('penolakan') ||
      act.includes('pendaftaran akun') ||
      det.includes('menyetujui pendaftaran') ||
      det.includes('menolak pendaftaran')
    ) {
      return {
        category: 'approvals',
        categoryLabel: 'Persetujuan Akun',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        icon: <UserCheck className="w-3.5 h-3.5 text-emerald-600" />,
        severity: 'info',
      };
    }

    // 2. Client creation and onboarding
    if (
      act.includes('klien baru') ||
      act.includes('tambah klien') ||
      act.includes('pendaftaran program') ||
      det.includes('mendaftarkan klien baru') ||
      det.includes('klien binaan')
    ) {
      return {
        category: 'clients',
        categoryLabel: 'Klien Baru & Onboarding',
        badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
        icon: <Building2 className="w-3.5 h-3.5 text-blue-600" />,
        severity: 'info',
      };
    }

    // 3. Team role changes and access updates
    if (
      act.includes('peran') ||
      act.includes('hak akses') ||
      act.includes('pengaturan pengguna') ||
      act.includes('hapus akses') ||
      det.includes('memperbarui profil & hak akses') ||
      det.includes('menghapus akun')
    ) {
      return {
        category: 'roles',
        categoryLabel: 'Perubahan Peran & Hak Akses',
        badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
        icon: <Key className="w-3.5 h-3.5 text-purple-600" />,
        severity: 'warning',
      };
    }

    // 4. Security checks and blocked requests
    if (
      act.includes('dicegah') ||
      act.includes('blocked') ||
      act.includes('inspeksi') ||
      det.includes('ditolak otomatis') ||
      det.includes('security rules')
    ) {
      return {
        category: 'security',
        categoryLabel: 'Audit Keamanan & Data',
        badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
        icon: <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />,
        severity: 'critical',
      };
    }

    // Default
    return {
      category: 'general',
      categoryLabel: 'Operasi Sistem',
      badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',
      icon: <Activity className="w-3.5 h-3.5 text-slate-500" />,
      severity: 'info',
    };
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['ID Log', 'Waktu (WITA)', 'Kategori', 'Aksi Operasi', 'Aktor Pelaksana', 'Peran Aktor', 'Klien Terkait', 'Rincian'];
    const rows = filteredLogs.map((l) => {
      const meta = categorizeLog(l);
      const clientName = getClientBusinessName(l.clientId) || '-';
      return [
        `"${l.id}"`,
        `"${formatWITA(l.createdAt)}"`,
        `"${meta.categoryLabel}"`,
        `"${(l.action || '').replace(/"/g, '""')}"`,
        `"${(l.actorName || '').replace(/"/g, '""')}"`,
        `"${(l.actorRole || '').replace(/"/g, '""')}"`,
        `"${clientName.replace(/"/g, '""')}"`,
        `"${(l.details || '').replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `activity_log_audit_${todayWITA()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // If not owner, display secure access restriction
  if (!isOwner) {
    return (
      <div className={`bg-white rounded-2xl border border-slate-200 p-8 text-center font-['Inter'] ${className}`}>
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3 border border-amber-200">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
          Akses Log Aktivitas Dibatasi
        </h3>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          Log aktivitas dan jejak audit operasi sensitif hanya dapat diakses oleh Dewan Direksi (BOD / Owner) untuk menjaga integritas dan kerahasiaan data.
        </p>
      </div>
    );
  }

  // Filter logic
  const filteredLogs = logs.filter((l) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      (l.action || '').toLowerCase().includes(q) ||
      (l.actorName || '').toLowerCase().includes(q) ||
      (l.actorRole || '').toLowerCase().includes(q) ||
      (l.details || '').toLowerCase().includes(q) ||
      (l.clientId && l.clientId.toLowerCase().includes(q));

    if (!matchSearch) return false;

    if (categoryFilter !== 'all') {
      const meta = categorizeLog(l);
      if (meta.category !== categoryFilter) return false;
    }

    return true;
  });

  // Pagination calculation
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Counters
  const approvalsCount = logs.filter((l) => categorizeLog(l).category === 'approvals').length;
  const clientsCount = logs.filter((l) => categorizeLog(l).category === 'clients').length;
  const rolesCount = logs.filter((l) => categorizeLog(l).category === 'roles').length;
  const securityCount = logs.filter((l) => categorizeLog(l).category === 'security').length;

  return (
    <div className={`space-y-4 font-['Inter'] ${className}`}>
      {/* Header Container */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#00236f] to-[#1e3a8a] text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-900/20">
              <ShieldCheck className="w-6 h-6 text-blue-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-['Plus_Jakarta_Sans'] tracking-tight">
                  Log Aktivitas &amp; Jejak Audit Operasi Sensitif
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-[#00236f] border border-blue-200 uppercase">
                  BOD Secure View
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Pencatatan real-time atas persetujuan akun, penambahan klien baru, dan perubahan hak akses tim demi akuntabilitas operasional WFA.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center shrink-0">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing || loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer disabled:opacity-50"
              title="Segarkan Rekaman Log"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Segarkan</span>
            </button>

            {showExport && (
              <button
                type="button"
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#00236f] hover:bg-[#1e3a8a] text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
                title="Ekspor Seluruh Log Aktivitas ke CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh CSV</span>
              </button>
            )}
          </div>
        </div>

        {/* 4 Metric Cards */}
        {!compact && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-100">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <div className="flex items-center justify-between text-slate-600 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Total Jejak Audit</span>
                <Activity className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <div className="text-xl font-black text-slate-900 font-['Plus_Jakarta_Sans']">
                {logs.length}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Rekaman operasi tersimpan</p>
            </div>

            <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200/80">
              <div className="flex items-center justify-between text-emerald-800 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Persetujuan Akun</span>
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="text-xl font-black text-emerald-900 font-['Plus_Jakarta_Sans']">
                {approvalsCount}
              </div>
              <p className="text-xs text-emerald-700 mt-0.5">Pendaftaran disetujui / ditolak</p>
            </div>

            <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200/80">
              <div className="flex items-center justify-between text-blue-800 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Klien Baru</span>
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div className="text-xl font-black text-blue-900 font-['Plus_Jakarta_Sans']">
                {clientsCount}
              </div>
              <p className="text-xs text-blue-700 mt-0.5">Kemitraan baru dibuat</p>
            </div>

            <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-200/80">
              <div className="flex items-center justify-between text-purple-800 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Peran &amp; Akses Tim</span>
                <Key className="w-3.5 h-3.5 text-purple-600" />
              </div>
              <div className="text-xl font-black text-purple-900 font-['Plus_Jakarta_Sans']">
                {rolesCount}
              </div>
              <p className="text-xs text-purple-700 mt-0.5">Modifikasi hak akses</p>
            </div>
          </div>
        )}

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => {
                setCategoryFilter('all');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
                categoryFilter === 'all'
                  ? 'bg-[#00236f] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Semua ({logs.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setCategoryFilter('approvals');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                categoryFilter === 'approvals'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <UserCheck className="w-3 h-3" />
              Persetujuan Akun ({approvalsCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setCategoryFilter('clients');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                categoryFilter === 'clients'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Building2 className="w-3 h-3" />
              Klien Baru ({clientsCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setCategoryFilter('roles');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                categoryFilter === 'roles'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Key className="w-3 h-3" />
              Peran Tim ({rolesCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setCategoryFilter('security');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                categoryFilter === 'security'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ShieldAlert className="w-3 h-3" />
              Keamanan ({securityCount})
            </button>
          </div>

          <div className="relative sm:w-64 shrink-0">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari aktor, aksi, detail..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0051d5] focus:border-transparent transition"
            />
          </div>
        </div>
      </div>

      {/* Log Items Stream */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#00236f]" />
          Memuat rekam jejak audit operasi...
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-2">
            <Activity className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-slate-800">Tidak ada log aktivitas ditemukan</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Coba sesuaikan kata kunci pencarian atau ganti filter kategori.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {paginatedLogs.map((log) => {
            const meta = categorizeLog(log);
            const clientName = getClientBusinessName(log.clientId);

            return (
              <div
                key={log.id}
                className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 p-4 transition shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${meta.badgeClass}`}
                  >
                    {meta.icon}
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 font-['Plus_Jakarta_Sans'] truncate">
                        {log.action}
                      </span>
                      <span
                        className={`text-xs font-bold px-1.5 py-0.2 rounded-md uppercase border ${meta.badgeClass}`}
                      >
                        {meta.categoryLabel}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {log.details}
                    </p>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-2 text-xs text-slate-500 pt-0.5">
                      <span className="font-semibold text-slate-800 inline-flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-500" />
                        {log.actorName}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-500">Peran: {log.actorRole}</span>
                      {clientName && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="text-blue-700 font-medium inline-flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-blue-500" />
                            {clientName}
                          </span>
                        </>
                      )}
                      <span className="text-slate-300">•</span>
                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {formatWITA(log.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedLogDetail(log)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    <span>Detail Audit</span>
                  </button>
                </div>
              </div>
            );
          })}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 px-1 text-xs text-slate-500">
              <span>
                Menampilkan {(currentPage - 1) * itemsPerPage + 1} -{' '}
                {Math.min(currentPage * itemsPerPage, filteredLogs.length)} dari {filteredLogs.length}{' '}
                rekaman
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-semibold text-slate-700 px-2">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {selectedLogDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-start justify-center p-4 animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 my-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#00236f] flex items-center justify-center border border-blue-200">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                    Rincian Forensik Jejak Audit
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    ID: {selectedLogDetail.id}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLogDetail(null)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 pt-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Operasi:</span>
                  <span className="font-bold text-slate-900">{selectedLogDetail.action}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Aktor Pelaksana:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedLogDetail.actorName} ({selectedLogDetail.actorRole})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Waktu Tercatat:</span>
                  <span className="font-medium text-slate-800">
                    {formatWITA(selectedLogDetail.createdAt)}
                  </span>
                </div>
                {selectedLogDetail.clientId && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Klien Terdampak:</span>
                    <span className="font-medium text-blue-700">
                      {getClientBusinessName(selectedLogDetail.clientId)}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">
                  Deskripsi &amp; Detail Operasi:
                </label>
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-slate-700 leading-relaxed font-mono text-xs">
                  {selectedLogDetail.details}
                </div>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Validasi Akuntabilitas:</strong> Rekaman ini tersimpan secara permanen di database Cloudflare D1 dan tidak dapat diedit atau dihapus oleh staf untuk memastikan integritas audit kepatuhan.
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-4 mt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedLogDetail(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
