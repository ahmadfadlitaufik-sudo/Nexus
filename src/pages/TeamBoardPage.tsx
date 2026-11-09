import { UserAvatar } from '../components/UserAvatar';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Sun,
  Moon,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  HeartHandshake,
  Bell,
  Send,
  MessageSquare,
  ShieldCheck,
  TrendingUp,
  X,
  UserCheck,
  Check,
  RotateCcw,
  BarChart3,
  HelpCircle,
  Eye,
  EyeOff,
  Lock,
} from 'lucide-react';
import {
  TeamCheckin,
  UserProfile,
  WorkStatus,
  HelpOffer,
  WeeklyTeamRecap,
  WeeklyMemberRecapItem,
} from '../types';
import {
  getAllUsers,
  getTeamCheckins,
  addHelpOfferToCheckin,
  getWeeklyTeamRecap,
} from '../services/db';
import { formatWITA, todayWITA } from '../utils/formatters';

export const TeamBoardPage: React.FC = () => {
  const { userProfile } = useAuth();
  const isOwner = userProfile?.role === 'owner';
  const todayDateStr = todayWITA();

  const [activeTab, setActiveTab] = useState<'board' | 'weekly'>('board');
  const [teamUsers, setTeamUsers] = useState<UserProfile[]>([]);
  const [checkins, setCheckins] = useState<TeamCheckin[]>([]);
  const [weeklyRecap, setWeeklyRecap] = useState<WeeklyTeamRecap | null>(null);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Help Modal State
  const [helpingCheckin, setHelpingCheckin] = useState<TeamCheckin | null>(null);
  const [helpMessage, setHelpMessage] = useState('');

  const loadData = async () => {
    if (!userProfile) return;
    setLoading(true);
    try {
      const users = await getAllUsers();
      // Internal team users only (exclude clients)
      const internals = users.filter((u) => u.role !== 'client' && u.role !== 'klien');
      setTeamUsers(internals);

      const dailyCheckins = await getTeamCheckins(todayDateStr);
      setCheckins(dailyCheckins);

      const recap = await getWeeklyTeamRecap(userProfile.id, userProfile.role);
      setWeeklyRecap(recap);
    } catch (err) {
      console.error('Error loading team board data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userProfile]);

  const handleSendHelp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!helpingCheckin || !helpMessage.trim() || !userProfile) return;

    const offer: HelpOffer = {
      id: `help-${Date.now()}`,
      helperId: userProfile.id,
      helperName: userProfile.displayName,
      helperAvatar: userProfile.avatarUrl,
      message: helpMessage.trim(),
      offeredAt: new Date().toISOString(),
    };

    try {
      await addHelpOfferToCheckin(helpingCheckin.id, offer);
      setToastMessage(`Tawaran bantuan berhasil dikirim ke ${helpingCheckin.userName}!`);
      setTimeout(() => setToastMessage(null), 4000);
      setHelpingCheckin(null);
      setHelpMessage('');
      loadData();
    } catch (err) {
      console.error('Error sending help offer:', err);
    }
  };

  const handleNudgeMember = (member: UserProfile) => {
    setToastMessage(`Notifikasi pengingat check-in pagi telah dikirim ke ${member.displayName}!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      {/* Toast */}
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
            <Users className="w-3.5 h-3.5 text-amber-300" />
            <span>Nexus Team Standup &amp; Performance Pulse</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-['Plus_Jakarta_Sans'] tracking-tight">
            Papan Tim &amp; Standup
          </h1>
          <p className="text-sm text-blue-100 mt-1.5 max-w-2xl leading-relaxed">
            Transparansi status ketersediaan WFA, 3 prioritas harian, kendala rekan kerja, dan budaya saling membantu (*Help Each Other*) tanpa mengekspos rahasia diagnosis klien.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="bg-white/10 p-1 rounded-xl flex items-center border border-white/15 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('board')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'board' ? 'bg-white text-[#00236f] shadow-xs' : 'text-blue-100 hover:text-white'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>Papan Hari Ini</span>
          </button>
          <button
            onClick={() => setActiveTab('weekly')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'weekly' ? 'bg-white text-[#00236f] shadow-xs' : 'text-blue-100 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Rekap Mingguan</span>
          </button>
        </div>
      </div>

      {/* TAB 1: PAPAN STANDUP HARI INI */}
      {activeTab === 'board' && (
        <div className="space-y-6">
          {/* Summary Mini Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-4">
              <span className="font-bold text-slate-500 uppercase text-xs">Ringkasan Hari Ini:</span>
              <span className="font-semibold text-slate-700">
                {checkins.length} dari {teamUsers.length} anggota telah check-in
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{checkins.filter((c) => c.workStatus === 'WFA').length} WFA Aktif</span>
              </span>
              <span className="inline-flex items-center gap-1 text-amber-700 font-bold bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>{checkins.filter((c) => c.workStatus === 'Izin').length} Izin</span>
              </span>
            </div>
          </div>

          {/* Cards Grid per Team Member */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {teamUsers.map((member) => {
              const memberCheckin = checkins.find((c) => c.userId === member.id);
              const hasCheckin = !!memberCheckin;
              const hasBlockers = !!(memberCheckin?.blockers && memberCheckin.blockers.trim());
              const pStatuses = memberCheckin?.priorityStatuses || {};

              return (
                <div
                  key={member.id}
                  className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col justify-between space-y-4 transition ${
                    hasCheckin
                      ? 'border-slate-200 hover:shadow-md'
                      : 'border-dashed border-amber-300 bg-amber-50/20'
                  }`}
                >
                  {/* Member Header */}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-2.5">
                        <UserAvatar url={member.avatarUrl} name={member.displayName} className="w-10 h-10 rounded-full ring-2 ring-slate-100 shrink-0" />
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-slate-900 truncate leading-snug">
                            {member.displayName}
                          </h3>
                          <p className="text-xs text-slate-500 truncate">
                            {member.title || member.role}
                          </p>
                        </div>
                      </div>

                      {/* Work Status Badge */}
                      {hasCheckin ? (
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 uppercase border ${
                            memberCheckin.workStatus === 'WFA'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : memberCheckin.workStatus === 'Izin'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-slate-100 text-slate-800 border-slate-200'
                          }`}
                        >
                          {memberCheckin.workStatus}
                        </span>
                      ) : (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0 bg-red-50 text-red-700 border border-red-200 uppercase">
                          Belum Check-in
                        </span>
                      )}
                    </div>

                    {/* 3 Priorities List */}
                    {hasCheckin ? (
                      <div className="space-y-2 pt-1 text-xs">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                          3 Prioritas Hari Ini:
                        </span>

                        {memberCheckin.priorities && memberCheckin.priorities.length > 0 ? (
                          memberCheckin.priorities.map((priorityText: string, idx: number) => {
                            const status = pStatuses[idx] || 'Belum';
                            return (
                              <div
                                key={idx}
                                className={`p-2.5 rounded-xl border text-xs flex items-start gap-2 ${
                                  status === 'Selesai'
                                    ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950 font-medium'
                                    : status === 'Pindah ke besok'
                                    ? 'bg-amber-50/50 border-amber-200 text-amber-950 font-medium'
                                    : 'bg-slate-50 border-slate-200 text-slate-800'
                                }`}
                              >
                                <span
                                  className={`w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                                    status === 'Selesai'
                                      ? 'bg-emerald-600 text-white'
                                      : status === 'Pindah ke besok'
                                      ? 'bg-amber-600 text-white'
                                      : 'bg-slate-300 text-slate-700'
                                  }`}
                                >
                                  {status === 'Selesai' ? '✓' : idx + 1}
                                </span>
                                <span className="leading-tight flex-1">{priorityText}</span>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-xs text-slate-500 italic">Belum mengisi prioritas</div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-slate-50 text-center text-slate-500 text-xs space-y-1">
                        <Clock className="w-5 h-5 mx-auto text-slate-300" />
                        <p className="font-medium">Menunggu check-in pagi</p>
                      </div>
                    )}

                    {/* Blockers Alert Box */}
                    {hasBlockers && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-rose-900">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Kendala / Hambatan:</span>
                        </div>
                        <p className="text-xs text-rose-800 leading-relaxed font-medium">
                          {memberCheckin.blockers}
                        </p>
                      </div>
                    )}

                    {/* Help Offers List if any */}
                    {memberCheckin?.helpOffers && memberCheckin.helpOffers.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-xs font-bold text-[#0051d5] uppercase tracking-wider block">
                          Tawaran Bantuan dari Rekan:
                        </span>
                        {memberCheckin.helpOffers.map((ho: HelpOffer) => (
                          <div
                            key={ho.id}
                            className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-100 text-xs text-blue-950 space-y-0.5"
                          >
                            <span className="font-bold">{ho.helperName}: </span>
                            <span>"{ho.message}"</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    {hasCheckin ? (
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs text-slate-500">
                          Check-in: {formatWITA(memberCheckin.morningCheckinAt)}
                        </span>

                        {/* Button Bantu (Open for all team roles) */}
                        <button
                          onClick={() => setHelpingCheckin(memberCheckin)}
                          className="inline-flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-[#00236f] font-bold px-3 py-1.5 rounded-xl transition cursor-pointer"
                        >
                          <HeartHandshake className="w-3.5 h-3.5" />
                          <span>Bantu</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs text-amber-700 font-semibold">Belum hadir</span>

                        {/* Button Ingatkan (ONLY for Owner role on members who have not checked in) */}
                        {isOwner ? (
                          <button
                            onClick={() => handleNudgeMember(member)}
                            className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-xl transition cursor-pointer shadow-xs"
                          >
                            <Bell className="w-3.5 h-3.5" />
                            <span>Ingatkan</span>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500 italic">Menunggu Owner</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: REKAP MINGGUAN TIM */}
      {activeTab === 'weekly' && weeklyRecap && (
        <div className="space-y-6">
          {/* Top Aggregate Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Check-in Minggu Ini
              </span>
              <div className="text-3xl font-bold font-['Plus_Jakarta_Sans'] text-slate-900">
                {weeklyRecap.teamSummary.totalCheckins}
              </div>
              <p className="text-xs text-slate-500 font-medium">Standup tercatat seluruh tim</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Tingkat Kehadiran WFA
              </span>
              <div className="text-3xl font-bold font-['Plus_Jakarta_Sans'] text-emerald-600">
                {weeklyRecap.teamSummary.wfaRate}%
              </div>
              <p className="text-xs text-slate-500 font-medium">Rata-rata ketersediaan online tim</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Penyelesaian 3 Prioritas
              </span>
              <div className="text-3xl font-bold font-['Plus_Jakarta_Sans'] text-[#00236f]">
                {weeklyRecap.teamSummary.priorityCompletionRate}%
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {weeklyRecap.teamSummary.completedPriorities} dari {weeklyRecap.teamSummary.totalPriorities} target tuntas
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Kendala Terkomunikasikan
              </span>
              <div className="text-3xl font-bold font-['Plus_Jakarta_Sans'] text-rose-600">
                {weeklyRecap.teamSummary.activeBlockersCount}
              </div>
              <p className="text-xs text-slate-500 font-medium">Hambatan yang dibantu kolaborasi</p>
            </div>
          </div>

          {/* Privacy Invariant Banner */}
          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 flex items-center justify-between text-xs text-blue-950">
            <div className="flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-[#00236f] shrink-0" />
              <span>
                <strong>Aturan Privasi Rekap:</strong> Rekap tim bersifat terbuka, sedangkan rincian catatan dan kendala per anggota hanya dapat diakses oleh anggota yang bersangkutan dan Owner.
              </span>
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-5 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                Evaluasi Kinerja &amp; Rincian per Anggota Tim
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5">Anggota Tim</th>
                    <th className="px-5 py-3.5">Peran</th>
                    <th className="px-5 py-3.5">Jumlah Check-in</th>
                    <th className="px-5 py-3.5">Penyelesaian Prioritas</th>
                    <th className="px-5 py-3.5">Catatan Kendala &amp; Tindak Lanjut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {weeklyRecap.memberBreakdown.map((mb: WeeklyMemberRecapItem) => (
                    <tr key={mb.userId} className="hover:bg-slate-50/60 transition">
                      <td className="px-5 py-4 font-bold text-slate-900 flex items-center gap-2.5">
                        <UserAvatar url={mb.avatarUrl} name={mb.userName} className="w-7 h-7 rounded-full" />
                        <span>{mb.userName}</span>
                      </td>

                      <td className="px-5 py-4 text-slate-600 uppercase text-xs font-bold">
                        {mb.userRole}
                      </td>

                      <td className="px-5 py-4 font-semibold text-slate-700">
                        {mb.checkinsCount} hari
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-[#00236f] h-2 rounded-full"
                              style={{ width: `${mb.completionRate}%` }}
                            />
                          </div>
                          <span className="font-bold text-slate-900">{mb.completionRate}%</span>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {mb.isCurrentMemberOrOwner ? (
                          mb.blockersSummary ? (
                            <span className="text-slate-800 font-medium">{mb.blockersSummary}</span>
                          ) : (
                            <span className="text-slate-500 italic">Tidak ada kendala</span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-500 italic bg-slate-100 px-2 py-0.5 rounded text-xs">
                            <Lock className="w-3 h-3" />
                            <span>Privat (Khusus Anggota &amp; Owner)</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* HELP OFFER MODAL */}
      {helpingCheckin && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#00236f] flex items-center justify-center font-bold">
                  <HeartHandshake className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Tawarkan Bantuan ke {helpingCheckin.userName}
                  </h3>
                  <p className="text-xs text-slate-500">Tuliskan solusi atau bantuan yang bisa Anda berikan</p>
                </div>
              </div>
              <button
                onClick={() => setHelpingCheckin(null)}
                className="p-1 text-slate-500 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendHelp} className="space-y-4 mt-4 text-xs">
              {helpingCheckin.blockers && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                  <div className="text-xs font-bold text-rose-800 uppercase">Kendala yang dihadapi:</div>
                  <div className="text-xs font-semibold text-rose-950 mt-0.5">
                    {helpingCheckin.blockers}
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Pesan Bantuan / Dukungan Anda:</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Contoh: Saya bisa bantu review draf materi atau menghubungi PIC klien..."
                  value={helpMessage}
                  onChange={(e) => setHelpMessage(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00236f]/20 focus:border-[#00236f]"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setHelpingCheckin(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#00236f] hover:bg-[#1e3a8a] text-white font-bold rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirim Tawaran Bantuan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
