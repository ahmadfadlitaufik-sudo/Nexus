import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Sun,
  Moon,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Target,
  ArrowRight,
  Plus,
  Flame,
  Check,
  RotateCcw,
  Video,
  FileText,
  Share2,
  X,
  HelpCircle,
  Send,
  Building2,
  Users,
} from 'lucide-react';
import { TeamCheckin, WorkStatus, PlanItemStatus, PlanItem } from '../types';
import {
  getTeamCheckinByUserAndDate,
  saveTeamCheckin,
  getDailyAgendasForUser,
  AutoDailyAgenda,
  savePlanItem,
  getPlanItems,
  updatePlanItemStatus,
} from '../services/db';
import { formatWITA, todayWITA } from '../utils/formatters';

interface TodayPageProps {
  onNavigate?: (tab: string) => void;
}

export const TodayPage: React.FC<TodayPageProps> = ({ onNavigate }) => {
  const { userProfile } = useAuth();
  const todayDateStr = todayWITA();

  const [loading, setLoading] = useState(true);
  const [checkin, setCheckin] = useState<TeamCheckin | null>(null);
  const [agendas, setAgendas] = useState<AutoDailyAgenda[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Morning check-in Form State
  const [workStatus, setWorkStatus] = useState<WorkStatus>('WFA');
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [p3, setP3] = useState('');
  const [blockers, setBlockers] = useState('');

  // Evening checkout Form State
  const [eveningNotes, setEveningNotes] = useState('');
  const [pStatuses, setPStatuses] = useState<Record<number, PlanItemStatus>>({
    0: 'Belum',
    1: 'Belum',
    2: 'Belum',
  });

  const loadTodayData = async () => {
    if (!userProfile) return;
    setLoading(true);
    try {
      const currentCheckin = await getTeamCheckinByUserAndDate(userProfile.id, todayDateStr);
      setCheckin(currentCheckin);

      if (currentCheckin) {
        setWorkStatus(currentCheckin.workStatus);
        setP1(currentCheckin.priorities[0] || '');
        setP2(currentCheckin.priorities[1] || '');
        setP3(currentCheckin.priorities[2] || '');
        setBlockers(currentCheckin.blockers || '');
        setEveningNotes(currentCheckin.checkoutNotes || '');
        if (currentCheckin.priorityStatuses) {
          setPStatuses(currentCheckin.priorityStatuses);
        }
      }

      // Load automatic daily agendas from sessions, tasks, content
      const autoAgendas = await getDailyAgendasForUser(
        userProfile.id,
        todayDateStr,
        userProfile.role
      );
      setAgendas(autoAgendas);
    } catch (err) {
      console.error('Error loading today data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTodayData();
  }, [userProfile]);

  const handleSaveMorningCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;

    const priorities = [p1.trim(), p2.trim(), p3.trim()].filter(Boolean);
    if (priorities.length === 0) {
      alert('Mohon isi minimal 1 prioritas utama hari ini.');
      return;
    }

    const checkinId = `checkin-${userProfile.id}-${todayDateStr}`;
    const newCheckin: TeamCheckin = {
      id: checkinId,
      userId: userProfile.id,
      userName: userProfile.displayName,
      userRole: userProfile.role,
      userAvatar: userProfile.avatarUrl,
      date: todayDateStr,
      workStatus,
      priorities,
      blockers: blockers.trim(),
      morningCheckinAt: checkin?.morningCheckinAt || new Date().toISOString(),
      eveningCheckoutAt: checkin?.eveningCheckoutAt,
      checkoutNotes: checkin?.checkoutNotes,
      priorityStatuses: pStatuses,
      completedCount: checkin?.completedCount || 0,
      helpOffers: checkin?.helpOffers || [],
      createdAt: checkin?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveTeamCheckin(newCheckin);
      setCheckin(newCheckin);
      setToastMessage('Check-in pagi berhasil disimpan & disinkronkan ke Papan Tim!');
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error('Error saving checkin:', err);
    }
  };

  const handleAddAgendaToPriority = (agenda: AutoDailyAgenda) => {
    const textToAdd = `${agenda.title} (${agenda.clientOrGroupName})`;
    if (!p1) {
      setP1(textToAdd);
    } else if (!p2) {
      setP2(textToAdd);
    } else if (!p3) {
      setP3(textToAdd);
    } else {
      setP1(textToAdd); // replace first if full
    }

    setToastMessage(`"${agenda.title}" dimasukkan ke daftar prioritas hari ini.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSaveEveningCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile || !checkin) return;

    const completed = Object.values(pStatuses).filter((s) => s === 'Selesai').length;

    const updatedCheckin: TeamCheckin = {
      ...checkin,
      eveningCheckoutAt: new Date().toISOString(),
      checkoutNotes: eveningNotes.trim(),
      priorityStatuses: pStatuses,
      completedCount: completed,
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveTeamCheckin(updatedCheckin);
      setCheckin(updatedCheckin);
      setToastMessage('Check-out sore berhasil disimpan. Kerja bagus hari ini!');
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error('Error saving checkout:', err);
    }
  };

  const hasMorningCheckin = !!checkin?.morningCheckinAt;
  const hasEveningCheckout = !!checkin?.eveningCheckoutAt;

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center justify-between text-xs font-semibold animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="p-1 hover:text-emerald-200 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#00236f] via-[#1e3a8a] to-[#0051d5] rounded-2xl p-6 sm:p-8 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/10 text-blue-100 text-xs font-semibold backdrop-blur-xs mb-3">
            <Sun className="w-3.5 h-3.5 text-amber-300" />
            <span>Daily WFA Standup &amp; Execution Rhythm</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-['Plus_Jakarta_Sans'] tracking-tight">
            Hari Ini • Standup Harian
          </h1>
          <p className="text-sm text-blue-100 mt-1.5 max-w-2xl leading-relaxed">
            Fokuskan 3 prioritas terbesar Anda, sinkronkan agenda otomatis dari sesi &amp; tugas, serta lakukan evaluasi pencapaian saat check-out sore.
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/20 flex items-center gap-3 shrink-0">
          <Calendar className="w-5 h-5 text-blue-200" />
          <div>
            <div className="text-[10px] uppercase font-bold text-blue-200">Zona Waktu Kerja:</div>
            <div className="text-xs font-bold text-white">{formatWITA(new Date().toISOString(), true)}</div>
          </div>
        </div>
      </div>

      {/* Status Progress Badge Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Morning Check-in Status */}
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between transition ${
            hasMorningCheckin
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
              : 'bg-amber-50/70 border-amber-200 text-amber-950'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                hasMorningCheckin ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}
            >
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold">Check-in Pagi (Standup)</div>
              <div className="text-[11px] text-slate-600">
                {hasMorningCheckin
                  ? `Selesai pada ${formatWITA(checkin?.morningCheckinAt)} • Status: ${checkin?.workStatus}`
                  : 'Belum dilakukan hari ini. Mohon tentukan prioritas Anda.'}
              </div>
            </div>
          </div>

          <span
            className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
              hasMorningCheckin ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'
            }`}
          >
            {hasMorningCheckin ? 'Sudah Check-In' : 'Menunggu'}
          </span>
        </div>

        {/* Evening Check-out Status */}
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between transition ${
            hasEveningCheckout
              ? 'bg-purple-50/70 border-purple-200 text-purple-950'
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                hasEveningCheckout ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-500'
              }`}
            >
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold">Check-out Sore (Refleksi)</div>
              <div className="text-[11px] text-slate-500">
                {hasEveningCheckout
                  ? `Terekam pada ${formatWITA(checkin?.eveningCheckoutAt)} • ${checkin?.completedCount || 0} Prioritas Tuntas`
                  : 'Lakukan di akhir jam kerja untuk review 3 prioritas.'}
              </div>
            </div>
          </div>

          <span
            className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
              hasEveningCheckout ? 'bg-purple-200 text-purple-900' : 'bg-slate-200 text-slate-600'
            }`}
          >
            {hasEveningCheckout ? 'Sudah Check-Out' : 'Sore Hari'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT 2 COLS: CHECK-IN PAGI & CHECK-OUT SORE */}
        <div className="lg:col-span-2 space-y-6">
          {/* SECTION 1: CHECK-IN PAGI */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                  <Sun className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                    1. Check-in Pagi &amp; 3 Prioritas Utama
                  </h3>
                  <p className="text-[11px] text-slate-500">Tentukan status ketersediaan dan target terpenting hari ini</p>
                </div>
              </div>

              {hasMorningCheckin && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Tersimpan
                </span>
              )}
            </div>

            <form onSubmit={handleSaveMorningCheckin} className="space-y-4 text-xs">
              {/* Status Kerja */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Status Ketersediaan Kerja Hari Ini:
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['WFA', 'Tidak tersedia', 'Izin'] as WorkStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setWorkStatus(st)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        workStatus === st
                          ? st === 'WFA'
                            ? 'bg-[#00236f] text-white border-[#00236f] shadow-xs'
                            : st === 'Izin'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-slate-700 text-white border-slate-700 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{st}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3 Prioritas Utama */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700">
                    3 Prioritas Utama Hari Ini <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400">Pilih dari agenda samping atau ketik manual</span>
                </div>

                {/* Priority 1 */}
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-[#00236f] font-bold text-xs flex items-center justify-center shrink-0">
                    1
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="Prioritas #1 (Contoh: Sesi Standarisasi SOP Dapur Kopi Senja)"
                    value={p1}
                    onChange={(e) => setP1(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00236f]/20 focus:border-[#00236f]"
                  />
                </div>

                {/* Priority 2 */}
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-[#00236f] font-bold text-xs flex items-center justify-center shrink-0">
                    2
                  </span>
                  <input
                    type="text"
                    placeholder="Prioritas #2 (Contoh: Verifikasi Bukti Tugas & Form Kasir)"
                    value={p2}
                    onChange={(e) => setP2(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00236f]/20 focus:border-[#00236f]"
                  />
                </div>

                {/* Priority 3 */}
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-[#00236f] font-bold text-xs flex items-center justify-center shrink-0">
                    3
                  </span>
                  <input
                    type="text"
                    placeholder="Prioritas #3 (Contoh: Draf Modul Audit Kebersihan di Perpustakaan)"
                    value={p3}
                    onChange={(e) => setP3(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00236f]/20 focus:border-[#00236f]"
                  />
                </div>
              </div>

              {/* Kendala / Blockers */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Kendala / Butuh Bantuan Rekan Tim? (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Tuliskan jika ada kendala teknis, klien butuh follow-up khusus, atau butuh bantuan koordinasi..."
                  value={blockers}
                  onChange={(e) => setBlockers(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00236f]/20 focus:border-[#00236f]"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#00236f] hover:bg-[#1e3a8a] text-white font-bold rounded-xl shadow-xs transition cursor-pointer inline-flex items-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{hasMorningCheckin ? 'Perbarui Check-in Pagi' : 'Kirim Check-in Pagi'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* SECTION 2: CHECK-OUT SORE */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-900 flex items-center justify-center font-bold">
                  <Moon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                    2. Check-out Sore &amp; Refleksi Capaian
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Tandai status tiap prioritas (Selesai atau Pindah ke besok) dan catatan singkat
                  </p>
                </div>
              </div>

              {hasEveningCheckout && (
                <span className="text-[10px] font-bold text-purple-800 bg-purple-100 px-2.5 py-0.5 rounded-full border border-purple-200">
                  Sudah Check-out
                </span>
              )}
            </div>

            <form onSubmit={handleSaveEveningCheckout} className="space-y-4 text-xs">
              {/* Prioritas Status Review */}
              <div className="space-y-3">
                <label className="block font-bold text-slate-700">
                  Hasil Eksekusi 3 Prioritas Hari Ini:
                </label>

                {[p1, p2, p3].map((pText, idx) => {
                  if (!pText) return null;
                  const currentSt = pStatuses[idx] || 'Belum';

                  return (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-[#00236f] text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-slate-800 text-xs truncate">
                          {pText}
                        </span>
                      </div>

                      {/* Status Toggle Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setPStatuses({ ...pStatuses, [idx]: 'Selesai' })}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                            currentSt === 'Selesai'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <Check className="w-3 h-3" />
                          <span>Selesai</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPStatuses({ ...pStatuses, [idx]: 'Pindah ke besok' })}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                            currentSt === 'Pindah ke besok'
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Pindah ke Besok</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Catatan Singkat Sore */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Catatan Refleksi &amp; Ringkasan Hasil Hari Ini:
                </label>
                <textarea
                  rows={2.5}
                  placeholder="Ceritakan ringkas pencapaian utama, kendala yang teratasi, atau rencana tindak lanjut..."
                  value={eveningNotes}
                  onChange={(e) => setEveningNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00236f]/20 focus:border-[#00236f]"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-purple-900 hover:bg-purple-950 text-white font-bold rounded-xl shadow-xs transition cursor-pointer inline-flex items-center gap-2"
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>Kirim Check-out Sore</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* RIGHT 1 COL: AGENDA HARI INI OTOMATIS */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#00236f] flex items-center justify-center font-bold">
                  <Flame className="w-4 h-4 text-orange-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                    Agenda Hari Ini
                  </h3>
                  <p className="text-[11px] text-slate-500">Terisi otomatis dari sesi, tugas &amp; konten</p>
                </div>
              </div>
            </div>

            {agendas.length === 0 ? (
              <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-1.5">
                <Calendar className="w-7 h-7 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">Tidak ada agenda terjadwal hari ini</p>
                <p className="text-[11px] text-slate-400">
                  Anda dapat menyusun prioritas manual di panel check-in.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {agendas.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:bg-white hover:shadow-xs transition space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          item.type === 'session'
                            ? 'bg-blue-100 text-blue-900 border border-blue-200'
                            : item.type === 'task'
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : 'bg-purple-100 text-purple-900 border border-purple-200'
                        }`}
                      >
                        {item.type === 'session'
                          ? 'Sesi Konsultasi'
                          : item.type === 'task'
                          ? 'Tugas Jatuh Tempo'
                          : 'Jadwal Konten'}
                      </span>

                      <span className="text-[10px] text-slate-500 font-semibold">
                        {item.timeOrDeadline ? formatWITA(item.timeOrDeadline) : 'Hari Ini'}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 leading-snug">{item.title}</h4>

                    <div className="text-[11px] text-slate-500 flex items-center justify-between">
                      <span className="font-semibold text-slate-700 truncate max-w-[130px]">
                        {item.clientOrGroupName}
                      </span>

                      <button
                        onClick={() => handleAddAgendaToPriority(item)}
                        className="inline-flex items-center gap-1 text-[10px] font-bold bg-[#00236f] hover:bg-[#1e3a8a] text-white px-2.5 py-1 rounded-lg transition cursor-pointer shadow-xs"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Jadikan prioritas</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Link to Papan Tim */}
            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={() => onNavigate && onNavigate('team-board')}
                className="w-full inline-flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-blue-50 text-[#00236f] hover:bg-blue-100 text-xs font-bold transition cursor-pointer"
              >
                <span>Lihat Papan Standup Seluruh Tim</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
