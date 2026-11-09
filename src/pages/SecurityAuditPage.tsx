import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
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
} from 'lucide-react';
import { ActivityLog, Client } from '../types';
import { getActivityLogs, getClients } from '../services/db';
import { formatWITA, todayWITA } from '../utils/formatters';

export const SecurityAuditPage: React.FC = () => {
  const { userProfile } = useAuth();
  const isOwner = userProfile?.role === 'owner';

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedLogDetail, setSelectedLogDetail] = useState<ActivityLog | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);

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
      console.error('Error fetching activity log collection:', err);
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
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  // Helper to map clientId to business name
  const getClientBusinessName = (clientId?: string) => {
    if (!clientId) return '-';
    const found = clients.find((c) => c.id === clientId);
    return found ? `${found.namaBisnis} (${found.namaPemilik})` : clientId;
  };

  // Detect event category & severity
  const getLogMeta = (log: ActivityLog) => {
    const act = (log.action || '').toLowerCase();
    const det = (log.details || '').toLowerCase();

    if (act.includes('dicegah') || act.includes('blocked') || det.includes('ditolak') || det.includes('denied')) {
      return {
        badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
        badgeLabel: 'DICEGAH (BLOCKED)',
        icon: <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />,
        type: 'security_blocked',
      };
    }

    if (act.includes('login') || act.includes('autentikasi') || act.includes('kredensial')) {
      return {
        badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
        badgeLabel: 'AUTENTIKASI',
        icon: <Lock className="w-3.5 h-3.5 text-purple-600" />,
        type: 'auth',
      };
    }

    if (act.includes('catatan internal') || act.includes('inspeksi') || det.includes('session_internals')) {
      return {
        badgeClass: 'bg-amber-50 text-amber-900 border-amber-200',
        badgeLabel: 'INTERNAL TIM',
        icon: <Eye className="w-3.5 h-3.5 text-amber-600" />,
        type: 'internal_access',
      };
    }

    if (act.includes('studi kasus') || act.includes('izin') || act.includes('privasi')) {
      return {
        badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
        badgeLabel: 'KONTROL PRIVASI',
        icon: <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />,
        type: 'privacy',
      };
    }

    return {
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      badgeLabel: 'TEROTORISASI',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
      type: 'operational',
    };
  };

  const getRoleBadge = (role: string) => {
    const r = role.toLowerCase();
    if (r === 'owner') return 'bg-purple-100 text-purple-900 border-purple-200';
    if (r === 'konsultan') return 'bg-blue-100 text-blue-900 border-blue-200';
    if (r === 'klien') return 'bg-emerald-100 text-emerald-900 border-emerald-200';
    if (r === 'tim konten' || r === 'tim_konten') return 'bg-pink-100 text-pink-900 border-pink-200';
    if (r === 'tim grup' || r === 'tim_grup') return 'bg-indigo-100 text-indigo-900 border-indigo-200';
    return 'bg-slate-100 text-slate-800 border-slate-200';
  };

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    const query = searchQuery.toLowerCase();
    const matchQuery =
      (log.action || '').toLowerCase().includes(query) ||
      (log.actorName || '').toLowerCase().includes(query) ||
      (log.actorRole || '').toLowerCase().includes(query) ||
      (log.details || '').toLowerCase().includes(query) ||
      (log.clientId && getClientBusinessName(log.clientId).toLowerCase().includes(query));

    const matchRole =
      roleFilter === 'all' ||
      (log.actorRole || '').toLowerCase().replace('_', ' ') === roleFilter.toLowerCase().replace('_', ' ');

    const meta = getLogMeta(log);
    const matchCategory =
      categoryFilter === 'all' ||
      meta.type === categoryFilter ||
      (categoryFilter === 'security_blocked' && ((log.action || '').includes('Dicegah') || (log.details || '').includes('ditolak')));

    return matchQuery && matchRole && matchCategory;
  });

  // Calculate Pagination
  const totalItems = filteredLogs.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['ID Log', 'Waktu (WITA)', 'Aksi', 'Aktor', 'Peran', 'Klien Terkait', 'Rincian'];
    const rows = filteredLogs.map((l) => [
      `"${l.id}"`,
      `"${formatWITA(l.createdAt, true)}"`,
      `"${(l.action || '').replace(/"/g, '""')}"`,
      `"${(l.actorName || '').replace(/"/g, '""')}"`,
      `"${l.actorRole}"`,
      `"${getClientBusinessName(l.clientId).replace(/"/g, '""')}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `audit_log_nexus_${todayWITA()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 1. Access Denied State if non-owner
  if (!isOwner) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 shadow-sm border border-rose-200">
          <ShieldX className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
          Akses Terbatas: Khusus Peran Owner
        </h2>
        <p className="text-sm text-slate-500 max-w-md mt-1.5 leading-relaxed">
          Halaman Log Audit &amp; Keamanan ini memuat rekam jejak akses sensitif sistem dan hanya dapat dibuka oleh akun Owner eksekutif (Ahmad Fadli Taufik).
        </p>
        <div className="mt-4 px-3.5 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-mono">
          Peran Akun Saat Ini: {userProfile?.role || 'Pengguna Publik'}
        </div>
      </div>
    );
  }

  // Summary Metrics
  const blockedEventsCount = logs.filter(
    (l) => (l.action || '').includes('Dicegah') || (l.details || '').includes('ditolak') || (l.details || '').includes('BLOCKED')
  ).length;
  const internalAccessCount = logs.filter(
    (l) => (l.action || '').includes('Internal') || (l.details || '').includes('session_internals')
  ).length;
  const uniqueActorsCount = new Set(logs.map((l) => l.actorName)).size;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Executive Header Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-['Plus_Jakarta_Sans'] tracking-tight">
            Log Audit &amp; Keamanan
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Rekam jejak aktivitas penting: login, pendaftaran, perubahan akses, dan akses catatan internal sesi.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold transition border border-slate-200 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Segarkan Data</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 bg-[#00236f] text-white hover:bg-[#1e3a8a] px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor Laporan (CSV)</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Entri Audit</span>
            <Activity className="w-4 h-4 text-[#00236f]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-['Plus_Jakarta_Sans'] text-slate-900">
              {logs.length}
            </span>
            <span className="text-xs text-slate-500 font-medium">peristiwa tercatat</span>
          </div>
          <p className="text-xs text-slate-500">Tersimpan aman di database</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Akses Ilegal Dicegah</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-['Plus_Jakarta_Sans'] text-rose-600">
              {blockedEventsCount}
            </span>
            <span className="text-xs text-rose-700 font-medium">upaya terblokir</span>
          </div>
          <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Aturan akses aktif
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Inspeksi Data Internal</span>
            <Eye className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-['Plus_Jakarta_Sans'] text-slate-900">
              {internalAccessCount}
            </span>
            <span className="text-xs text-slate-500 font-medium">akses notula tim</span>
          </div>
          <p className="text-xs text-slate-500">catatan internal dilindungi</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Aktor Aktif</span>
            <User className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-['Plus_Jakarta_Sans'] text-slate-900">
              {uniqueActorsCount}
            </span>
            <span className="text-xs text-slate-500 font-medium">pengguna unik</span>
          </div>
          <p className="text-xs text-slate-500">sesuai hak akses peran</p>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari tindakan, nama aktor, kata kunci rincian, atau nama bisnis klien..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00236f]/20 focus:border-[#00236f]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#00236f]/20 cursor-pointer"
            >
              <option value="all">Semua Peran Aktor</option>
              <option value="owner">Owner</option>
              <option value="konsultan">Konsultan</option>
              <option value="klien">Klien</option>
              <option value="tim konten">Tim Konten</option>
              <option value="tim grup">Tim Grup</option>
              <option value="sistem">Sistem Otomatis</option>
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#00236f]/20 cursor-pointer"
            >
              <option value="all">Semua Kategori Peristiwa</option>
              <option value="security_blocked">Akses Dicegah (Blocked)</option>
              <option value="auth">Autentikasi &amp; Login</option>
              <option value="internal_access">Catatan Internal Sesi</option>
              <option value="privacy">Kontrol Privasi &amp; Kasus</option>
              <option value="operational">Operasional &amp; Tugas</option>
            </select>

            {/* Items Per Page */}
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none cursor-pointer"
              title="Baris per halaman"
            >
              <option value={5}>5 baris</option>
              <option value={8}>8 baris</option>
              <option value={15}>15 baris</option>
              <option value={25}>25 baris</option>
            </select>
          </div>
        </div>
      </div>

      {/* Paginated Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50/80 text-slate-600 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
                <th className="py-3 px-4">Waktu (WITA)</th>
                <th className="py-3 px-4">Aktor / Pengguna</th>
                <th className="py-3 px-4">Peran</th>
                <th className="py-3 px-4">Tindakan</th>
                <th className="py-3 px-4">Entitas Terkait</th>
                <th className="py-3 px-4">Status &amp; Kepatuhan</th>
                <th className="py-3 px-4 max-w-xs truncate">Rincian Peristiwa</th>
                <th className="py-3 px-4 text-right">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <div className="inline-flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-[#00236f]" />
                      <span>Memuat log aktivitas dari database...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    Tidak ada catatan aktivitas yang cocok dengan kriteria filter.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => {
                  const meta = getLogMeta(log);
                  const isBlocked = meta.type === 'security_blocked';

                  return (
                    <tr
                      key={log.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isBlocked ? 'bg-rose-50/30' : ''
                      }`}
                    >
                      {/* Timestamp WITA */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">
                            {formatWITA(log.createdAt, false)}
                          </span>
                          <span className="text-xs text-slate-500 font-mono">
                            {new Date(log.createdAt).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                              timeZone: 'Asia/Makassar',
                            })}{' '}
                            WITA
                          </span>
                        </div>
                      </td>

                      {/* Actor */}
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#00236f] text-white flex items-center justify-center text-xs font-bold">
                            {log.actorName.charAt(0)}
                          </div>
                          <span className="truncate max-w-[130px]" title={log.actorName}>
                            {log.actorName}
                          </span>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wider ${getRoleBadge(
                            log.actorRole
                          )}`}
                        >
                          {log.actorRole}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                          {meta.icon}
                          <span className="truncate max-w-[190px]" title={log.action}>
                            {log.action}
                          </span>
                        </div>
                      </td>

                      {/* Client */}
                      <td className="py-3.5 px-4 text-slate-600">
                        {log.clientId ? (
                          <div className="flex items-center gap-1 max-w-[160px] truncate" title={getClientBusinessName(log.clientId)}>
                            <Building2 className="w-3 h-3 text-slate-500 shrink-0" />
                            <span className="truncate">{getClientBusinessName(log.clientId)}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 font-mono text-xs">-</span>
                        )}
                      </td>

                      {/* Status / Compliance Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${meta.badgeClass}`}
                        >
                          {meta.badgeLabel}
                        </span>
                      </td>

                      {/* Details preview */}
                      <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate" title={log.details}>
                        {log.details}
                      </td>

                      {/* Action View Detail */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedLogDetail(log)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:text-[#00236f] hover:bg-slate-100 transition text-xs font-semibold cursor-pointer"
                        >
                          Buka Detail
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Toolbar */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Menampilkan <span className="font-bold text-slate-900">{totalItems === 0 ? 0 : startIndex + 1}</span> -{' '}
            <span className="font-bold text-slate-900">
              {Math.min(startIndex + itemsPerPage, totalItems)}
            </span>{' '}
            dari <span className="font-bold text-slate-900">{totalItems}</span> entri audit
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title="Halaman Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
              if (
                totalPages > 6 &&
                page !== 1 &&
                page !== totalPages &&
                Math.abs(page - currentPage) > 1
              ) {
                if (page === 2 || page === totalPages - 1) {
                  return (
                    <span key={page} className="px-1 text-slate-500">
                      ...
                    </span>
                  );
                }
                return null;
              }

              return (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition cursor-pointer ${
                    currentPage === page
                      ? 'bg-[#00236f] text-white shadow-xs'
                      : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {page}
                </button>
              );
            })}

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title="Halaman Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* DETAIL MODAL FOR SELECTED LOG */}
      {selectedLogDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#00236f] flex items-center justify-center font-bold">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Rincian Dokumen Log Aktivitas</h3>
                  <p className="text-xs text-slate-500 font-mono">ID: {selectedLogDetail.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLogDetail(null)}
                className="p-1.5 text-slate-500 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">
                  Tindakan:
                </span>
                <p className="text-sm font-bold text-slate-900">{selectedLogDetail.action}</p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">
                    Nama Aktor:
                  </span>
                  <p className="font-bold text-slate-900 mt-0.5">{selectedLogDetail.actorName}</p>
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-bold uppercase ${getRoleBadge(
                      selectedLogDetail.actorRole
                    )}`}
                  >
                    Peran: {selectedLogDetail.actorRole}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">
                    Waktu Peristiwa:
                  </span>
                  <p className="font-bold text-slate-900 mt-0.5">
                    {formatWITA(selectedLogDetail.createdAt, true)}
                  </p>
                  <span className="text-xs text-slate-500 mt-1 block">Zona WITA (UTC+8)</span>
                </div>
              </div>

              {selectedLogDetail.clientId && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">
                    Entitas Klien Terkait:
                  </span>
                  <p className="font-bold text-slate-900 mt-0.5">
                    {getClientBusinessName(selectedLogDetail.clientId)}
                  </p>
                </div>
              )}

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">
                  Rincian Teknis &amp; Deskripsi Lengkap:
                </span>
                <p className="text-slate-700 leading-relaxed whitespace-pre-line font-medium">
                  {selectedLogDetail.details}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLogDetail(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
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
