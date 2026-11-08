import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  MapPin,
  Phone,
  Plus,
  TrendingUp,
  Users,
  Video,
  Lock,
  Eye,
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  Edit3,
  Target,
  Sparkles,
  ShieldCheck,
  Check,
  Layers,
  UserCheck,
  Trash2,
  Save,
  BarChart3,
  Award,
  RefreshCw,
} from 'lucide-react';
import {
  Client,
  Session,
  SessionInternal,
  Task,
  RoadmapItem,
  Kpi,
  Diagnosis,
  DocumentItem,
  Program,
  UserProfile,
  Enrollment,
  ClientConsultant,
  ClientStatus,
} from '../types';
import {
  getClientById,
  getPrograms,
  getAllUsers,
  getSessions,
  getSessionInternal,
  getTasks,
  getRoadmapByClient,
  getKpisByClient,
  getDiagnosisByClient,
  getDocumentsByClient,
  getEnrollmentByClient,
  getClientConsultants,
  saveEnrollment,
  updateClient,
  deleteClient,
  updateTaskStatus,
  saveDiagnosis,
  saveKpi,
  deleteKpi,
  saveRoadmapItem,
  deleteRoadmapItem,
  saveTask,
} from '../services/db';
import { formatWITA, formatRupiah, isTaskOverdue, evaluateClientRisk } from '../utils/formatters';
import { DiagnosisChart } from '../components/DiagnosisChart';
import { SessionAuditSummary } from '../components/SessionAuditSummary';

interface ClientDetailProps {
  clientId: string;
  onBack: () => void;
  onOpenSessionModal: (sessionId?: string, clientId?: string) => void;
}

export const ClientDetail: React.FC<ClientDetailProps> = ({
  clientId,
  onBack,
  onOpenSessionModal,
}) => {
  const { userProfile } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [program, setProgram] = useState<Program | null>(null);
  const [assignedConsultants, setAssignedConsultants] = useState<UserProfile[]>([]);
  const [clientConsultants, setClientConsultants] = useState<ClientConsultant[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [activeTab, setActiveTab] = useState<'ringkasan' | 'diagnosis' | 'roadmap' | 'kpi' | 'sesi' | 'tugas'>('ringkasan');

  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [roadmap, setRoadmap] = useState<RoadmapItem[]>([]);
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionInternals, setSessionInternals] = useState<Record<string, SessionInternal>>({});
  const [tasks, setTasks] = useState<Task[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditSessionModal, setAuditSessionModal] = useState<Session | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Status & Enrollment Editor Modals
  const [editingStatus, setEditingStatus] = useState(false);
  const [statusDraft, setStatusDraft] = useState<ClientStatus>('Aktif');

  const [editingEnrollment, setEditingEnrollment] = useState(false);
  const [enrollmentDraft, setEnrollmentDraft] = useState<Partial<Enrollment>>({});

  // Diagnosis 5-Area Editor State
  const [editingDiagnosis, setEditingDiagnosis] = useState(false);
  const [diagnosisForm, setDiagnosisForm] = useState<Partial<Diagnosis>>({});

  // Roadmap Item Modal State
  const [editingRoadmapModal, setEditingRoadmapModal] = useState(false);
  const [roadmapForm, setRoadmapForm] = useState<Partial<RoadmapItem>>({});

  // KPI Modal State
  const [editingKpiModal, setEditingKpiModal] = useState(false);
  const [kpiForm, setKpiForm] = useState<Partial<Kpi>>({});
  const [quickUpdateKpi, setQuickUpdateKpi] = useState<Kpi | null>(null);
  const [newKpiValue, setNewKpiValue] = useState<number>(0);

  // Task Modal State
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskDeadline, setTaskDeadline] = useState('');
  const [taskRole, setTaskRole] = useState<'Konsultan' | 'Klien' | 'Tim'>('Klien');

  const role = userProfile?.role || 'owner';
  const isOwner = role === 'owner';
  const isConsultant = role === 'consultant' || role === 'konsultan';
  const isConsultantOrOwner = isOwner || isConsultant;

  const loadAllClientData = async () => {
    try {
      const [c, pList, uList, d, r, k, s, t, docs, enr, ccs] = await Promise.all([
        getClientById(clientId),
        getPrograms(),
        getAllUsers(),
        getDiagnosisByClient(clientId),
        getRoadmapByClient(clientId),
        getKpisByClient(clientId),
        getSessions(clientId),
        getTasks(clientId),
        getDocumentsByClient(clientId),
        getEnrollmentByClient(clientId),
        getClientConsultants(clientId),
      ]);

      if (c) {
        setClient(c);
        setStatusDraft(c.status);
        const prog = pList.find((p) => p.id === c.programId);
        setProgram(prog || null);

        // Resolve all assigned consultants (multi-consultants)
        const consultantIds = c.consultantIds || (c.primaryConsultantId ? [c.primaryConsultantId] : []);
        const consList = uList.filter((u) => consultantIds.includes(u.id));
        setAssignedConsultants(consList);
      }

      setDiagnosis(d);
      setRoadmap(r);
      setKpis(k);
      setSessions(s);
      setTasks(t);
      setDocuments(docs);
      setEnrollment(enr);
      setClientConsultants(ccs);

      // If user is Owner or Consultant, load internal notes for the sessions
      if (isConsultantOrOwner && s.length > 0) {
        const internals: Record<string, SessionInternal> = {};
        for (const sess of s) {
          const intDoc = await getSessionInternal(sess.id);
          if (intDoc) internals[sess.id] = intDoc;
        }
        setSessionInternals(internals);
      }
    } catch (err) {
      console.error('Error loading client detail data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllClientData();
  }, [clientId, isConsultantOrOwner]);

  if (!client) {
    return (
      <div className="p-8 text-center text-slate-500 font-['Inter']">
        <p>Memuat profil klien...</p>
        <button onClick={onBack} className="mt-4 text-xs font-semibold text-[#0051d5] underline">
          Kembali ke Daftar Klien
        </button>
      </div>
    );
  }

  const riskAssessment = evaluateClientRisk(client.lastSessionDate, tasks);

  // Status & Enrollment Handlers
  const handleUpdateClientStatus = async (newStatus: ClientStatus) => {
    try {
      await updateClient(client.id, { status: newStatus });
      setClient({ ...client, status: newStatus });
      setStatusDraft(newStatus);
      setEditingStatus(false);
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleSaveEnrollmentDraft = async () => {
    if (!enrollment) return;
    try {
      const updated: Enrollment = {
        ...enrollment,
        ...enrollmentDraft,
        remainingSessions: Math.max(
          0,
          (enrollmentDraft.totalSessions ?? enrollment.totalSessions) -
            (enrollmentDraft.completedSessions ?? enrollment.completedSessions)
        ),
        updatedAt: new Date().toISOString(),
      };
      await saveEnrollment(updated);
      setEnrollment(updated);
      setEditingEnrollment(false);
    } catch (err) {
      console.error('Error updating enrollment:', err);
    }
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: any) => {
    try {
      await updateTaskStatus(
        taskId,
        client.id,
        { status: newStatus },
        userProfile?.displayName || 'Pengguna',
        role === 'owner' ? 'Owner' : isConsultant ? 'Konsultan' : 'Klien'
      );
      setTasks(tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    } catch (err) {
      console.error('Error updating task status:', err);
    }
  };

  const handleDeleteClient = async () => {
    if (!client) return;
    setIsDeleting(true);
    try {
      await deleteClient(
        client.id,
        userProfile?.displayName || 'Owner',
        role === 'owner' ? 'Owner' : 'Konsultan'
      );
      setShowDeleteModal(false);
      onBack();
    } catch (err) {
      console.error('Error deleting client:', err);
      alert('Gagal menghapus klien. Silakan coba kembali.');
    } finally {
      setIsDeleting(false);
    }
  };

  // DIAGNOSIS 5-AREA HANDLERS
  const handleOpenEditDiagnosis = () => {
    const initial: Diagnosis = diagnosis || {
      id: `diag-${client.id}`,
      clientId: client.id,
      keuangan: { score: 3, notes: '' },
      pemasaran: { score: 3, notes: '' },
      operasional: { score: 3, notes: '' },
      sdm: { score: 3, notes: '' },
      produk: { score: 3, notes: '' },
      overallNotes: '',
      updatedAt: new Date().toISOString(),
    };
    setDiagnosisForm(initial);
    setEditingDiagnosis(true);
  };

  const handleSaveDiagnosis = async () => {
    try {
      const diagId = diagnosis?.id || `diag-${client.id}`;
      const updated: Diagnosis = {
        id: diagId,
        clientId: client.id,
        keuangan: diagnosisForm.keuangan || { score: 3, notes: '' },
        pemasaran: diagnosisForm.pemasaran || { score: 3, notes: '' },
        operasional: diagnosisForm.operasional || { score: 3, notes: '' },
        sdm: diagnosisForm.sdm || { score: 3, notes: '' },
        produk: diagnosisForm.produk || { score: 3, notes: '' },
        overallNotes: diagnosisForm.overallNotes || '',
        updatedAt: new Date().toISOString(),
      };
      await saveDiagnosis(updated);
      setDiagnosis(updated);
      setEditingDiagnosis(false);
    } catch (err) {
      console.error('Error updating diagnosis:', err);
    }
  };

  // ROADMAP HANDLERS (Client-Specific)
  const handleOpenAddRoadmap = () => {
    setRoadmapForm({
      clientId: client.id,
      tahapan: `Fase ${roadmap.length + 1}: Tahapan Baru`,
      sasaran: '',
      tenggat: `Minggu ${(roadmap.length + 1) * 2 - 1}-${(roadmap.length + 1) * 2}`,
      status: 'Belum',
      urutan: roadmap.length + 1,
      deskripsi: '',
      driveUrl: '',
      googleDriveUrl: '',
    });
    setEditingRoadmapModal(true);
  };

  const handleOpenEditRoadmap = (item: RoadmapItem) => {
    setRoadmapForm({
      ...item,
      tahapan: item.tahapan || item.phase || '',
      sasaran: item.sasaran || item.title || '',
      tenggat: item.tenggat || item.targetWeek || '',
      urutan: item.urutan ?? item.order ?? 1,
      deskripsi: item.deskripsi || item.description || '',
      driveUrl: item.driveUrl || item.googleDriveUrl || '',
      googleDriveUrl: item.driveUrl || item.googleDriveUrl || '',
    });
    setEditingRoadmapModal(true);
  };

  const handleSaveRoadmapItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roadmapForm.tahapan || !roadmapForm.sasaran) return;
    try {
      const itemId = roadmapForm.id || `road-${client.id}-${Date.now()}`;
      const driveLink = (roadmapForm.driveUrl || roadmapForm.googleDriveUrl || '').trim();
      const itemToSave: RoadmapItem = {
        id: itemId,
        clientId: client.id,
        tahapan: roadmapForm.tahapan.trim(),
        sasaran: roadmapForm.sasaran.trim(),
        tenggat: (roadmapForm.tenggat || 'Minggu 1-2').trim(),
        status: roadmapForm.status || 'Belum',
        urutan: Number(roadmapForm.urutan) || roadmap.length + 1,
        deskripsi: (roadmapForm.deskripsi || '').trim(),
        driveUrl: driveLink,
        googleDriveUrl: driveLink,
        // backwards compat
        phase: roadmapForm.tahapan.trim(),
        title: roadmapForm.sasaran.trim(),
        targetWeek: (roadmapForm.tenggat || 'Minggu 1-2').trim(),
        order: Number(roadmapForm.urutan) || roadmap.length + 1,
        description: (roadmapForm.deskripsi || '').trim(),
        createdAt: roadmapForm.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveRoadmapItem(itemToSave);

      if (roadmapForm.id) {
        setRoadmap(roadmap.map((r) => (r.id === itemId ? itemToSave : r)).sort((a, b) => (a.urutan || a.order || 0) - (b.urutan || b.order || 0)));
      } else {
        setRoadmap([...roadmap, itemToSave].sort((a, b) => (a.urutan || a.order || 0) - (b.urutan || b.order || 0)));
      }
      setEditingRoadmapModal(false);
    } catch (err) {
      console.error('Error saving roadmap item:', err);
    }
  };

  const handleDeleteRoadmapItem = async (itemId: string) => {
    if (!window.confirm('Yakin ingin menghapus tahapan roadmap ini?')) return;
    try {
      await deleteRoadmapItem(itemId);
      setRoadmap(roadmap.filter((r) => r.id !== itemId));
    } catch (err) {
      console.error('Error deleting roadmap item:', err);
    }
  };

  // KPI HANDLERS
  const handleOpenAddKpi = () => {
    setKpiForm({
      clientId: client.id,
      nama: '',
      nilaiAwal: 0,
      target: 100,
      nilaiSaatIni: 0,
      satuan: '%',
      kategori: 'Finansial',
      tanggalPembaruan: new Date().toISOString().split('T')[0],
    });
    setEditingKpiModal(true);
  };

  const handleOpenEditKpi = (k: Kpi) => {
    setKpiForm({
      ...k,
      nama: k.nama || k.title || '',
      nilaiAwal: k.nilaiAwal ?? k.baselineValue ?? 0,
      target: k.target ?? k.targetValue ?? 100,
      nilaiSaatIni: k.nilaiSaatIni ?? k.currentValue ?? 0,
      satuan: k.satuan || k.unit || '%',
      tanggalPembaruan: k.tanggalPembaruan || (k.updatedAt ? k.updatedAt.split('T')[0] : new Date().toISOString().split('T')[0]),
    });
    setEditingKpiModal(true);
  };

  const handleSaveKpi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kpiForm.nama) return;
    try {
      const kpiId = kpiForm.id || `kpi-${client.id}-${Date.now()}`;
      const itemToSave: Kpi = {
        id: kpiId,
        clientId: client.id,
        nama: kpiForm.nama.trim(),
        nilaiAwal: Number(kpiForm.nilaiAwal) || 0,
        target: Number(kpiForm.target) || 0,
        nilaiSaatIni: Number(kpiForm.nilaiSaatIni) || 0,
        satuan: (kpiForm.satuan || '%').trim(),
        tanggalPembaruan: kpiForm.tanggalPembaruan || new Date().toISOString().split('T')[0],
        kategori: kpiForm.kategori || 'Finansial',
        // backwards compat
        title: kpiForm.nama.trim(),
        baselineValue: Number(kpiForm.nilaiAwal) || 0,
        targetValue: Number(kpiForm.target) || 0,
        currentValue: Number(kpiForm.nilaiSaatIni) || 0,
        unit: (kpiForm.satuan || '%').trim(),
        updatedAt: new Date().toISOString(),
      };

      await saveKpi(itemToSave);

      if (kpiForm.id) {
        setKpis(kpis.map((k) => (k.id === kpiId ? itemToSave : k)));
      } else {
        setKpis([...kpis, itemToSave]);
      }
      setEditingKpiModal(false);
    } catch (err) {
      console.error('Error saving KPI:', err);
    }
  };

  const handleQuickUpdateKpiSubmit = async () => {
    if (!quickUpdateKpi) return;
    try {
      const updated: Kpi = {
        ...quickUpdateKpi,
        nilaiSaatIni: Number(newKpiValue),
        currentValue: Number(newKpiValue),
        tanggalPembaruan: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString(),
      };
      await saveKpi(updated);
      setKpis(kpis.map((k) => (k.id === updated.id ? updated : k)));
      setQuickUpdateKpi(null);
    } catch (err) {
      console.error('Error quick updating KPI:', err);
    }
  };

  const handleDeleteKpi = async (kpiId: string) => {
    if (!window.confirm('Yakin ingin menghapus metrik KPI ini?')) return;
    try {
      await deleteKpi(kpiId);
      setKpis(kpis.filter((k) => k.id !== kpiId));
    } catch (err) {
      console.error('Error deleting KPI:', err);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    try {
      const newTask: Task = {
        id: `task-${Date.now()}`,
        clientId: client.id,
        title: taskTitle.trim(),
        assigneeName: taskAssignee.trim() || client.namaPemilik,
        assigneeRole: taskRole,
        deadline: taskDeadline || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        status: 'Belum',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveTask(newTask);
      setTasks([...tasks, newTask]);
      setShowNewTaskModal(false);
      setTaskTitle('');
      setTaskAssignee('');
    } catch (err) {
      console.error('Error adding task:', err);
    }
  };

  // Status badge styling
  const getStatusBadge = (st: ClientStatus) => {
    switch (st) {
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
      {/* Back button & Breadcrumb */}
      <div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Daftar Klien
        </button>
      </div>

      {/* Profile Header Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0051d5]">
                {client.industri}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {client.kota} (WITA)
              </span>

              {/* Status Badge with Quick Edit for Consultant & Owner */}
              {isConsultantOrOwner ? (
                <div className="inline-flex items-center gap-1.5">
                  <select
                    value={client.status}
                    onChange={(e) => handleUpdateClientStatus(e.target.value as any)}
                    className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase border cursor-pointer ${getStatusBadge(
                      client.status
                    )}`}
                  >
                    <option value="Prospek">Prospek</option>
                    <option value="Onboarding">Onboarding</option>
                    <option value="Aktif">Aktif</option>
                    <option value="Selesai">Selesai</option>
                    <option value="Berhenti">Berhenti</option>
                  </select>
                </div>
              ) : (
                <span
                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase border ${getStatusBadge(
                    client.status
                  )}`}
                >
                  {client.status}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-['Plus_Jakarta_Sans'] tracking-tight">
              {client.namaBisnis}
            </h1>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-600">
              <div>
                Pemilik Usaha: <strong className="text-slate-900">{client.namaPemilik}</strong>
              </div>
              <div>
                Skala: <strong>{client.jumlahKaryawan} Karyawan</strong> ({client.lamaUsaha})
              </div>
              <div>
                Kontak: <strong className="text-slate-900">{client.kontak}</strong>
              </div>
            </div>
          </div>

          {/* Quick Action & Program info */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-left">
              <div className="text-[10px] font-semibold text-slate-400 uppercase">Program Pendampingan</div>
              <div className="text-xs font-bold text-[#00236f]">{program?.name || 'Fundamental'}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Konsultan:{' '}
                {assignedConsultants.length > 0
                  ? assignedConsultants.map((c) => c.displayName).join(', ')
                  : 'Belum ditugaskan'}
              </div>
            </div>

            {isConsultantOrOwner && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenSessionModal(undefined, client.id)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#00236f] hover:bg-[#1e3a8a] text-white text-xs font-semibold transition shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Catat Sesi WFA</span>
                </button>

                <button
                  onClick={() => {
                    setDeleteConfirmText('');
                    setShowDeleteModal(true);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-3 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 hover:border-rose-300 transition text-xs font-semibold cursor-pointer"
                  title="Hapus Klien Ini Secara Permanen"
                >
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span className="hidden sm:inline">Hapus Klien</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Risk Banner if At-Risk */}
        {riskAssessment.isAtRisk && (
          <div className="mt-6 p-4 rounded-xl bg-red-50/80 border border-red-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-red-900">Perhatian: Klien Ini Terindikasi Berisiko</h4>
              <p className="text-xs text-red-700 mt-0.5">{riskAssessment.reason}</p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Tabs (6 TABS) */}
      <div className="border-b border-slate-200 flex items-center gap-1 sm:gap-2 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab('ringkasan')}
          className={`px-4 py-3 border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'ringkasan'
              ? 'border-[#00236f] text-[#00236f] font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Ringkasan & Profil
        </button>

        {role !== 'tim_grup' && (
          <button
            onClick={() => setActiveTab('diagnosis')}
            className={`px-4 py-3 border-b-2 transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'diagnosis'
                ? 'border-[#00236f] text-[#00236f] font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Diagnosis 5 Area</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('roadmap')}
          className={`px-4 py-3 border-b-2 transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'roadmap'
              ? 'border-[#00236f] text-[#00236f] font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Roadmap ({roadmap.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('kpi')}
          className={`px-4 py-3 border-b-2 transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'kpi'
              ? 'border-[#00236f] text-[#00236f] font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>KPI Bisnis ({kpis.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('sesi')}
          className={`px-4 py-3 border-b-2 transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'sesi'
              ? 'border-[#00236f] text-[#00236f] font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Sesi ({sessions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('tugas')}
          className={`px-4 py-3 border-b-2 transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'tugas'
              ? 'border-[#00236f] text-[#00236f] font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Tugas & Action Items ({tasks.length})</span>
        </button>
      </div>

      {/* TAB 1: RINGKASAN */}
      {activeTab === 'ringkasan' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Status Pendaftaran Program & Sesi (7 cols) */}
          <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900 font-['Plus_Jakarta_Sans'] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#00236f]" />
                Status Pendaftaran Program (Enrollment)
              </h3>
              {isConsultantOrOwner && enrollment && (
                <button
                  onClick={() => {
                    setEnrollmentDraft(enrollment);
                    setEditingEnrollment(!editingEnrollment);
                  }}
                  className="text-xs text-[#0051d5] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3 h-3" />
                  {editingEnrollment ? 'Batal' : 'Sesuaikan Sesi'}
                </button>
              )}
            </div>

            {enrollment ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block uppercase">Total Sesi</span>
                    <span className="text-lg font-bold text-slate-800">{enrollment.totalSessions}</span>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-emerald-700 block uppercase">Selesai</span>
                    <span className="text-lg font-bold text-emerald-800">{enrollment.completedSessions}</span>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <span className="text-[10px] text-[#0051d5] block uppercase">Sisa Sesi</span>
                    <span className="text-lg font-bold text-[#00236f]">{enrollment.remainingSessions}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block uppercase">Durasi</span>
                    <span className="text-lg font-bold text-slate-800">{enrollment.durationWeeks} Mgg</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span>Tanggal Mulai:</span>
                    <span className="font-semibold text-slate-900">{enrollment.startDate}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span>Estimasi Selesai:</span>
                    <span className="font-semibold text-slate-900">{enrollment.endDate}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Status Program:</span>
                    <span className="font-bold text-emerald-700 uppercase">{enrollment.status}</span>
                  </div>
                </div>

                {editingEnrollment && (
                  <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200 space-y-3 animate-in fade-in">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-slate-600 mb-1">Total Sesi Diatur</label>
                        <input
                          type="number"
                          value={enrollmentDraft.totalSessions || 12}
                          onChange={(e) =>
                            setEnrollmentDraft({
                              ...enrollmentDraft,
                              totalSessions: Number(e.target.value),
                            })
                          }
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Sesi Terlaksana</label>
                        <input
                          type="number"
                          value={enrollmentDraft.completedSessions || 0}
                          onChange={(e) =>
                            setEnrollmentDraft({
                              ...enrollmentDraft,
                              completedSessions: Number(e.target.value),
                            })
                          }
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleSaveEnrollmentDraft}
                      className="w-full py-2 bg-[#00236f] text-white text-xs font-semibold rounded-lg hover:bg-[#1e3a8a]"
                    >
                      Simpan Perubahan Sesi
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400">Belum ada catatan enrollment program.</p>
            )}
          </div>

          {/* Tim Konsultan yang Ditugaskan (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-slate-900 font-['Plus_Jakarta_Sans'] flex items-center justify-between">
                <span>Konsultan Pendamping</span>
                <span className="text-[11px] font-normal text-slate-400">
                  {assignedConsultants.length} Konsultan
                </span>
              </h3>

              {assignedConsultants.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {assignedConsultants.map((c, i) => {
                    const ccRel = clientConsultants.find((cc) => cc.consultantId === c.id);
                    return (
                      <div key={c.id} className="py-3 flex items-center gap-3">
                        <img
                          src={c.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'}
                          alt={c.displayName}
                          className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-slate-200"
                        />
                        <div className="overflow-hidden flex-1">
                          <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <span className="truncate">{c.displayName}</span>
                            {i === 0 && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-[#00236f] font-semibold">
                                Lead
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {ccRel?.role || c.title || 'Konsultan Bisnis'}
                          </div>
                          <div className="text-[10px] text-blue-700 mt-0.5">{c.phone}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400">Belum ada konsultan yang ditugaskan.</p>
              )}
            </div>

            {/* DETAIL REGISTRASI */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3 text-xs">
              <h3 className="font-bold text-sm text-slate-900 font-['Plus_Jakarta_Sans']">
                Detail Profil Usaha
              </h3>
              <div className="space-y-2 text-slate-600">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>Nama Bisnis:</span>
                  <span className="font-semibold text-slate-900">{client.namaBisnis}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>Nama Pemilik:</span>
                  <span className="font-semibold text-slate-900">{client.namaPemilik}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>Industri:</span>
                  <span className="font-semibold text-slate-900">{client.industri}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>Domisili:</span>
                  <span className="font-semibold text-slate-900">{client.kota}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>Lama Berdiri:</span>
                  <span className="font-semibold text-slate-900">{client.lamaUsaha}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>Tim Karyawan:</span>
                  <span className="font-semibold text-slate-900">{client.jumlahKaryawan}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Kontak WhatsApp:</span>
                  <span className="font-semibold text-slate-900">{client.kontak}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DIAGNOSIS (5 Area: Keuangan, Pemasaran, Operasional, SDM, Produk) */}
      {activeTab === 'diagnosis' && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#0051d5]">
                Audit & Diagnosis Bisnis 360°
              </span>
              <h2 className="text-xl font-bold text-slate-900 font-['Plus_Jakarta_Sans'] mt-0.5">
                Evaluasi 5 Pilar Bisnis ({client.namaBisnis})
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Penilaian komprehensif 5 pilar utama: Keuangan, Pemasaran, Operasional, SDM, dan Produk dengan skor 1 s.d. 5.
              </p>
            </div>

            {isConsultantOrOwner && (
              <button
                onClick={handleOpenEditDiagnosis}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#00236f] hover:bg-[#1e3a8a] text-white text-xs font-semibold transition cursor-pointer shadow-xs"
              >
                <Edit3 className="w-4 h-4" />
                <span>Perbarui Skor & Catatan Diagnosis</span>
              </button>
            )}
          </div>

          {/* DIAGNOSIS CHART (RADAR & BAR CHART) */}
          <DiagnosisChart diagnosis={diagnosis} />

          {/* DETAILED 5-AREA CARDS */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 font-['Plus_Jakarta_Sans'] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#00236f]" />
              Rincian Skor & Catatan per Area
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Area 1: Keuangan */}
              <div className="p-5 rounded-2xl border border-blue-100 bg-blue-50/30 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#0051d5] uppercase tracking-wider">
                      Area 1: Finansial
                    </span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-[#00236f]">
                      Skor {diagnosis?.keuangan?.score || 3} / 5
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mt-1">Keuangan & Arus Kas</h4>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    {diagnosis?.keuangan?.notes || 'Belum ada catatan detail keuangan.'}
                  </p>
                </div>
                <div className="text-[10px] text-slate-400 pt-2 border-t border-blue-100/60">
                  Fokus: Arus Kas, COGS, Pemisahan Rekening
                </div>
              </div>

              {/* Area 2: Pemasaran */}
              <div className="p-5 rounded-2xl border border-purple-100 bg-purple-50/30 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">
                      Area 2: Komersial
                    </span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
                      Skor {diagnosis?.pemasaran?.score || 3} / 5
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mt-1">Pemasaran & Penjualan</h4>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    {diagnosis?.pemasaran?.notes || 'Belum ada catatan detail pemasaran.'}
                  </p>
                </div>
                <div className="text-[10px] text-slate-400 pt-2 border-t border-purple-100/60">
                  Fokus: Branding, Channel Penjualan, Retensi
                </div>
              </div>

              {/* Area 3: Operasional */}
              <div className="p-5 rounded-2xl border border-sky-100 bg-sky-50/30 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider">
                      Area 3: Sistem
                    </span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800">
                      Skor {diagnosis?.operasional?.score || 3} / 5
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mt-1">Operasional & SOP</h4>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    {diagnosis?.operasional?.notes || 'Belum ada catatan detail operasional.'}
                  </p>
                </div>
                <div className="text-[10px] text-slate-400 pt-2 border-t border-sky-100/60">
                  Fokus: Standarisasi Mutu, Rantai Pasok, WFA Flow
                </div>
              </div>

              {/* Area 4: SDM */}
              <div className="p-5 rounded-2xl border border-rose-100 bg-rose-50/30 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">
                      Area 4: Organisasi
                    </span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800">
                      Skor {diagnosis?.sdm?.score || 3} / 5
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mt-1">SDM & Struktur Tim</h4>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    {diagnosis?.sdm?.notes || 'Belum ada catatan detail SDM.'}
                  </p>
                </div>
                <div className="text-[10px] text-slate-400 pt-2 border-t border-rose-100/60">
                  Fokus: KPI Karyawan, Delegasi, Supervisi
                </div>
              </div>

              {/* Area 5: Produk */}
              <div className="p-5 rounded-2xl border border-emerald-100 bg-emerald-50/30 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                      Area 5: Penawaran
                    </span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Skor {diagnosis?.produk?.score || 3} / 5
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mt-1">Produk & Layanan</h4>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    {diagnosis?.produk?.notes || 'Belum ada catatan detail produk.'}
                  </p>
                </div>
                <div className="text-[10px] text-slate-400 pt-2 border-t border-emerald-100/60">
                  Fokus: Kualitas Produk, USP, Kepuasan Pelanggan
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORM DIAGNOSIS 5 AREA */}
      {editingDiagnosis && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto font-['Inter']">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                  Formulir Diagnosis 5 Area Bisnis
                </h3>
                <p className="text-xs text-slate-500">
                  Tentukan skor 1 sampai 5 untuk masing-masing pilar dan sertakan catatan hasil observasi.
                </p>
              </div>
              <button
                onClick={() => setEditingDiagnosis(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
              {[
                { key: 'keuangan', label: '1. Keuangan & Arus Kas' },
                { key: 'pemasaran', label: '2. Pemasaran & Penjualan' },
                { key: 'operasional', label: '3. Operasional & SOP' },
                { key: 'sdm', label: '4. SDM & Organisasi' },
                { key: 'produk', label: '5. Produk & Layanan' },
              ].map(({ key, label }) => {
                const currentScore = (diagnosisForm as any)?.[key]?.score || 3;
                const currentNotes = (diagnosisForm as any)?.[key]?.notes || '';

                return (
                  <div key={key} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="text-xs font-bold text-slate-900">{label}</label>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-500 mr-1">Skor:</span>
                        {[1, 2, 3, 4, 5].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() =>
                              setDiagnosisForm({
                                ...diagnosisForm,
                                [key]: {
                                  score: num,
                                  notes: (diagnosisForm as any)?.[key]?.notes || '',
                                },
                              })
                            }
                            className={`w-8 h-8 rounded-lg text-xs font-bold transition cursor-pointer ${
                              currentScore === num
                                ? 'bg-[#00236f] text-white shadow-xs scale-105'
                                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <textarea
                        rows={2}
                        value={currentNotes}
                        onChange={(e) =>
                          setDiagnosisForm({
                            ...diagnosisForm,
                            [key]: {
                              score: currentScore,
                              notes: e.target.value,
                            },
                          })
                        }
                        placeholder={`Catatan observasi untuk ${label}...`}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs"
                      />
                    </div>
                  </div>
                );
              })}

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Catatan Kesimpulan / Rekomendasi Umum
                </label>
                <textarea
                  rows={3}
                  value={diagnosisForm.overallNotes || ''}
                  onChange={(e) =>
                    setDiagnosisForm({ ...diagnosisForm, overallNotes: e.target.value })
                  }
                  placeholder="Ringkasan prioritas perbaikan 30-90 hari..."
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                onClick={() => setEditingDiagnosis(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                onClick={handleSaveDiagnosis}
                className="px-6 py-2 rounded-xl bg-[#00236f] hover:bg-[#1e3a8a] text-white text-xs font-semibold shadow-xs"
              >
                Simpan Hasil Diagnosis
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ROADMAP (Client-Specific) */}
      {activeTab === 'roadmap' && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#0051d5]">
                Roadmap Transformasi Bisnis Klien
              </span>
              <h2 className="text-xl font-bold text-slate-900 font-['Plus_Jakarta_Sans'] mt-0.5">
                Tahapan Rencana Aksi ({client.namaBisnis})
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Disalin otomatis dari template program saat registrasi. Edit tahapan di sini khusus untuk klien ini tanpa mengubah template utama.
              </p>
            </div>

            {isConsultantOrOwner && (
              <button
                onClick={handleOpenAddRoadmap}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#00236f] hover:bg-[#1e3a8a] text-white text-xs font-semibold transition cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Tahapan Roadmap</span>
              </button>
            )}
          </div>

          <div className="space-y-4">
            {roadmap.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Belum ada tahapan roadmap untuk klien ini. Klik tombol "Tambah Tahapan Roadmap".
              </div>
            ) : (
              roadmap.map((item, idx) => {
                const tahapanTitle = item.tahapan || item.phase || `Fase ${idx + 1}`;
                const sasaranText = item.sasaran || item.title || 'Sasaran Milestone';
                const tenggatText = item.tenggat || item.targetWeek || '-';
                const deskripsiText = item.deskripsi || item.description || '';

                return (
                  <div
                    key={item.id}
                    className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs hover:border-slate-300 transition"
                  >
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-9 h-9 rounded-xl bg-[#00236f] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-xs">
                        0{item.urutan || item.order || idx + 1}
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-[#0051d5] uppercase tracking-wider">
                          <span>{tahapanTitle}</span>
                          <span>•</span>
                          <span className="text-slate-500 font-semibold flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Tenggat: {tenggatText}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900">{sasaranText}</h4>
                        {deskripsiText && (
                          <p className="text-xs text-slate-600 leading-relaxed pt-0.5">
                            {deskripsiText}
                          </p>
                        )}

                        {/* Link Google Drive */}
                        {(item.driveUrl || item.googleDriveUrl) ? (
                          <div className="pt-2">
                            <a
                              href={item.driveUrl || item.googleDriveUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-900 border border-blue-200 text-xs font-semibold transition shadow-2xs group"
                              title="Buka Folder / Dokumen Google Drive"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-[#0051d5] group-hover:translate-x-0.5 transition-transform" />
                              <span>Google Drive Deliverable</span>
                            </a>
                          </div>
                        ) : isConsultantOrOwner ? (
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditRoadmap(item)}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-[#0051d5] transition cursor-pointer"
                              title="Tambahkan link Google Drive untuk tahapan ini"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Tambah Link Google Drive</span>
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {isConsultantOrOwner ? (
                        <select
                          value={item.status}
                          onChange={async (e) => {
                            const updated = { ...item, status: e.target.value as any };
                            await saveRoadmapItem(updated);
                            setRoadmap(roadmap.map((r) => (r.id === item.id ? updated : r)));
                          }}
                          className={`text-xs px-3 py-1.5 rounded-lg border font-bold uppercase transition bg-white cursor-pointer ${
                            item.status === 'Selesai'
                              ? 'text-emerald-800 border-emerald-300 bg-emerald-50'
                              : item.status === 'Berjalan'
                              ? 'text-amber-800 border-amber-300 bg-amber-50'
                              : 'text-slate-700 border-slate-300'
                          }`}
                        >
                          <option value="Belum">Belum</option>
                          <option value="Berjalan">Berjalan</option>
                          <option value="Selesai">Selesai</option>
                        </select>
                      ) : (
                        <span
                          className={`text-xs px-3 py-1 rounded-full font-bold uppercase ${
                            item.status === 'Selesai'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.status === 'Berjalan'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {item.status}
                        </span>
                      )}

                      {isConsultantOrOwner && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditRoadmap(item)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-white transition cursor-pointer"
                            title="Edit Tahapan"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRoadmapItem(item.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                            title="Hapus Tahapan"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MODAL EDIT / TAMBAH ROADMAP ITEM */}
      {editingRoadmapModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto font-['Inter']">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                {roadmapForm.id ? 'Edit Tahapan Roadmap' : 'Tambah Tahapan Roadmap Baru'}
              </h3>
              <button
                onClick={() => setEditingRoadmapModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRoadmapItem} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Tahapan / Fase *</label>
                  <input
                    type="text"
                    value={roadmapForm.tahapan || ''}
                    onChange={(e) => setRoadmapForm({ ...roadmapForm, tahapan: e.target.value })}
                    placeholder="Contoh: Fase 1: Diagnostik & Arus Kas"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tenggat Waktu *</label>
                  <input
                    type="text"
                    value={roadmapForm.tenggat || ''}
                    onChange={(e) => setRoadmapForm({ ...roadmapForm, tenggat: e.target.value })}
                    placeholder="Contoh: Minggu 1-3 atau 2026-10-30"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Sasaran Capaian (Goal) *</label>
                <input
                  type="text"
                  value={roadmapForm.sasaran || ''}
                  onChange={(e) => setRoadmapForm({ ...roadmapForm, sasaran: e.target.value })}
                  placeholder="Contoh: Audit Food Cost & Pemisahan Rekening Operasional"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status Eksekusi</label>
                  <select
                    value={roadmapForm.status || 'Belum'}
                    onChange={(e) => setRoadmapForm({ ...roadmapForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="Belum">Belum Mulai</option>
                    <option value="Berjalan">Sedang Berjalan</option>
                    <option value="Selesai">Selesai</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nomor Urutan</label>
                  <input
                    type="number"
                    min="1"
                    value={roadmapForm.urutan || 1}
                    onChange={(e) => setRoadmapForm({ ...roadmapForm, urutan: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Deskripsi / Detail Langkah</label>
                <textarea
                  rows={3}
                  value={roadmapForm.deskripsi || ''}
                  onChange={(e) => setRoadmapForm({ ...roadmapForm, deskripsi: e.target.value })}
                  placeholder="Deskripsikan output yang diharapkan..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5 text-[#0051d5]" />
                    <span>Link Google Drive (Folder / Dokumen Deliverable)</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-normal">Opsional</span>
                </div>
                <input
                  type="url"
                  value={roadmapForm.driveUrl || roadmapForm.googleDriveUrl || ''}
                  onChange={(e) =>
                    setRoadmapForm({
                      ...roadmapForm,
                      driveUrl: e.target.value,
                      googleDriveUrl: e.target.value,
                    })
                  }
                  placeholder="https://drive.google.com/drive/folders/... atau https://docs.google.com/..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Tautkan folder Google Drive, dokumen SOP, template Excel, atau worksheet yang menjadi deliverable tahapan ini.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingRoadmapModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#00236f] text-white font-semibold hover:bg-[#1e3a8a]"
                >
                  Simpan Tahapan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: KPI BISNIS */}
      {activeTab === 'kpi' && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#0051d5]">
                Key Performance Indicators
              </span>
              <h2 className="text-xl font-bold text-slate-900 font-['Plus_Jakarta_Sans'] mt-0.5">
                Indikator Capaian Bisnis ({client.namaBisnis})
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Metrik keberhasilan bisnis terukur: Nilai Awal vs Target Capaian vs Nilai Saat Ini dengan bilah progres.
              </p>
            </div>

            {isConsultantOrOwner && (
              <button
                onClick={handleOpenAddKpi}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#00236f] hover:bg-[#1e3a8a] text-white text-xs font-semibold transition cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah KPI Baru</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {kpis.map((kpi) => {
              const kpiNama = kpi.nama || kpi.title || 'Indikator Bisnis';
              const baseline = kpi.nilaiAwal ?? kpi.baselineValue ?? 0;
              const target = kpi.target ?? kpi.targetValue ?? 100;
              const current = kpi.nilaiSaatIni ?? kpi.currentValue ?? 0;
              const unit = kpi.satuan || kpi.unit || '%';
              const dateStr = kpi.tanggalPembaruan || (kpi.updatedAt ? kpi.updatedAt.split('T')[0] : '-');

              // Proportional progress calculation
              let progressPct = 0;
              if (target > baseline) {
                // Growth metric (e.g. Omzet 90M -> 140M)
                const range = target - baseline;
                progressPct = range > 0 ? Math.round(((current - baseline) / range) * 100) : 0;
              } else if (baseline > target) {
                // Efficiency / Reduction metric (e.g. Cost 42% -> 32%, or DSO 60d -> 20d)
                const range = baseline - target;
                progressPct = range > 0 ? Math.round(((baseline - current) / range) * 100) : 0;
              } else {
                progressPct = current >= target ? 100 : 0;
              }
              const displayProgress = Math.max(0, Math.min(100, progressPct));

              return (
                <div
                  key={kpi.id}
                  className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-4 shadow-2xs hover:border-slate-300 transition"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {kpi.kategori || 'Metrik Bisnis'}
                      </span>
                      {isConsultantOrOwner && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditKpi(kpi)}
                            className="p-1 text-slate-400 hover:text-slate-700"
                            title="Edit KPI"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteKpi(kpi.id)}
                            className="p-1 text-slate-400 hover:text-red-600"
                            title="Hapus KPI"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 leading-snug">{kpiNama}</h4>

                    <div className="grid grid-cols-3 gap-2 text-center pt-1">
                      <div className="p-2 rounded-xl bg-white border border-slate-100">
                        <div className="text-[10px] text-slate-400">Awal</div>
                        <div className="text-xs font-semibold text-slate-700 truncate">
                          {baseline} {unit}
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-blue-50 border border-blue-100">
                        <div className="text-[10px] text-[#0051d5] font-semibold">Saat Ini</div>
                        <div className="text-xs font-bold text-[#00236f] truncate">
                          {current} {unit}
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-white border border-slate-100">
                        <div className="text-[10px] text-slate-400">Target</div>
                        <div className="text-xs font-semibold text-emerald-700 truncate">
                          {target} {unit}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <div className="flex justify-between text-[11px] text-slate-600 mb-1 font-medium">
                        <span>Bilah Progres Capaian</span>
                        <span className="font-bold text-[#00236f]">{displayProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-200">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            displayProgress >= 100
                              ? 'bg-emerald-600'
                              : displayProgress >= 50
                              ? 'bg-[#00236f]'
                              : 'bg-amber-600'
                          }`}
                          style={{ width: `${displayProgress}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                        <span>Pembaruan: {dateStr}</span>
                      </div>
                    </div>
                  </div>

                  {isConsultantOrOwner && (
                    <button
                      onClick={() => {
                        setQuickUpdateKpi(kpi);
                        setNewKpiValue(current);
                      }}
                      className="w-full py-2 rounded-xl border border-slate-300 hover:bg-white text-xs font-semibold text-slate-700 transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <RefreshCw className="w-3 h-3 text-slate-500" />
                      <span>Update Nilai Saat Ini</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL QUICK UPDATE KPI VALUE */}
      {quickUpdateKpi && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900">
              Update Capaian: {quickUpdateKpi.nama || quickUpdateKpi.title}
            </h3>
            <div>
              <label className="block text-xs text-slate-600 mb-1">
                Nilai Saat Ini ({quickUpdateKpi.satuan || quickUpdateKpi.unit})
              </label>
              <input
                type="number"
                step="any"
                value={newKpiValue}
                onChange={(e) => setNewKpiValue(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setQuickUpdateKpi(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600"
              >
                Batal
              </button>
              <button
                onClick={handleQuickUpdateKpiSubmit}
                className="px-4 py-1.5 rounded-lg bg-[#00236f] text-white text-xs font-semibold"
              >
                Simpan Nilai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH / EDIT FULL KPI */}
      {editingKpiModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">
                {kpiForm.id ? 'Edit Metrik KPI' : 'Tambah Indikator KPI Baru'}
              </h3>
              <button onClick={() => setEditingKpiModal(false)} className="text-slate-400">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveKpi} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Indikator KPI *</label>
                <input
                  type="text"
                  value={kpiForm.nama || ''}
                  onChange={(e) => setKpiForm({ ...kpiForm, nama: e.target.value })}
                  placeholder="Contoh: Rasio Food & Beverage Cost (COGS)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nilai Awal *</label>
                  <input
                    type="number"
                    step="any"
                    value={kpiForm.nilaiAwal ?? 0}
                    onChange={(e) => setKpiForm({ ...kpiForm, nilaiAwal: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nilai Saat Ini *</label>
                  <input
                    type="number"
                    step="any"
                    value={kpiForm.nilaiSaatIni ?? 0}
                    onChange={(e) => setKpiForm({ ...kpiForm, nilaiSaatIni: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target *</label>
                  <input
                    type="number"
                    step="any"
                    value={kpiForm.target ?? 100}
                    onChange={(e) => setKpiForm({ ...kpiForm, target: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Satuan</label>
                  <input
                    type="text"
                    value={kpiForm.satuan || '%'}
                    onChange={(e) => setKpiForm({ ...kpiForm, satuan: e.target.value })}
                    placeholder="%, Rp, Hari, Jam/Mgg, Pcs"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kategori</label>
                  <input
                    type="text"
                    value={kpiForm.kategori || 'Finansial'}
                    onChange={(e) => setKpiForm({ ...kpiForm, kategori: e.target.value })}
                    placeholder="Finansial, Operasional, dll"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tanggal Pembaruan</label>
                <input
                  type="date"
                  value={kpiForm.tanggalPembaruan || new Date().toISOString().split('T')[0]}
                  onChange={(e) => setKpiForm({ ...kpiForm, tanggalPembaruan: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingKpiModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#00236f] text-white font-semibold hover:bg-[#1e3a8a]"
                >
                  Simpan KPI
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 5: SESI */}
      {activeTab === 'sesi' && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                Riwayat & Jadwal Sesi Pendampingan
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Catatan sesi WFA berkala, agenda pembahasan, tautan meeting, dan notulensi.
              </p>
            </div>

            {isConsultantOrOwner && (
              <button
                onClick={() => onOpenSessionModal(undefined, client.id)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#00236f] text-white text-xs font-semibold hover:bg-[#1e3a8a] transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Tambah / Catat Sesi Baru
              </button>
            )}
          </div>

          <div className="space-y-5">
            {sessions.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">Belum ada riwayat sesi.</div>
            ) : (
              sessions.map((session) => {
                const internal = sessionInternals[session.id];

                return (
                  <div
                    key={session.id}
                    className="p-6 rounded-2xl border border-slate-200 bg-white space-y-4 shadow-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              session.status === 'Selesai'
                                ? 'bg-emerald-100 text-emerald-800'
                                : session.status === 'Terjadwal'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {session.status}
                          </span>
                          <span className="text-xs font-bold text-[#00236f] flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {formatWITA(session.dateTime, true)}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 mt-1">{session.agenda}</h3>
                      </div>

                      <div className="flex items-center gap-2">
                        {session.meetingUrl && (
                          <a
                            href={session.meetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition"
                          >
                            <Video className="w-3.5 h-3.5" />
                            Meeting Link
                          </a>
                        )}
                        {isConsultantOrOwner && (
                          <>
                            <button
                              onClick={() => setAuditSessionModal(session)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition cursor-pointer"
                              title="Audit Integritas Data & Akses Sesi"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                              Audit Integritas
                            </button>
                            <button
                              onClick={() => onOpenSessionModal(session.id, client.id)}
                              className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                            >
                              Edit / Notulensi
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {session.catatanDibagikan && (
                      <div className="p-4 rounded-xl bg-blue-50/30 border border-blue-100 text-xs text-slate-700 space-y-1">
                        <div className="font-bold text-[#00236f] flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                          <Eye className="w-3.5 h-3.5" />
                          Catatan Dibagikan (Terlihat Klien):
                        </div>
                        <p className="whitespace-pre-line leading-relaxed">{session.catatanDibagikan}</p>
                      </div>
                    )}

                    {isConsultantOrOwner && internal?.catatanInternal && (
                      <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 text-xs text-amber-900 space-y-1">
                        <div className="font-bold text-amber-800 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                          <Lock className="w-3.5 h-3.5 text-amber-700" />
                          Catatan Internal Tim (Rahasia Dari Klien):
                        </div>
                        <p className="whitespace-pre-line leading-relaxed italic">{internal.catatanInternal}</p>
                        {internal.keyObservations && (
                          <div className="pt-1 text-[11px] text-amber-700 font-medium">
                            Key Observation: {internal.keyObservations}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 6: TUGAS */}
      {activeTab === 'tugas' && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                Daftar Tugas & Action Items
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Seluruh komitmen eksekusi hasil sesi pendampingan WFA.
              </p>
            </div>

            {isConsultantOrOwner && (
              <button
                onClick={() => setShowNewTaskModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#00236f] text-white text-xs font-semibold hover:bg-[#1e3a8a] transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Tambah Tugas Baru
              </button>
            )}
          </div>

          <div className="space-y-3">
            {tasks.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">Belum ada tugas tercatat.</div>
            ) : (
              tasks.map((task) => {
                const isOverdue = task.status === 'Terlambat' || isTaskOverdue(task.deadline, task.status);

                return (
                  <div
                    key={task.id}
                    className={`p-4 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      task.status === 'Selesai'
                        ? 'bg-slate-50/40 border-slate-200'
                        : isOverdue
                        ? 'bg-red-50/20 border-red-200'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="space-y-1 max-w-xl">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{task.title}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span>
                          PIC: <strong>{task.assigneeName}</strong> ({task.assigneeRole})
                        </span>
                        <span className={isOverdue ? 'text-red-700 font-semibold' : ''}>
                          Tenggat: {task.deadline}
                        </span>
                        {task.notes && <span>Catatan: {task.notes}</span>}
                      </div>

                      {task.proofUrl && (
                        <div className="pt-1">
                          <a
                            href={task.proofUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline font-semibold"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Bukti Unggahan / Hasil Eksekusi
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={task.status}
                        onChange={(e) => handleTaskStatusChange(task.id, e.target.value)}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border font-bold uppercase transition ${
                          task.status === 'Selesai'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : task.status === 'Berjalan'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : isOverdue
                            ? 'bg-red-50 text-red-800 border-red-200'
                            : 'bg-slate-50 text-slate-700 border-slate-300'
                        }`}
                      >
                        <option value="Belum">Belum</option>
                        <option value="Berjalan">Berjalan</option>
                        <option value="Selesai">Selesai</option>
                        <option value="Terlambat">Terlambat</option>
                      </select>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {showNewTaskModal && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4">
                <h3 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                  Tambah Tugas / Action Item Baru
                </h3>
                <form onSubmit={handleCreateTask} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Judul Tugas *
                    </label>
                    <input
                      type="text"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      placeholder="Contoh: Cetak SOP racikan kopi barista"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nama PIC
                      </label>
                      <input
                        type="text"
                        value={taskAssignee}
                        onChange={(e) => setTaskAssignee(e.target.value)}
                        placeholder={client.namaPemilik}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Peran PIC
                      </label>
                      <select
                        value={taskRole}
                        onChange={(e) => setTaskRole(e.target.value as any)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                      >
                        <option value="Klien">Klien</option>
                        <option value="Konsultan">Konsultan</option>
                        <option value="Tim">Tim</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tenggat Waktu
                    </label>
                    <input
                      type="date"
                      value={taskDeadline}
                      onChange={(e) => setTaskDeadline(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowNewTaskModal(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 font-semibold"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-[#00236f] text-white text-xs font-semibold rounded-xl"
                    >
                      Simpan Tugas
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Session Audit Summary Modal */}
      {auditSessionModal && (
        <SessionAuditSummary
          isModal
          session={auditSessionModal}
          sessionId={auditSessionModal.id}
          clientName={client.namaBisnis}
          onClose={() => setAuditSessionModal(null)}
        />
      )}

      {/* Delete Client Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                  Hapus Data Klien Permanen?
                </h3>
                <p className="text-xs text-slate-500">
                  Anda akan menghapus entitas <strong className="text-slate-900">{client.namaBisnis}</strong> (Pemilik: {client.namaPemilik}).
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
              <label className="block text-[11px] font-bold text-slate-600">
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
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                }}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteClient}
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
