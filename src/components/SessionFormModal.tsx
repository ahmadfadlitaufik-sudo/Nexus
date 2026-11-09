import { dateWITA } from '../utils/formatters';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  X,
  Calendar,
  Clock,
  Video,
  Lock,
  Eye,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  ShieldAlert,
  Sparkles,
  Check,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { Session, SessionInternal, Client, TaskAssigneeRole, UserProfile, Group } from '../types';
import {
  saveSessionWithInternalAndTasks,
  getSessionInternal,
  getClients,
  getSessions,
  getUsers,
  getGroups,
} from '../services/db';

interface SessionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId?: string;
  sessionId?: string;
  onSessionSaved: () => void;
}

interface ActionItemDraft {
  title: string;
  assigneeName: string;
  assigneeRole: TaskAssigneeRole;
  deadline: string;
}

interface AIDraftData {
  catatan_dibagikan: string;
  catatan_internal: string;
  key_observations: string;
  usulan_action_items: ActionItemDraft[];
}

export const SessionFormModal: React.FC<SessionFormModalProps> = ({
  isOpen,
  onClose,
  clientId: initialClientId,
  sessionId,
  onSessionSaved,
}) => {
  const { userProfile } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [consultants, setConsultants] = useState<UserProfile[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [clientId, setClientId] = useState(initialClientId || '');
  const [consultantId, setConsultantId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [agenda, setAgenda] = useState('');
  const [jenis, setJenis] = useState<'Individu' | 'Grup'>('Individu');
  const [dateTime, setDateTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(90);
  const [meetingUrl, setMeetingUrl] = useState('');
  const [status, setStatus] = useState<'Terjadwal' | 'Selesai' | 'Dibatalkan'>('Terjadwal');
  const [catatanDibagikan, setCatatanDibagikan] = useState('');
  const [catatanInternal, setCatatanInternal] = useState('');
  const [keyObservations, setKeyObservations] = useState('');

  // Dynamic action items
  const [actionItems, setActionItems] = useState<ActionItemDraft[]>([
    {
      title: '',
      assigneeName: '',
      assigneeRole: 'Klien',
      deadline: dateWITA(Date.now() + 7 * 86400000),
    },
  ]);

  // AI Summarization State
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [aiDraft, setAiDraft] = useState<AIDraftData | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const role = userProfile?.role || 'owner';

  useEffect(() => {
    async function loadInitial() {
      try {
        const cList = await getClients();
        setClients(cList);

        const gList = await getGroups();
        setGroups(gList);

        const uList = await getUsers();
        const consList = uList.filter(
          (u: UserProfile) =>
            u.role === 'owner' ||
            u.role === 'consultant' ||
            u.role === 'konsultan' ||
            u.role === 'tim_grup' ||
            u.role === 'tim_konten' ||
            u.role === 'staf_operasional'
        );
        setConsultants(consList);

        let activeClientId = initialClientId || clientId;
        if (!activeClientId && cList.length > 0) {
          activeClientId = cList[0].id;
          setClientId(activeClientId);
        }

        if (sessionId) {
          const allSessions = await getSessions();
          const found = allSessions.find((s) => s.id === sessionId);
          if (found) {
            setClientId(found.clientId);
            setConsultantId(found.consultantId);
            setAgenda(found.agenda);
            setJenis(found.jenis || 'Individu');
            setDateTime(found.dateTime.substring(0, 16));
            setDurationMinutes(found.durationMinutes);
            setMeetingUrl(found.meetingUrl);
            setStatus(found.status);
            setCatatanDibagikan(found.catatanDibagikan || '');
          }

          if (role === 'owner' || role === 'consultant' || role === 'konsultan') {
            const internal = await getSessionInternal(sessionId);
            if (internal) {
              setCatatanInternal(internal.catatanInternal || '');
              setKeyObservations(internal.keyObservations || '');
            }
          }
        } else {
          const targetClient = cList.find((c) => c.id === activeClientId);
          setConsultantId(targetClient?.primaryConsultantId || userProfile?.id || consList[0]?.id || 'cons-1');
          setJenis('Individu');
          const tomorrow = new Date(Date.now() + 24 * 86400000);
          tomorrow.setHours(10, 0, 0, 0);
          setDateTime(tomorrow.toISOString().substring(0, 16));
          setMeetingUrl('https://meet.google.com/nxg-wita-session');
        }
      } catch (err) {
        console.error('Error loading session form:', err);
      }
    }
    if (isOpen) {
      loadInitial();
      setAiDraft(null);
      setAiError(null);
    }
  }, [isOpen, sessionId, initialClientId, role]);

  if (!isOpen) return null;

  const handleAddActionItem = () => {
    setActionItems([
      ...actionItems,
      {
        title: '',
        assigneeName: '',
        assigneeRole: 'Klien',
        deadline: dateWITA(Date.now() + 7 * 86400000),
      },
    ]);
  };

  const handleRemoveActionItem = (index: number) => {
    setActionItems(actionItems.filter((_, i) => i !== index));
  };

  const handleActionItemChange = (index: number, field: keyof ActionItemDraft, value: any) => {
    const updated = [...actionItems];
    updated[index] = { ...updated[index], [field]: value };
    setActionItems(updated);
  };

  // AI Summarization Call to Backend
  const handleSummarizeWithAI = async () => {
    setAiError(null);
    const combinedNotes = `${catatanInternal ? `[Catatan Internal]: ${catatanInternal}\n` : ''}${
      catatanDibagikan ? `[Catatan Dibagikan]: ${catatanDibagikan}\n` : ''
    }${keyObservations ? `[Key Observations]: ${keyObservations}\n` : ''}`;

    if (!combinedNotes.trim() && !agenda.trim()) {
      setAiError(
        'Silakan isi agenda atau salah satu kolom catatan terlebih dahulu sebelum meringkas dengan AI.'
      );
      return;
    }

    setIsSummarizing(true);
    try {
      const activeClient = clients.find((c) => c.id === clientId);
      const res = await fetch('/api/ai/summarize-session', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agenda: agenda.trim(),
          notes: combinedNotes.trim(),
          clientName: activeClient ? `${activeClient.namaBisnis} (${activeClient.namaPemilik})` : '',
          consultantName: userProfile?.displayName || 'Konsultan Bisnis',
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal memproses AI');
      }

      const data = json.data;
      setAiDraft({
        catatan_dibagikan: data.catatan_dibagikan || '',
        catatan_internal: data.catatan_internal || '',
        key_observations: data.key_observations || '',
        usulan_action_items: (data.usulan_action_items || []).map((item: any) => ({
          title: item.title || '',
          assigneeName: item.assigneeName || activeClient?.namaPemilik || 'Klien',
          assigneeRole: item.assigneeRole || 'Klien',
          deadline:
            item.deadline || dateWITA(Date.now() + 7 * 86400000),
        })),
      });
    } catch (err: any) {
      console.error('AI Summarization error:', err);
      setAiError(err.message || 'Terjadi kesalahan saat memproses ringkasan dengan Gemini AI.');
    } finally {
      setIsSummarizing(false);
    }
  };

  // Approve and Apply AI Draft
  const handleApproveAiDraft = () => {
    if (!aiDraft) return;
    setCatatanDibagikan(aiDraft.catatan_dibagikan);
    setCatatanInternal(aiDraft.catatan_internal);
    if (aiDraft.key_observations) {
      setKeyObservations(aiDraft.key_observations);
    }
    if (aiDraft.usulan_action_items && aiDraft.usulan_action_items.length > 0) {
      setActionItems(aiDraft.usulan_action_items);
    }
    setAiDraft(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!agenda.trim()) {
      setError('Agenda sesi wajib diisi.');
      return;
    }
    if (!clientId) {
      setError('Pilih klien terlebih dahulu.');
      return;
    }

    setIsSubmitting(true);
    try {
      const activeClient = clients.find((c) => c.id === clientId);
      const sessId = sessionId || `sess-${Date.now()}`;
      const sessionData: Session = {
        id: sessId,
        clientId,
        consultantId: consultantId || activeClient?.primaryConsultantId || userProfile?.id || 'cons-1',
        programId: activeClient?.programId || 'prog-fundamental',
        groupId: jenis === 'Grup' ? groupId || undefined : undefined,
        group_id: jenis === 'Grup' ? groupId || undefined : undefined,
        dateTime: dateTime ? new Date(dateTime).toISOString() : new Date().toISOString(),
        durationMinutes: Number(durationMinutes),
        meetingUrl: meetingUrl.trim(),
        agenda: agenda.trim(),
        jenis,
        status,
        catatanDibagikan: catatanDibagikan.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const validActionItems = actionItems.filter((item) => item.title.trim().length > 0);

      await saveSessionWithInternalAndTasks(
        {
          session: sessionData,
          catatanInternal: catatanInternal.trim(),
          keyObservations: keyObservations.trim(),
          actionItems: validActionItems,
        },
        userProfile?.displayName || 'Konsultan',
        userProfile?.role === 'owner' ? 'Owner' : 'Konsultan'
      );

      onSessionSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Gagal menyimpan sesi dan catatan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-['Inter']">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in zoom-in-95">
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#00236f] text-white flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                {sessionId ? 'Edit & Notulensi Sesi Pendampingan' : 'Jadwalkan & Catat Sesi Baru'}
              </h2>
              <p className="text-xs text-slate-500">
                Form terintegrasi: Agenda, dua kolom catatan (internal & dibagikan), ringkas dengan AI, dan otomatisasi tugas.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="m-6 mb-0 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {aiError && (
          <div className="m-6 mb-0 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>{aiError}</span>
          </div>
        )}

        {/* DRAF AI PREVIEW PANEL (Shown when AI returns a draft) */}
        {aiDraft && (
          <div className="m-6 p-5 rounded-2xl border-2 border-[#0051d5] bg-blue-50/40 space-y-4 animate-in slide-in-from-top-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-blue-200">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[#0051d5] text-white">
                  <Sparkles className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                    Usulan Draf AI (Gemini 3.8 Flash)
                  </h4>
                  <p className="text-xs text-slate-600">
                    Tinjau atau sesuaikan draf ringkasan dan usulan tugas di bawah ini, lalu tekan <strong>Setujui</strong> untuk menerapkannya ke formulir.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAiDraft(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-white transition cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Batal Draf
                </button>
                <button
                  type="button"
                  onClick={handleApproveAiDraft}
                  className="px-4 py-1.5 rounded-lg bg-[#0051d5] hover:bg-[#003ea8] text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  Setujui & Terapkan Draf AI
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-white border border-blue-200 space-y-1.5">
                <div className="font-bold text-[#00236f] flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  Draf Catatan Dibagikan (Klien):
                </div>
                <textarea
                  rows={4}
                  value={aiDraft.catatan_dibagikan}
                  onChange={(e) =>
                    setAiDraft({ ...aiDraft, catatan_dibagikan: e.target.value })
                  }
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-amber-200 space-y-1.5">
                <div className="font-bold text-amber-900 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-amber-700" />
                  Draf Catatan Internal (Tim Konsultan):
                </div>
                <textarea
                  rows={4}
                  value={aiDraft.catatan_internal}
                  onChange={(e) =>
                    setAiDraft({ ...aiDraft, catatan_internal: e.target.value })
                  }
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            {/* Usulan Action Items */}
            {aiDraft.usulan_action_items.length > 0 && (
              <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2">
                <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Usulan Action Items Draf ({aiDraft.usulan_action_items.length} tugas terdeteksi):
                </div>
                <div className="space-y-2">
                  {aiDraft.usulan_action_items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-[#00236f] flex items-center justify-center font-bold text-xs shrink-0">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => {
                          const updated = [...aiDraft.usulan_action_items];
                          updated[idx].title = e.target.value;
                          setAiDraft({ ...aiDraft, usulan_action_items: updated });
                        }}
                        className="flex-1 px-2 py-1 border border-slate-200 rounded-lg text-xs"
                      />
                      <span className="px-2 py-1 bg-slate-100 rounded text-xs font-medium text-slate-600">
                        {item.assigneeRole}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSave} className="p-6 space-y-6">
          {/* Section 1: Informasi Dasar Sesi */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Klien Pendampingan *
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                disabled={!!initialClientId}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0051d5]"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.namaBisnis} ({c.namaPemilik})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Konsultan Pendamping *
              </label>
              <select
                value={consultantId}
                onChange={(e) => setConsultantId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0051d5]"
              >
                {consultants.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.displayName} ({c.role === 'owner' ? 'Owner / Lead' : 'Konsultan'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jenis Sesi *
              </label>
              <select
                value={jenis}
                onChange={(e) => setJenis(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0051d5]"
              >
                <option value="Individu">Individu (1-on-1)</option>
                <option value="Grup">Grup / Mastermind</option>
              </select>
            </div>

            {jenis === 'Grup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pilih Grup Mastermind
                </label>
                <select
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0051d5]"
                >
                  <option value="">-- Pilih Grup Terdaftar --</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status Sesi *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0051d5]"
              >
                <option value="Terjadwal">Terjadwal</option>
                <option value="Selesai">Selesai (Telah Terlaksana)</option>
                <option value="Dibatalkan">Dibatalkan</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Agenda Pembahasan Sesi *
              </label>
              <input
                type="text"
                value={agenda}
                onChange={(e) => setAgenda(e.target.value)}
                placeholder="Contoh: Audit COGS Bahan Baku & Pemisahan Arus Kas Outlet"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0051d5]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal & Jam Sesi (WITA - UTC+8) *
              </label>
              <input
                type="datetime-local"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0051d5]"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Durasi (Menit)
                </label>
                <input
                  type="number"
                  min="30"
                  step="15"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0051d5]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Link Meet WFA
                </label>
                <input
                  type="url"
                  value={meetingUrl}
                  onChange={(e) => setMeetingUrl(e.target.value)}
                  placeholder="https://meet.google.com/..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0051d5]"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Dua Kolom Catatan (INTERNAL vs DIBAGIKAN) + TOMBOL RINGKAS DENGAN AI */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                  Dua Kolom Catatan Sesi
                </h3>
                <span className="text-xs text-slate-500">
                  Pemisahan hak akses: Tim Konsultan (Rahasia) vs Klien (Dibagikan)
                </span>
              </div>

              {/* Tombol Ringkas dengan AI */}
              <button
                type="button"
                onClick={handleSummarizeWithAI}
                disabled={isSummarizing}
                className="inline-flex items-center gap-1.5 bg-gradient-to-r from-[#00236f] to-[#0051d5] hover:from-[#172554] hover:to-[#003ea8] text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
              >
                {isSummarizing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menganalisis Catatan dengan Gemini...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-blue-200" />
                    <span>Ringkas dengan AI</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Kolom 1: Catatan Internal (Hanya Tim) */}
              <div className="p-4 rounded-xl border border-amber-300/80 bg-amber-50/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <Lock className="w-3.5 h-3.5 text-amber-700" />
                    <span>Kolom Catatan Internal (HANYA TIM)</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-200 text-amber-900 uppercase">
                    Rahasia dari Klien
                  </span>
                </div>
                <p className="text-xs text-amber-800/80 leading-relaxed">
                  Catatan ini hanya dapat diakses oleh Owner dan Konsultan yang ditugaskan.
                </p>
                <textarea
                  rows={5}
                  value={catatanInternal}
                  onChange={(e) => setCatatanInternal(e.target.value)}
                  placeholder="Observasi internal: dinamika keluarga pemilik, resistensi karyawan, potensi fraud kas lapangan..."
                  className="w-full p-2.5 border border-amber-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />

                <div>
                  <label className="block text-xs font-semibold text-amber-900 mb-1">
                    Key Observations / Catatan Singkat Strategis
                  </label>
                  <input
                    type="text"
                    value={keyObservations}
                    onChange={(e) => setKeyObservations(e.target.value)}
                    placeholder="Contoh: Klien butuh dorongan ekstra dalam menegakkan SOP barista"
                    className="w-full px-2.5 py-1.5 border border-amber-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Kolom 2: Catatan Dibagikan (Terlihat Klien) */}
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#00236f]">
                    <Eye className="w-3.5 h-3.5 text-[#0051d5]" />
                    <span>Kolom Catatan Dibagikan (TERLIHAT KLIEN)</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-blue-100 text-[#00236f] uppercase">
                    Muncul di Portal Klien
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Catatan ini langsung tampil di Portal Klien sebagai resume pertemuan resmi dan arahan.
                </p>
                <textarea
                  rows={8}
                  value={catatanDibagikan}
                  onChange={(e) => setCatatanDibagikan(e.target.value)}
                  placeholder="Resume hasil sesi: penurunan food waste tercapai 3.9%, langkah perbaikan SOP minggu ini..."
                  className="w-full p-2.5 border border-blue-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0051d5]"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Penambahan Action Items */}
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                  Action Items Sesi (Otomatis Menjadi Tugas)
                </h3>
                <p className="text-xs text-slate-500">
                  Setiap item yang ditambahkan di sini akan otomatis terdaftar sebagai entitas Tugas di tab Tugas & Portal Klien.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddActionItem}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#0051d5] hover:text-[#00236f] bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Action Item
              </button>
            </div>

            <div className="space-y-3 mt-3">
              {actionItems.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-center gap-3"
                >
                  <div className="w-full sm:flex-1">
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => handleActionItemChange(idx, 'title', e.target.value)}
                      placeholder={`Judul tugas/action item #${idx + 1}`}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0051d5]"
                    />
                  </div>

                  <div className="w-full sm:w-40">
                    <input
                      type="text"
                      value={item.assigneeName}
                      onChange={(e) => handleActionItemChange(idx, 'assigneeName', e.target.value)}
                      placeholder="Nama PIC (cth: Made)"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0051d5]"
                    />
                  </div>

                  <div className="w-full sm:w-32">
                    <select
                      value={item.assigneeRole}
                      onChange={(e) => handleActionItemChange(idx, 'assigneeRole', e.target.value)}
                      className="w-full px-2 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0051d5]"
                    >
                      <option value="Klien">Klien</option>
                      <option value="Konsultan">Konsultan</option>
                      <option value="Tim">Tim</option>
                    </select>
                  </div>

                  <div className="w-full sm:w-36">
                    <input
                      type="date"
                      value={item.deadline}
                      onChange={(e) => handleActionItemChange(idx, 'deadline', e.target.value)}
                      className="w-full px-2 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0051d5]"
                    />
                  </div>

                  {actionItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveActionItem(idx)}
                      className="p-2 text-slate-500 hover:text-red-600 rounded-lg transition cursor-pointer"
                      title="Hapus baris"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-[#00236f] hover:bg-[#1e3a8a] text-white text-xs font-semibold transition shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Menyimpan Sesi...' : 'Simpan Sesi & Buat Tugas'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
