import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  Filter,
  Plus,
  Users,
  Building2,
  MapPin,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Phone,
  Briefcase,
  ChevronRight,
  Sparkles,
  Layers,
  Clock,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { Client, ClientStatus, Program, UserProfile, Enrollment } from '../types';
import {
  getClients,
  getPrograms,
  getAllUsers,
  getSessions,
  getTasks,
  getAllEnrollments,
  deleteClient,
} from '../services/db';
import { formatWITA, assessClientRisk } from '../utils/formatters';

interface ClientListProps {
  onSelectClient: (clientId: string) => void;
  onOpenNewClientModal: () => void;
}

export const ClientList: React.FC<ClientListProps> = ({
  onSelectClient,
  onOpenNewClientModal,
}) => {
  const { userProfile } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [programFilter, setProgramFilter] = useState<string>('all');
  const [consultantFilter, setConsultantFilter] = useState<string>('all');
  const [onlyRiskFilter, setOnlyRiskFilter] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  // Delete Client State
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const role = userProfile?.role || 'owner';
  const consultantId = userProfile?.id;
  const isConsultant = role === 'consultant' || role === 'konsultan';
  const isOwner = role === 'owner';

  const handleConfirmDelete = async () => {
    if (!clientToDelete) return;
    setIsDeleting(true);
    try {
      await deleteClient(
        clientToDelete.id,
        userProfile?.displayName || 'Owner',
        isOwner ? 'Owner' : 'Konsultan'
      );
      setClients((prev) => prev.filter((c) => c.id !== clientToDelete.id));
      setClientToDelete(null);
      setDeleteConfirmText('');
    } catch (err) {
      console.error('Error deleting client:', err);
      alert('Gagal menghapus klien. Silakan coba kembali.');
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        const [cList, pList, uList, sList, tList, enrList] = await Promise.all([
          getClients(),
          getPrograms(),
          getAllUsers(),
          getSessions(),
          getTasks(),
          getAllEnrollments(),
        ]);

        // Process clients and risk assessment
        const processedClients = cList.map((client) => {
          const clientSessions = sList.filter(
            (s) => s.clientId === client.id && s.status === 'Selesai'
          );
          const latestSession = clientSessions.sort(
            (a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
          )[0];
          const clientTasks = tList.filter((t) => t.clientId === client.id);
          const riskAssessment = assessClientRisk(
            client,
            latestSession?.dateTime || client.lastSessionDate,
            clientTasks
          );
          return {
            ...client,
            isAtRisk: riskAssessment.isAtRisk,
            riskReason: riskAssessment.reason,
          };
        });

        setClients(processedClients);
        setPrograms(pList);
        setUsers(uList);
        setEnrollments(enrList);
      } catch (err) {
        console.error('Error loading client list:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filter clients based on permissions & criteria
  const filteredClients = clients.filter((client) => {
    // Security restriction: consultant only sees assigned clients (supports multi-consultant!)
    if (isConsultant) {
      const isAssigned =
        client.primaryConsultantId === consultantId ||
        (client.consultantIds && client.consultantIds.includes(consultantId || ''));
      if (!isAssigned) return false;
    }

    // Search query
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      client.namaBisnis.toLowerCase().includes(query) ||
      client.namaPemilik.toLowerCase().includes(query) ||
      client.industri.toLowerCase().includes(query) ||
      client.kota.toLowerCase().includes(query);

    if (!matchesSearch) return false;

    // Filter status
    if (statusFilter !== 'all' && client.status !== statusFilter) {
      return false;
    }

    // Filter program
    if (programFilter !== 'all' && client.programId !== programFilter) {
      return false;
    }

    // Filter consultant
    if (consultantFilter !== 'all') {
      const matchesCons =
        client.primaryConsultantId === consultantFilter ||
        (client.consultantIds && client.consultantIds.includes(consultantFilter));
      if (!matchesCons) return false;
    }

    // Filter only risk
    if (onlyRiskFilter && !client.isAtRisk) {
      return false;
    }

    return true;
  });

  const consultants = users.filter(
    (u) => u.role === 'consultant' || u.role === 'konsultan' || u.role === 'owner'
  );

  const getStatusBadge = (status: ClientStatus) => {
    switch (status) {
      case 'Aktif':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Onboarding':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Prospek':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Selesai':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Berhenti':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in font-['Inter']">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-['Plus_Jakarta_Sans'] tracking-tight">
            {isConsultant ? 'Daftar Klien Binaan Saya' : 'Daftar Klien Konsultasi'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {isConsultant
              ? 'Menampilkan klien yang ditugaskan kepada Anda secara khusus.'
              : 'Seluruh portofolio klien WFA, status pendampingan, dan penugasan konsultan.'}
          </p>
        </div>

        {role === 'owner' && (
          <button
            onClick={onOpenNewClientModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#00236f] hover:bg-[#1e3a8a] text-white text-xs sm:text-sm font-semibold transition shadow-sm cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            Tambah Klien Baru
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-12 gap-2 sm:gap-3">
          {/* Search box */}
          <div className="col-span-2 md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama bisnis, pemilik, kota, atau industri..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0051d5] focus:border-transparent transition"
            />
          </div>

          {/* Status Filter */}
          <div className="md:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0051d5] transition"
            >
              <option value="all">Semua Status</option>
              <option value="Prospek">Prospek</option>
              <option value="Onboarding">Onboarding</option>
              <option value="Aktif">Aktif</option>
              <option value="Selesai">Selesai</option>
              <option value="Berhenti">Berhenti</option>
            </select>
          </div>

          {/* Program Filter */}
          <div className="md:col-span-3">
            <select
              value={programFilter}
              onChange={(e) => setProgramFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0051d5] transition"
            >
              <option value="all">Semua Program Layanan</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Consultant Filter (only for owner) */}
          {role === 'owner' ? (
            <div className="md:col-span-2">
              <select
                value={consultantFilter}
                onChange={(e) => setConsultantFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0051d5] transition"
              >
                <option value="all">Semua Konsultan</option>
                {consultants.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.displayName} {c.role === 'owner' ? '(Owner / Advisor)' : ''}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="md:col-span-2 flex items-center justify-end">
              <span className="text-xs text-slate-500 font-medium">Binaan Anda</span>
            </div>
          )}
        </div>

        {/* Quick Filter: Klien Berisiko Toggle */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
          <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
            <input
              type="checkbox"
              checked={onlyRiskFilter}
              onChange={(e) => setOnlyRiskFilter(e.target.checked)}
              className="rounded text-[#00236f] focus:ring-[#0051d5]"
            />
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              Tampilkan Hanya Klien Berisiko
            </span>
          </label>
          <span className="text-slate-500">
            Ditemukan <strong>{filteredClients.length}</strong> klien
          </span>
        </div>
      </div>

      {/* Clients Grid */}
      {filteredClients.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-500 text-xs sm:text-sm">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          Tidak ada data klien yang cocok dengan filter atau kata kunci pencarian Anda.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClients.map((client) => {
            const program = programs.find((p) => p.id === client.programId);
            const enrollment = enrollments.find((e) => e.clientId === client.id);

            // Resolve assigned consultants (one or more)
            const assignedIds = client.consultantIds || (client.primaryConsultantId ? [client.primaryConsultantId] : []);
            const assignedConsultants = users.filter((u) => assignedIds.includes(u.id));

            return (
              <div
                key={client.id}
                onClick={() => onSelectClient(client.id)}
                className={`bg-white rounded-2xl p-6 border transition shadow-xs hover:shadow-md cursor-pointer flex flex-col justify-between ${
                  client.isAtRisk
                    ? 'border-red-200/90 hover:border-red-300 bg-red-50/10'
                    : 'border-slate-200 hover:border-[#0051d5]/50'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                        {client.industri}
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 font-['Plus_Jakarta_Sans'] mt-0.5 leading-snug">
                        {client.namaBisnis}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Pemilik: <strong className="text-slate-700">{client.namaPemilik}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-bold border uppercase ${getStatusBadge(
                          client.status
                        )}`}
                      >
                        {client.status}
                      </span>

                      {(isOwner || isConsultant) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmText('');
                            setClientToDelete(client);
                          }}
                          className="p-1 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Hapus Klien Ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {client.isAtRisk && (
                    <div className="p-2.5 rounded-xl bg-red-50 border border-red-200/70 text-xs text-red-700 flex items-start gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                      <span>{client.riskReason}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <div className="text-xs text-slate-500">Kota (WITA)</div>
                      <div className="font-semibold text-slate-800 truncate">{client.kota}</div>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <div className="text-xs text-slate-500">Karyawan / Usia</div>
                      <div className="font-semibold text-slate-800 truncate">
                        {[client.jumlahKaryawan, client.lamaUsaha].filter(Boolean).join(' / ') || '-'}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Program:</span>
                      <span className="font-semibold text-[#00236f] text-right truncate max-w-[180px]">
                        {program?.name || 'Belum dipilih'}
                      </span>
                    </div>

                    {enrollment && (
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Progres Sesi:</span>
                        <span className="font-medium text-slate-800">
                          {enrollment.completedSessions} Selesai / <strong>{enrollment.remainingSessions} Sisa</strong>
                        </span>
                      </div>
                    )}

                    <div className="pt-1">
                      <div className="text-xs text-slate-500 mb-1">Konsultan Ditugaskan:</div>
                      <div className="flex flex-wrap gap-1">
                        {assignedConsultants.length > 0 ? (
                          assignedConsultants.map((c) => (
                            <span
                              key={c.id}
                              className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium"
                            >
                              {c.displayName}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500">Belum ditugaskan</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-[#0051d5]">
                  <span>Buka Detail Klien</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Client Confirmation Modal */}
      {clientToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 space-y-4 my-auto">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                  Hapus Data Klien Permanen?
                </h3>
                <p className="text-xs text-slate-500">
                  Anda akan menghapus entitas <strong className="text-slate-900">{clientToDelete.namaBisnis}</strong> (Pemilik: {clientToDelete.namaPemilik}).
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200 text-xs text-rose-800 space-y-1.5">
              <div className="font-bold flex items-center gap-1 text-rose-900">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                Peringatan: Tindakan Tidak Dapat Dibatalkan
              </div>
              <p className="leading-relaxed">
                Seluruh data profil klien, tahapan roadmap, metrik KPI, riwayat diagnosis, tugas, dan penugasan konsultan akan dihapus secara permanen dari sistem.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-600">
                Ketik <span className="font-mono text-rose-600 select-all font-extrabold">HAPUS</span> untuk mengonfirmasi:
              </label>
              <input
                type="text"
                placeholder="Ketik HAPUS"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono uppercase focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setClientToDelete(null);
                  setDeleteConfirmText('');
                }}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting || deleteConfirmText.trim().toUpperCase() !== 'HAPUS'}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Klien</span>
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
