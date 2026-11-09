import { UserAvatar } from '../components/UserAvatar';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Compass,
  Calendar,
  Clock,
  Video,
  CheckCircle2,
  AlertCircle,
  FileText,
  Upload,
  ExternalLink,
  Target,
  Sparkles,
  Phone,
  Layers,
  ArrowRight,
  ShieldCheck,
  Award,
  Star,
  MessageSquare,
  Send,
  Eye,
  EyeOff,
  Lock,
  Camera,
} from 'lucide-react';
import { AvatarPickerModal } from '../components/AvatarPickerModal';
import { Client, Session, Task, RoadmapItem, Kpi, Program, UserProfile, Diagnosis, Feedback, ContentConsent, ConsentStatus } from '../types';
import {
  getClientById,
  getPrograms,
  getAllUsers,
  getSessions,
  getTasks,
  getRoadmapByClient,
  getKpisByClient,
  getDiagnosisByClient,
  getFeedbackByClient,
  saveFeedback,
  updateTaskStatus,
  getContentConsents,
  updateContentConsentStatus,
} from '../services/db';
import { formatWITA, isTaskOverdue } from '../utils/formatters';
import { DiagnosisChart } from '../components/DiagnosisChart';

export const ClientPortal: React.FC = () => {
  const { userProfile, updateAvatar } = useAuth();
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [client, setClient] = useState<Client | null>(null);
  const [program, setProgram] = useState<Program | null>(null);
  const [consultant, setConsultant] = useState<UserProfile | null>(null);
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [roadmap, setRoadmap] = useState<RoadmapItem[]>([]);
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [consents, setConsents] = useState<ContentConsent[]>([]);
  const [loading, setLoading] = useState(true);

  // Proof submission modal
  const [submittingTask, setSubmittingTask] = useState<Task | null>(null);
  const [proofUrl, setProofUrl] = useState('');
  const [proofNotes, setProofNotes] = useState('');

  // Feedback Form State
  const [selectedSessionForFeedback, setSelectedSessionForFeedback] = useState<string>('');
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackComments, setFeedbackComments] = useState<string>('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  // Consent Action State
  const [consentNotesMap, setConsentNotesMap] = useState<Record<string, string>>({});
  const [consentAnonMap, setConsentAnonMap] = useState<Record<string, boolean>>({});

  const clientId = userProfile?.clientId || 'client-1'; // fallback to first client if client user

  useEffect(() => {
    async function loadClientPortal() {
      try {
        const [c, pList, uList, s, t, r, k, d, fb, consentList] = await Promise.all([
          getClientById(clientId),
          getPrograms(),
          getAllUsers(),
          getSessions(clientId),
          getTasks(clientId),
          getRoadmapByClient(clientId),
          getKpisByClient(clientId),
          getDiagnosisByClient(clientId),
          getFeedbackByClient(clientId),
          getContentConsents(clientId),
        ]);

        if (c) {
          setClient(c);
          const prog = pList.find((p) => p.id === c.programId);
          setProgram(prog || null);
          const cons = uList.find((u) => u.id === c.primaryConsultantId);
          setConsultant(cons || null);
        }

        // NOTE: In client portal, internal notes are NEVER fetched!
        setSessions(s);
        setTasks(t);
        setRoadmap(r);
        setKpis(k);
        setDiagnosis(d);
        setFeedbacks(fb);
        setConsents(consentList);

        // Initialize consent states
        const notesObj: Record<string, string> = {};
        const anonObj: Record<string, boolean> = {};
        consentList.forEach((item) => {
          notesObj[item.id] = item.clientNotes || '';
          anonObj[item.id] = item.isAnonymizedDefault !== false;
        });
        setConsentNotesMap(notesObj);
        setConsentAnonMap(anonObj);

        // Auto select last completed session for feedback if not yet rated
        const completedSess = s
          .filter((item) => item.status === 'Selesai')
          .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
        if (completedSess.length > 0) {
          setSelectedSessionForFeedback(completedSess[0].id);
        }
      } catch (err) {
        console.error('Error loading client portal:', err);
      } finally {
        setLoading(false);
      }
    }
    loadClientPortal();
  }, [clientId]);

  if (!client) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm">
        Memuat data bisnis Anda...
      </div>
    );
  }

  // Next upcoming session
  const upcomingSession = sessions
    .filter((s) => s.status === 'Terjadwal')
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())[0];

  // Client tasks
  const pendingTasks = tasks.filter((t) => t.status !== 'Selesai');
  const completedTasks = tasks.filter((t) => t.status === 'Selesai');

  const handleUpdateStatus = async (taskId: string, newStatus: any) => {
    try {
      await updateTaskStatus(
        taskId,
        client.id,
        { status: newStatus },
        userProfile?.displayName || client.namaPemilik,
        'Klien'
      );
      setTasks(tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    } catch (err) {
      console.error('Error updating task:', err);
    }
  };

  const handleSaveProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingTask) return;
    try {
      await updateTaskStatus(
        submittingTask.id,
        client.id,
        {
          proofUrl: proofUrl.trim(),
          notes: proofNotes.trim(),
          status: 'Selesai',
        },
        userProfile?.displayName || client.namaPemilik,
        'Klien'
      );
      setTasks(
        tasks.map((t) =>
          t.id === submittingTask.id
            ? { ...t, proofUrl: proofUrl.trim(), notes: proofNotes.trim(), status: 'Selesai' }
            : t
        )
      );
      setSubmittingTask(null);
      setProofUrl('');
      setProofNotes('');
    } catch (err) {
      console.error('Error submitting proof:', err);
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackRating) return;
    setFeedbackSubmitting(true);
    try {
      const fbId = `fb-${Date.now()}`;
      const newFb: Feedback = {
        id: fbId,
        clientId: client.id,
        sessionId: selectedSessionForFeedback || undefined,
        rating: feedbackRating,
        comments: feedbackComments.trim(),
        createdAt: new Date().toISOString(),
      };
      await saveFeedback(newFb);
      setFeedbacks([newFb, ...feedbacks]);
      setFeedbackComments('');
      setFeedbackSuccess(true);
      setTimeout(() => setFeedbackSuccess(false), 4000);
    } catch (err) {
      console.error('Error saving feedback:', err);
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const handleRespondConsent = async (consentId: string, status: ConsentStatus) => {
    try {
      const isAnon = consentAnonMap[consentId] !== false;
      const notes = consentNotesMap[consentId] || '';
      await updateContentConsentStatus(consentId, status, notes, isAnon);
      setConsents((prev) =>
        prev.map((c) =>
          c.id === consentId
            ? {
                ...c,
                status,
                clientNotes: notes,
                isAnonymizedDefault: isAnon,
                respondedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
            : c
        )
      );
    } catch (err) {
      console.error('Error responding to consent:', err);
    }
  };

  // Completed sessions for note review & feedback
  const completedSessions = sessions
    .filter((s) => s.status === 'Selesai')
    .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
  const lastCompletedSession = completedSessions[0];

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#00236f] to-[#1e3a8a] text-white p-6 sm:p-8 rounded-2xl shadow-lg relative overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="absolute right-0 top-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs font-semibold border border-blue-400/30">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-300" />
            Portal Resmi Klien • Nexus Growth Partner
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-['Plus_Jakarta_Sans']">
            Selamat Datang, {client.namaPemilik}!
          </h1>
          <p className="text-sm text-blue-100 font-normal">
            Bisnis: <strong className="text-white">{client.namaBisnis}</strong> ({client.industri}) • Program:{' '}
            <strong className="text-white">{program?.name || 'Belum ditentukan'}</strong>
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-blue-200">
            <span>
              Konsultan Pendamping: <strong className="text-white">{consultant?.displayName || 'Segera ditentukan'}</strong>
            </span>
            <span>•</span>
            <span>Kota: {client.kota} (WITA)</span>
          </div>
        </div>

        {/* Client Avatar Profile Badge */}
        <div className="relative z-10 shrink-0 flex items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 shadow-md">
          <div
            className="relative group cursor-pointer"
            onClick={() => setShowAvatarModal(true)}
            title="Klik untuk ganti foto avatar Anda"
          >
            <UserAvatar url={userProfile?.avatarUrl ||
                client.logoUrl} name={client.namaPemilik} className="w-16 h-16 rounded-2xl ring-2 ring-white/60 group-hover:ring-white transition shadow-sm bg-white/20" />
            <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-white">
              <Camera className="w-5 h-5 drop-shadow-sm" />
            </div>
            <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#0051d5] text-white rounded-full flex items-center justify-center shadow-xs text-xs font-bold ring-2 ring-white">
              ✎
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-200 block">
              Profil Klien UKM
            </span>
            <div className="text-sm font-bold text-white font-['Plus_Jakarta_Sans'] leading-tight">
              {client.namaPemilik}
            </div>
            <button
              type="button"
              onClick={() => setShowAvatarModal(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-semibold transition cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              Ganti Avatar
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Sesi Berikutnya & Ringkasan Tugas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sesi Berikutnya (6 cols) */}
        <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0051d5] flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                Sesi Pendampingan Berikutnya
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-[#00236f] font-bold">
                Zona WITA
              </span>
            </div>

            {upcomingSession ? (
              <div className="mt-4 space-y-3">
                <div className="text-xs font-bold text-[#00236f] flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {formatWITA(upcomingSession.dateTime, true)}
                </div>
                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  {upcomingSession.agenda}
                </h3>
                <p className="text-xs text-slate-500">
                  Durasi: {upcomingSession.durationMinutes} Menit • Konsultan: {consultant?.displayName}
                </p>

                {upcomingSession.catatanDibagikan && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600">
                    <span className="font-semibold text-slate-800 block mb-0.5">Catatan Persiapan:</span>
                    {upcomingSession.catatanDibagikan}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs">
                Belum ada jadwal sesi pendampingan berikutnya. Konsultan Anda akan segera menjadwalkan.
              </div>
            )}
          </div>

          {upcomingSession?.meetingUrl && (
            <div className="mt-5 pt-3 border-t border-slate-100">
              <a
                href={upcomingSession.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#00236f] hover:bg-[#1e3a8a] text-white text-xs font-semibold transition"
              >
                <Video className="w-4 h-4" />
                Masuk ke Google Meet Sesi Ini
              </a>
            </div>
          )}
        </div>

        {/* Ringkasan Tugas & KPI Quick Stats (6 cols) */}
        <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0051d5] flex items-center gap-1.5">
                <Target className="w-4 h-4" />
                Status Eksekusi Tugas Anda
              </span>
              <span className="text-xs text-slate-500">
                {completedTasks.length} dari {tasks.length} Selesai
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-2xl font-extrabold text-amber-700 font-['Plus_Jakarta_Sans']">
                  {pendingTasks.length}
                </div>
                <div className="text-xs text-slate-600 font-medium mt-1">Tugas Menunggu Eksekusi</div>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100">
                <div className="text-2xl font-extrabold text-emerald-800 font-['Plus_Jakarta_Sans']">
                  {completedTasks.length}
                </div>
                <div className="text-xs text-emerald-700 font-medium mt-1">Tugas Tuntas Berhasil</div>
              </div>
            </div>

            <div className="mt-4 p-3.5 rounded-xl bg-blue-50/50 border border-blue-100 text-xs text-slate-600">
              <span className="font-semibold text-[#00236f]">Butuh Bantuan Eksekusi?</span>
              <p className="mt-0.5 text-slate-500">
                Konsultan pendamping Anda siap dihubungi jika Anda membutuhkan template atau bimbingan teknis.
              </p>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Kontak Konsultan:</span>
            {consultant?.phone ? (
              <a
                href={`https://wa.me/${consultant.phone.replace(/[^0-9]/g, '').replace(/^0/, '62')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[#0051d5] hover:underline"
              >
                {consultant.phone} (WhatsApp)
              </a>
            ) : (
              <a
                href="https://wa.me/6282355522710?text=Halo%20Nexus,%20saya%20klien%20dan%20ingin%20menghubungi%20konsultan%20saya."
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[#0051d5] hover:underline"
              >
                Hubungi Nexus via WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Bagian: Tugas yang Bisa Diperbarui Klien */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
              Daftar Tugas & Action Items Anda
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Perbarui status pelaksanaan dan unggah tautan bukti pengerjaan (Google Drive/spreadsheet/foto).
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {tasks.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">Belum ada tugas yang ditugaskan.</div>
          ) : (
            tasks.map((task) => {
              const isOverdue = task.status === 'Terlambat' || isTaskOverdue(task.deadline, task.status);

              return (
                <div
                  key={task.id}
                  className={`p-5 rounded-2xl border transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    task.status === 'Selesai'
                      ? 'bg-slate-50/50 border-slate-200'
                      : isOverdue
                      ? 'bg-red-50/20 border-red-200'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="space-y-2 max-w-xl">
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-sm text-slate-900">{task.title}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>
                        PIC: <strong>{task.assigneeName}</strong>
                      </span>
                      <span className={isOverdue ? 'text-red-700 font-semibold' : ''}>
                        Batas Waktu: {task.deadline}
                      </span>
                      {task.notes && (
                        <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          {task.notes}
                        </span>
                      )}
                    </div>

                    {task.proofUrl && (
                      <div className="pt-1">
                        <a
                          href={task.proofUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 font-semibold hover:underline"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Lihat Bukti Pengerjaan yang Diunggah
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Status updater for Client */}
                    <select
                      value={task.status}
                      onChange={(e) => handleUpdateStatus(task.id, e.target.value)}
                      className={`text-xs px-3 py-2 rounded-xl border font-bold uppercase transition ${
                        task.status === 'Selesai'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : task.status === 'Berjalan'
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : isOverdue
                          ? 'bg-red-50 text-red-800 border-red-200'
                          : 'bg-slate-50 text-slate-700 border-slate-300'
                      }`}
                    >
                      <option value="Belum">Belum Mulai</option>
                      <option value="Berjalan">Sedang Berjalan</option>
                      <option value="Selesai">Telah Selesai</option>
                    </select>

                    <button
                      onClick={() => {
                        setSubmittingTask(task);
                        setProofUrl(task.proofUrl || '');
                        setProofNotes(task.notes || '');
                      }}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-slate-500" />
                      {task.proofUrl ? 'Ubah Bukti' : 'Kirim Bukti'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Bagian: Hasil Diagnosis 5 Area Bisnis */}
      {diagnosis && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                Hasil Diagnosis 5 Pilar Bisnis Anda
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Audit kesiapan operasional & strategi oleh konsultan pendamping Nexus Growth Partner.
              </p>
            </div>
          </div>
          <DiagnosisChart diagnosis={diagnosis} />
        </div>
      )}

      {/* Bagian: Roadmap Transformasi Bisnis */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
              Roadmap Milestone Usaha Anda
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Rencana aksi bertahap terstruktur untuk membenahi pondasi dan akselerasi pertumbuhan bisnis.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {roadmap.length === 0 && (
            <p className="text-xs text-slate-500 text-center py-6 rounded-xl border border-dashed border-slate-200">
              Roadmap akan muncul di sini setelah konsultan menyusunnya bersama Anda.
            </p>
          )}
          {roadmap.map((item, idx) => {
            const tahapanTitle = item.tahapan || item.phase || `Fase ${idx + 1}`;
            const sasaranText = item.sasaran || item.title || 'Sasaran Milestone';
            const tenggatText = item.tenggat || item.targetWeek || '-';
            const deskripsiText = item.deskripsi || item.description || '';

            return (
              <div
                key={item.id}
                className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-8 h-8 rounded-full bg-[#00236f] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    0{item.urutan || item.order || idx + 1}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#0051d5] uppercase tracking-wider">
                      {tahapanTitle} • Tenggat: {tenggatText}
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 mt-0.5">{sasaranText}</h4>
                    {deskripsiText && <p className="text-xs text-slate-600 mt-1">{deskripsiText}</p>}

                    {/* Google Drive Link for client */}
                    {(item.driveUrl || item.googleDriveUrl) && (
                      <div className="pt-2">
                        <a
                          href={item.driveUrl || item.googleDriveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-200 transition group shadow-2xs"
                          title="Buka Folder / Dokumen Google Drive"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-blue-600 group-hover:translate-x-0.5 transition-transform" />
                          <span>Buka Google Drive</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <span
                  className={`text-xs px-3 py-1 rounded-full font-bold uppercase shrink-0 ${
                    item.status === 'Selesai'
                      ? 'bg-emerald-100 text-emerald-800'
                      : item.status === 'Berjalan'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {item.status}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bagian: Progres KPI Bisnis */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
              Progres Capaian KPI Bisnis
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Pertumbuhan metrik finansial & operasional hasil pendampingan berkala.
            </p>
          </div>
        </div>

        {kpis.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-6 rounded-xl border border-dashed border-slate-200">
            Indikator KPI akan tampil di sini setelah ditetapkan bersama konsultan Anda.
          </p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {kpis.map((kpi) => {
            const kpiNama = kpi.nama || kpi.title || 'Indikator Bisnis';
            const baseline = kpi.nilaiAwal ?? kpi.baselineValue ?? 0;
            const target = kpi.target ?? kpi.targetValue ?? 100;
            const current = kpi.nilaiSaatIni ?? kpi.currentValue ?? 0;
            const unit = kpi.satuan || kpi.unit || '%';
            const dateStr = kpi.tanggalPembaruan || (kpi.updatedAt ? kpi.updatedAt.split('T')[0] : '-');

            let progressPct = 0;
            if (target > baseline) {
              const range = target - baseline;
              progressPct = range > 0 ? Math.round(((current - baseline) / range) * 100) : 0;
            } else if (baseline > target) {
              const range = baseline - target;
              progressPct = range > 0 ? Math.round(((baseline - current) / range) * 100) : 0;
            } else {
              progressPct = current >= target ? 100 : 0;
            }
            const displayProgress = Math.max(0, Math.min(100, progressPct));

            return (
              <div
                key={kpi.id}
                className="p-5 rounded-2xl border border-slate-200 bg-slate-50/40 space-y-3 shadow-xs"
              >
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {kpi.kategori || 'Metrik Capaian'}
                </span>
                <h4 className="text-sm font-bold text-slate-900">{kpiNama}</h4>

                <div className="grid grid-cols-3 gap-2 text-center pt-2">
                  <div className="p-2 rounded-lg bg-white border border-slate-100">
                    <div className="text-xs text-slate-500">Nilai Awal</div>
                    <div className="text-xs font-semibold text-slate-700">
                      {baseline} {unit}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-blue-50 border border-blue-100">
                    <div className="text-xs text-[#0051d5] font-semibold">Saat Ini</div>
                    <div className="text-xs font-bold text-[#00236f]">
                      {current} {unit}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-white border border-slate-100">
                    <div className="text-xs text-slate-500">Target</div>
                    <div className="text-xs font-semibold text-emerald-700">
                      {target} {unit}
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex justify-between text-xs text-slate-500 mb-1 font-medium">
                    <span>Progres</span>
                    <span className="font-bold text-[#00236f]">{displayProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-200">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        displayProgress >= 100
                          ? 'bg-emerald-600'
                          : displayProgress >= 50
                          ? 'bg-[#00236f]'
                          : 'bg-amber-600'
                      }`}
                      style={{ width: `${displayProgress}%` }}
                    />
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Diperbarui: {dateStr}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bagian: Catatan Sesi Terakhir yang Dibagikan */}
      {lastCompletedSession && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-[#00236f] text-xs font-bold uppercase tracking-wider mb-1">
                <FileText className="w-3.5 h-3.5 text-[#0051d5]" />
                Catatan Sesi Terakhir
              </div>
              <h2 className="text-xl font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                Ringkasan & Kesepakatan Bersama
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Sesi: <strong>{lastCompletedSession.agenda}</strong> • Dilaksanakan pada:{' '}
                {formatWITA(lastCompletedSession.dateTime, true)}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Catatan yang Dibagikan oleh Konsultan:
            </h4>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line font-medium">
              {lastCompletedSession.catatanDibagikan || 'Konsultan belum menambahkan rangkuman catatan untuk sesi ini.'}
            </p>
          </div>
        </div>
      )}

      {/* Bagian: Penilaian & Evaluasi Sesi Pendampingan (Feedback Klien) */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 text-xs font-bold uppercase tracking-wider mb-1">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
              Evaluasi Layanan
            </div>
            <h2 className="text-xl font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
              Beri Penilaian Sesi Pendampingan
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Masukan dan rating Anda membantu kami memastikan kualitas pendampingan selalu berdampak optimal bagi bisnis Anda.
            </p>
          </div>
        </div>

        {feedbackSuccess && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>Terima kasih! Penilaian dan feedback Anda telah berhasil disimpan untuk tim konsultan.</span>
          </div>
        )}

        {/* Feedback Input Form */}
        <form onSubmit={handleSubmitFeedback} className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pilih Sesi yang Dinilai
              </label>
              <select
                value={selectedSessionForFeedback}
                onChange={(e) => setSelectedSessionForFeedback(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white"
              >
                <option value="">Sesi Terakhir / Umum</option>
                {completedSessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.agenda} ({formatWITA(s.dateTime)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Rating Kepuasan (Bintang 1 – 5) *
              </label>
              <div className="flex items-center gap-2 pt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFeedbackRating(star)}
                    className="p-1.5 rounded-lg hover:bg-white transition cursor-pointer"
                  >
                    <Star
                      className={`w-6 h-6 transition ${
                        star <= feedbackRating
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs font-bold text-[#00236f] ml-2">
                  {feedbackRating === 5 && 'Sangat Puas & Solutif (5/5)'}
                  {feedbackRating === 4 && 'Puas (4/5)'}
                  {feedbackRating === 3 && 'Cukup (3/5)'}
                  {feedbackRating === 2 && 'Kurang Puas (2/5)'}
                  {feedbackRating === 1 && 'Perlu Peningkatan Signifikan (1/5)'}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Komentar & Masukan Tambahan
            </label>
            <textarea
              rows={3}
              value={feedbackComments}
              onChange={(e) => setFeedbackComments(e.target.value)}
              placeholder="Bagikan pengalaman, efektivitas strategi yang dibahas, atau saran untuk sesi berikutnya..."
              className="w-full p-3 border border-slate-300 rounded-xl text-xs sm:text-sm bg-white"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={feedbackSubmitting}
              className="px-5 py-2.5 bg-[#00236f] hover:bg-[#1e3a8a] text-white text-xs font-semibold rounded-xl inline-flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {feedbackSubmitting ? 'Mengirim...' : 'Kirim Penilaian'}
            </button>
          </div>
        </form>

        {/* Previous Feedback List */}
        {feedbacks.length > 0 && (
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Riwayat Feedback yang Dikirim ({feedbacks.length})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {feedbacks.map((fb) => (
                <div key={fb.id} className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-amber-400">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${
                            s <= fb.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                          }`}
                        />
                      ))}
                      <span className="text-xs font-bold text-slate-700 ml-1">
                        {fb.rating}/5
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">
                      {formatWITA(fb.createdAt)}
                    </span>
                  </div>
                  {fb.comments && (
                    <p className="text-slate-600 text-xs italic">"{fb.comments}"</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bagian: Izin Publikasi Studi Kasus Bisnis (Anonim Default) */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-900 text-xs font-bold uppercase tracking-wider mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
              Kontrol Privasi Data Anda
            </div>
            <h2 className="text-xl font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
              Izin Publikasi Studi Kasus Bisnis
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Nexus menjamin privasi penuh. Data keberhasilan dan transformasi hanya akan dijadikan materi edukasi jika Anda menyetujui, dengan pengaturan bawaan (default) disamarkan secara anonim.
            </p>
          </div>
        </div>

        {consents.length === 0 ? (
          <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-1.5">
            <Lock className="w-7 h-7 text-slate-500 mx-auto" />
            <p className="text-xs font-bold text-slate-700">Belum ada pengajuan studi kasus untuk bisnis Anda</p>
            <p className="text-xs text-slate-500">
              Seluruh data audit, KPI, dan rekam diagnosis bisnis Anda tersimpan aman dan terproteksi.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {consents.map((item) => {
              const currentAnon = consentAnonMap[item.id] !== false;
              const isApproved =
                item.status === 'Disetujui_Anonim' || item.status === 'Disetujui_Terbuka';

              return (
                <div
                  key={item.id}
                  className="p-5 sm:p-6 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/80">
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-slate-900">
                        {item.caseStudyTitle}
                      </h4>
                      <p className="text-xs text-slate-500">
                        Diajukan oleh: <span className="font-semibold">{item.requestedBy}</span> ({formatWITA(item.requestedAt)})
                      </p>
                    </div>

                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full border self-start sm:self-auto ${
                        item.status === 'Disetujui_Anonim'
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          : item.status === 'Disetujui_Terbuka'
                          ? 'bg-blue-100 text-blue-900 border-blue-300'
                          : item.status === 'Ditolak'
                          ? 'bg-red-100 text-red-900 border-red-300'
                          : 'bg-amber-100 text-amber-900 border-amber-300'
                      }`}
                    >
                      {item.status === 'Disetujui_Anonim' && '✓ Disetujui (Anonim)'}
                      {item.status === 'Disetujui_Terbuka' && '✓ Disetujui (Terbuka)'}
                      {item.status === 'Menunggu' && 'Menunggu Persetujuan Anda'}
                      {item.status === 'Ditolak' && 'Izin Ditolak'}
                    </span>
                  </div>

                  {/* Summary & Metrics */}
                  <div className="space-y-2 text-xs">
                    {item.keyMetricsAchievement && (
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                        <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                          Pencapaian yang Akan Diulas:
                        </span>
                        <p className="font-bold text-emerald-950 mt-0.5">{item.keyMetricsAchievement}</p>
                      </div>
                    )}
                    <p className="text-slate-600 leading-relaxed">{item.caseStudySummary}</p>
                  </div>

                  {/* Anonymity Controls */}
                  <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3 text-xs">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <EyeOff className="w-4 h-4 text-purple-600" />
                      <span>Pilihan Tingkat Privasi Identitas:</span>
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-start gap-2.5 cursor-pointer p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition">
                        <input
                          type="radio"
                          name={`anon-${item.id}`}
                          checked={currentAnon}
                          onChange={() => setConsentAnonMap({ ...consentAnonMap, [item.id]: true })}
                          className="mt-0.5 text-[#00236f] focus:ring-[#00236f]"
                        />
                        <div>
                          <div className="font-bold text-slate-900">
                            Gunakan Nama Samaran / Anonim (Disarankan)
                          </div>
                          <div className="text-xs text-slate-500">
                            Nama bisnis diubah menjadi: "{item.anonymizedName}", nama founder menjadi: "{item.anonymizedOwnerName}".
                          </div>
                        </div>
                      </label>

                      <label className="flex items-start gap-2.5 cursor-pointer p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition">
                        <input
                          type="radio"
                          name={`anon-${item.id}`}
                          checked={!currentAnon}
                          onChange={() => setConsentAnonMap({ ...consentAnonMap, [item.id]: false })}
                          className="mt-0.5 text-[#00236f] focus:ring-[#00236f]"
                        />
                        <div>
                          <div className="font-bold text-slate-900">
                            Izinkan Penyebutan Nama Terbuka
                          </div>
                          <div className="text-xs text-slate-500">
                            Menampilkan brand "{client.namaBisnis}" dan founder "{client.namaPemilik}" secara terbuka.
                          </div>
                        </div>
                      </label>
                    </div>

                    {/* Notes from client */}
                    <div className="pt-2">
                      <label className="block text-slate-700 font-semibold mb-1">
                        Catatan Khusus / Batasan dari Anda (Opsional):
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Jangan sebutkan nominal omzet aktual, cukup persentase kenaikan..."
                        value={consentNotesMap[item.id] || ''}
                        onChange={(e) =>
                          setConsentNotesMap({ ...consentNotesMap, [item.id]: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50"
                      />
                    </div>
                  </div>

                  {/* Decision Action Buttons */}
                  <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
                    <button
                      onClick={() => handleRespondConsent(item.id, 'Ditolak')}
                      className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition cursor-pointer"
                    >
                      Tolak Izin Publikasi
                    </button>

                    <button
                      onClick={() =>
                        handleRespondConsent(
                          item.id,
                          currentAnon ? 'Disetujui_Anonim' : 'Disetujui_Terbuka'
                        )
                      }
                      className="px-5 py-2 bg-[#00236f] hover:bg-[#1e3a8a] text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>
                        {currentAnon ? 'Setujui dengan Nama Anonim' : 'Setujui dengan Nama Terbuka'}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Kirim Bukti Pengerjaan */}
      {submittingTask && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 my-auto">
            <h3 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
              Unggah / Tautkan Bukti Eksekusi Tugas
            </h3>
            <p className="text-xs text-slate-500">Tugas: "{submittingTask.title}"</p>

            <form onSubmit={handleSaveProof} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tautan Bukti (Google Drive, Docs, Foto, dll) *
                </label>
                <input
                  type="url"
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Pelaksanaan
                </label>
                <textarea
                  rows={3}
                  value={proofNotes}
                  onChange={(e) => setProofNotes(e.target.value)}
                  placeholder="Contoh: Sudah diterapkan pada outlet Canggu bersama head barista..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs sm:text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSubmittingTask(null)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#00236f] text-white text-xs font-semibold rounded-xl"
                >
                  Kirim & Tandai Selesai
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Avatar Picker Modal */}
      {showAvatarModal && (
        <AvatarPickerModal
          isOpen={showAvatarModal}
          onClose={() => setShowAvatarModal(false)}
          currentAvatarUrl={userProfile?.avatarUrl || client.logoUrl}
          userDisplayName={userProfile?.displayName || client.namaPemilik}
          userRole="Klien UKM"
          onSaveAvatar={async (newAvatarUrl) => {
            await updateAvatar(newAvatarUrl);
            setClient((prev) => (prev ? { ...prev, logoUrl: newAvatarUrl } : null));
          }}
        />
      )}
    </div>
  );
};
