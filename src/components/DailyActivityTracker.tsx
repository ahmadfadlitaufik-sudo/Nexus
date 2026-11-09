import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Activity,
  CheckCircle2,
  Clock,
  Home,
  Building2,
  Palmtree,
  HeartPulse,
  FileQuestion,
  ChevronDown,
  ChevronUp,
  Sparkles,
  AlertTriangle,
  Send,
  Users,
  Check,
  RotateCcw,
  Plus,
  HelpCircle,
  Calendar,
  MessageSquare,
  ArrowRight,
  Sun,
  Moon,
  ExternalLink,
  Info,
} from 'lucide-react';
import {
  TeamCheckin,
  WorkStatus,
  PlanItemStatus,
  UserProfile,
  HelpOffer,
} from '../types';
import {
  getTeamCheckinByUserAndDate,
  saveTeamCheckin,
  getTeamCheckins,
  addHelpOfferToCheckin,
  getAllUsers,
  getDailyAgendasForUser,
  AutoDailyAgenda,
} from '../services/db';
import { formatWITA, todayWITA } from '../utils/formatters';

interface DailyActivityTrackerProps {
  title?: string;
  defaultCollapsed?: boolean;
  onActivityUpdated?: () => void;
  className?: string;
  compact?: boolean;
}

const WORK_STATUSES: {
  id: WorkStatus;
  label: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  activeBg: string;
}[] = [
  {
    id: 'WFA',
    label: 'WFA',
    sub: 'Work From Anywhere',
    icon: Home,
    color: 'text-emerald-700 border-emerald-200 bg-emerald-50',
    activeBg: 'bg-emerald-600 text-white border-emerald-600 shadow-xs',
  },
  {
    id: 'Kantor',
    label: 'Kantor Hub',
    sub: 'On-site Nexust Hub',
    icon: Building2,
    color: 'text-blue-700 border-blue-200 bg-blue-50',
    activeBg: 'bg-[#00236f] text-white border-[#00236f] shadow-xs',
  },
  {
    id: 'Cuti',
    label: 'Cuti',
    sub: 'Annual / Casual Leave',
    icon: Palmtree,
    color: 'text-purple-700 border-purple-200 bg-purple-50',
    activeBg: 'bg-purple-600 text-white border-purple-600 shadow-xs',
  },
  {
    id: 'Sakit',
    label: 'Sakit',
    sub: 'Medical Recovery',
    icon: HeartPulse,
    color: 'text-rose-700 border-rose-200 bg-rose-50',
    activeBg: 'bg-rose-600 text-white border-rose-600 shadow-xs',
  },
  {
    id: 'Izin',
    label: 'Izin',
    sub: 'Keperluan Mendesak',
    icon: FileQuestion,
    color: 'text-amber-700 border-amber-200 bg-amber-50',
    activeBg: 'bg-amber-600 text-white border-amber-600 shadow-xs',
  },
];

const STATUS_OPTIONS: PlanItemStatus[] = ['Belum', 'Berjalan', 'Selesai', 'Pindah ke besok'];

export const DailyActivityTracker: React.FC<DailyActivityTrackerProps> = ({
  title = 'Daily Activity Tracker • Tim Nexus',
  defaultCollapsed = false,
  onActivityUpdated,
  className = '',
  compact = false,
}) => {
  const { userProfile } = useAuth();
  const todayDateStr = todayWITA();

  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [activeTab, setActiveTab] = useState<'my-checkin' | 'team-activity'>('my-checkin');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Current User's Check-in Data
  const [userCheckin, setUserCheckin] = useState<TeamCheckin | null>(null);
  const [workStatus, setWorkStatus] = useState<WorkStatus>('WFA');
  const [locationNote, setLocationNote] = useState('');
  const [priority1, setPriority1] = useState('');
  const [priority2, setPriority2] = useState('');
  const [priority3, setPriority3] = useState('');
  const [priorityStatuses, setPriorityStatuses] = useState<Record<number, PlanItemStatus>>({
    0: 'Belum',
    1: 'Belum',
    2: 'Belum',
  });
  const [blockers, setBlockers] = useState('');
  const [checkoutNotes, setCheckoutNotes] = useState('');

  // Team Check-ins
  const [teamCheckins, setTeamCheckins] = useState<TeamCheckin[]>([]);
  const [teamUsers, setTeamUsers] = useState<UserProfile[]>([]);

  // Auto Agenda Suggestions for today
  const [agendas, setAgendas] = useState<AutoDailyAgenda[]>([]);
  const [showAgendaModal, setShowAgendaModal] = useState(false);

  // Help Offer Modal
  const [helpTargetCheckin, setHelpTargetCheckin] = useState<TeamCheckin | null>(null);
  const [helpMessage, setHelpMessage] = useState('');
  const [sendingHelp, setSendingHelp] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const loadAllData = async () => {
    if (!userProfile) return;
    setLoading(true);
    try {
      const [myCheckin, allCheckins, users, dailyAgendas] = await Promise.all([
        getTeamCheckinByUserAndDate(userProfile.id, todayDateStr),
        getTeamCheckins(todayDateStr),
        getAllUsers(),
        getDailyAgendasForUser(userProfile.id, todayDateStr, userProfile.role),
      ]);

      setUserCheckin(myCheckin);
      if (myCheckin) {
        setWorkStatus(myCheckin.workStatus || 'WFA');
        setLocationNote(myCheckin.locationNote || '');
        setPriority1(myCheckin.priorities?.[0] || '');
        setPriority2(myCheckin.priorities?.[1] || '');
        setPriority3(myCheckin.priorities?.[2] || '');
        setBlockers(myCheckin.blockers || '');
        setCheckoutNotes(myCheckin.checkoutNotes || myCheckin.eveningNotes || '');
        if (myCheckin.priorityStatuses) {
          setPriorityStatuses(myCheckin.priorityStatuses);
        }
      }

      setTeamCheckins(allCheckins);
      // Filter internal users
      const internalMembers = users.filter((u) => u.role !== 'client' && u.role !== 'klien');
      setTeamUsers(internalMembers);
      setAgendas(dailyAgendas);
    } catch (err) {
      console.error('Error loading daily activity tracker data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [userProfile?.id, todayDateStr]);

  // Handle Saving Morning / Activity Check-in
  const handleSaveCheckin = async (isEveningCheckout = false) => {
    if (!userProfile) return;
    setSaving(true);
    try {
      const prioritiesList = [priority1.trim(), priority2.trim(), priority3.trim()].filter(
        Boolean
      );

      const completedCount = Object.values(priorityStatuses).filter(
        (st) => st === 'Selesai'
      ).length;

      const nowIso = new Date().toISOString();
      const payload: Partial<TeamCheckin> & { userId: string; date: string } = {
        userId: userProfile.id,
        userName: userProfile.displayName,
        userRole: userProfile.role,
        userAvatar: userProfile.avatarUrl,
        date: todayDateStr,
        workStatus,
        locationNote: locationNote.trim(),
        priorities: prioritiesList,
        priorityStatuses,
        blockers: blockers.trim(),
        completedCount,
        morningCheckinAt: userCheckin?.morningCheckinAt || nowIso,
        submittedAtMorning: userCheckin?.submittedAtMorning || nowIso,
        ...(isEveningCheckout
          ? {
              eveningCheckoutAt: nowIso,
              submittedAtEvening: nowIso,
              checkoutNotes: checkoutNotes.trim(),
              eveningNotes: checkoutNotes.trim(),
            }
          : {}),
      };

      const saved = await saveTeamCheckin(payload);
      setUserCheckin(saved);

      // Refresh team list to reflect updated user activity
      const refreshedCheckins = await getTeamCheckins(todayDateStr);
      setTeamCheckins(refreshedCheckins);

      showToast(
        isEveningCheckout
          ? 'Check-out sore berhasil dicatat! Kerja bagus hari ini.'
          : 'Check-in aktivitas harian berhasil disimpan!'
      );

      if (onActivityUpdated) onActivityUpdated();
    } catch (err) {
      console.error('Error saving checkin:', err);
      showToast('Gagal menyimpan check-in. Coba beberapa saat lagi.');
    } finally {
      setSaving(false);
    }
  };

  // Quick toggle priority status directly
  const handleTogglePriorityStatus = async (idx: number) => {
    if (!userProfile) return;
    const current = priorityStatuses[idx] || 'Belum';
    let next: PlanItemStatus = 'Belum';
    if (current === 'Belum') next = 'Berjalan';
    else if (current === 'Berjalan') next = 'Selesai';
    else if (current === 'Selesai') next = 'Pindah ke besok';
    else next = 'Belum';

    const newStatuses = { ...priorityStatuses, [idx]: next };
    setPriorityStatuses(newStatuses);

    // If user already saved a check-in, update Firestore immediately
    if (userCheckin) {
      const completedCount = Object.values(newStatuses).filter((st) => st === 'Selesai').length;
      try {
        const updated = await saveTeamCheckin({
          userId: userProfile.id,
          date: todayDateStr,
          priorityStatuses: newStatuses,
          completedCount,
        });
        setUserCheckin(updated);
        const refreshedCheckins = await getTeamCheckins(todayDateStr);
        setTeamCheckins(refreshedCheckins);
        showToast(`Prioritas #${idx + 1} ditandai: ${next}`);
      } catch (e) {
        console.error('Failed to update priority status:', e);
      }
    }
  };

  // Submit Help Offer to a Teammate
  const handleSendHelpOffer = async () => {
    if (!userProfile || !helpTargetCheckin || !helpMessage.trim()) return;
    setSendingHelp(true);
    try {
      await addHelpOfferToCheckin(helpTargetCheckin.id, {
        fromUserId: userProfile.id,
        fromUserName: userProfile.displayName,
        helperId: userProfile.id,
        helperName: userProfile.displayName,
        helperAvatar: userProfile.avatarUrl,
        message: helpMessage.trim(),
      });

      showToast(`Tawaran bantuan terkirim ke ${helpTargetCheckin.userName}!`);
      setHelpTargetCheckin(null);
      setHelpMessage('');

      const refreshed = await getTeamCheckins(todayDateStr);
      setTeamCheckins(refreshed);
    } catch (err) {
      console.error('Error sending help offer:', err);
      showToast('Gagal mengirim bantuan. Coba lagi.');
    } finally {
      setSendingHelp(false);
    }
  };

  // Import an agenda item into priorities
  const handleImportAgenda = (agenda: AutoDailyAgenda) => {
    if (!priority1) {
      setPriority1(agenda.title);
    } else if (!priority2) {
      setPriority2(agenda.title);
    } else if (!priority3) {
      setPriority3(agenda.title);
    } else {
      setPriority1(agenda.title);
    }
    setShowAgendaModal(false);
    showToast(`Agenda "${agenda.title.slice(0, 30)}..." ditambahkan ke prioritas.`);
  };

  // Compute metrics for team summary
  const internalUsersCount = teamUsers.length || 5;
  const checkedInUsersCount = teamCheckins.length;
  const checkinRate = Math.round((checkedInUsersCount / internalUsersCount) * 100);
  const wfaCount = teamCheckins.filter((c) => c.workStatus === 'WFA').length;
  const officeCount = teamCheckins.filter((c) => c.workStatus === 'Kantor').length;
  const blockersCount = teamCheckins.filter((c) => !!c.blockers && c.blockers.trim().length > 0).length;

  const userHasCheckedIn = !!userCheckin?.morningCheckinAt || !!userCheckin?.submittedAtMorning;

  // Active user's priority completion calculation
  const totalUserPriorities = [priority1, priority2, priority3].filter(Boolean).length;
  const completedUserPriorities = Object.entries(priorityStatuses).filter(
    ([idx, st]) => st === 'Selesai' && [priority1, priority2, priority3][Number(idx)]
  ).length;

  const userProgressPercent =
    totalUserPriorities > 0
      ? Math.round((completedUserPriorities / totalUserPriorities) * 100)
      : 0;

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all duration-300 ${className}`}
    >
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="bg-emerald-600 text-white text-xs font-semibold px-4 py-2.5 flex items-center justify-between animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-white/80 hover:text-white cursor-pointer text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Component Header */}
      <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-blue-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00236f] to-[#1e3a8a] text-white flex items-center justify-center font-bold shadow-xs shrink-0">
            <Activity className="w-5 h-5 text-blue-200" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans'] tracking-tight">
                {title}
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-[#00236f]">
                <Clock className="w-3 h-3" />
                WITA (UTC+8)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Check-in kehadiran WFA, fokus 3 prioritas harian, dan koordinasi kendala tim.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Quick Status Pill */}
          {userHasCheckedIn ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                Aktif: <strong>{userCheckin?.workStatus}</strong> (
                {userCheckin?.morningCheckinAt ? formatWITA(userCheckin.morningCheckinAt) : 'Pagi'}
                )
              </span>
              <span className="text-emerald-400">|</span>
              <span className="text-[11px] font-bold">
                {completedUserPriorities}/{totalUserPriorities} Selesai
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 animate-bounce" />
              <span>Belum Check-in Hari Ini</span>
            </div>
          )}

          {/* Tab Selector Buttons */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80 text-xs font-semibold">
            <button
              onClick={() => {
                setActiveTab('my-checkin');
                setIsCollapsed(false);
              }}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'my-checkin'
                  ? 'bg-white text-[#00236f] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Check-in Saya</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('team-activity');
                setIsCollapsed(false);
              }}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'team-activity'
                  ? 'bg-white text-[#00236f] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>
                Tim Nexus ({checkedInUsersCount}/{internalUsersCount})
              </span>
            </button>
          </div>

          {/* Collapse / Expand Toggle Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer border border-transparent hover:border-slate-200"
            title={isCollapsed ? 'Buka detail tracker' : 'Ciutkan tracker'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* COLLAPSED MINI PREVIEW BAR */}
      {isCollapsed && (
        <div className="px-5 py-3.5 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-500">Status Anda:</span>
              {userHasCheckedIn ? (
                <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                  {userCheckin?.workStatus} • {completedUserPriorities}/{totalUserPriorities} Fokus
                  Tercapai ({userProgressPercent}%)
                </span>
              ) : (
                <span className="font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                  Belum check-in
                </span>
              )}
            </div>

            <span className="text-slate-300 hidden sm:inline">|</span>

            <div className="flex items-center gap-2 text-slate-600">
              <Users className="w-3.5 h-3.5 text-[#00236f]" />
              <span>
                <strong>{checkedInUsersCount} dari {internalUsersCount}</strong> anggota tim aktif
                hari ini ({wfaCount} WFA, {officeCount} Kantor)
              </span>
            </div>

            {blockersCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold">
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                {blockersCount} kendala butuh bantuan
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsCollapsed(false);
                setActiveTab('my-checkin');
              }}
              className="px-3 py-1.5 rounded-lg bg-[#00236f] text-white font-semibold hover:bg-[#1e3a8a] transition cursor-pointer"
            >
              {userHasCheckedIn ? 'Perbarui Aktivitas' : 'Check-in Sekarang'}
            </button>
            <button
              onClick={() => {
                setIsCollapsed(false);
                setActiveTab('team-activity');
              }}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-100 transition cursor-pointer"
            >
              Lihat Tim
            </button>
          </div>
        </div>
      )}

      {/* EXPANDED CONTENT BODY */}
      {!isCollapsed && (
        <div className="p-5 sm:p-6 space-y-6">
          {/* TAB 1: CHECK-IN SAYA (PERSONAL DAILY ACTIVITY TRACKER) */}
          {activeTab === 'my-checkin' && (
            <div className="space-y-6 animate-in fade-in">
              {/* 1. Status Kerja (Work Status Selection) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                  1. Mode Kerja Hari Ini (WITA)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                  {WORK_STATUSES.map((ws) => {
                    const Icon = ws.icon;
                    const isSelected = workStatus === ws.id;
                    return (
                      <button
                        key={ws.id}
                        type="button"
                        onClick={() => setWorkStatus(ws.id)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected ? ws.activeBg : `${ws.color} hover:opacity-90`
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Icon className="w-4 h-4" />
                          {isSelected && <Check className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="text-xs font-bold">{ws.label}</div>
                          <div
                            className={`text-[10px] ${
                              isSelected ? 'text-white/80' : 'text-slate-500'
                            }`}
                          >
                            {ws.sub}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-2.5">
                  <input
                    type="text"
                    value={locationNote}
                    onChange={(e) => setLocationNote(e.target.value)}
                    placeholder="Catatan lokasi spesifik (opsional, misal: 'WFA Denpasar Hub', 'Coworking Canggu', 'Rumah')..."
                    className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00236f]/20 focus:border-[#00236f] transition"
                  />
                </div>
              </div>

              {/* 2. Prioritas Utama Hari Ini (Top 3 Focus Items) */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      2. Fokus Utama Hari Ini (1 - 3 Target Prioritas)
                    </label>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Tuliskan 1 hingga 3 deliverable paling penting yang ingin Anda tuntaskan hari ini.
                    </p>
                  </div>

                  {agendas.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowAgendaModal(true)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#00236f] text-xs font-semibold border border-blue-200 transition cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#0051d5]" />
                      <span>Ambil dari Agenda ({agendas.length})</span>
                    </button>
                  )}
                </div>

                {/* Progress Bar if user has entered priorities */}
                {totalUserPriorities > 0 && (
                  <div className="mb-3.5 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-slate-700">Progres Prioritas Hari Ini:</span>
                      <span className="font-bold text-[#00236f]">
                        {completedUserPriorities} dari {totalUserPriorities} Selesai ({userProgressPercent}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-[#00236f] to-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${userProgressPercent}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* 3 Priority Inputs / Interactive Cards */}
                <div className="space-y-2.5">
                  {[
                    {
                      val: priority1,
                      setVal: setPriority1,
                      num: 1,
                      status: priorityStatuses[0] || 'Belum',
                      placeholder: 'Prioritas #1 (misal: Selesaikan audit food cost Klien Kopi Senja)',
                    },
                    {
                      val: priority2,
                      setVal: setPriority2,
                      num: 2,
                      status: priorityStatuses[1] || 'Belum',
                      placeholder: 'Prioritas #2 (misal: Sesi konsultasi WFA Q4 Batik Puspa)',
                    },
                    {
                      val: priority3,
                      setVal: setPriority3,
                      num: 3,
                      status: priorityStatuses[2] || 'Belum',
                      placeholder: 'Prioritas #3 (misal: Review draf SOP atau pelaporan mingguan)',
                    },
                  ].map((p, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition"
                    >
                      <span className="w-6 h-6 rounded-lg bg-[#00236f]/10 text-[#00236f] flex items-center justify-center font-bold text-xs shrink-0">
                        {p.num}
                      </span>
                      <input
                        type="text"
                        value={p.val}
                        onChange={(e) => p.setVal(e.target.value)}
                        placeholder={p.placeholder}
                        className={`flex-1 text-xs px-2 py-1.5 bg-transparent focus:outline-none ${
                          p.status === 'Selesai' ? 'line-through text-slate-400 font-normal' : 'text-slate-800 font-medium'
                        }`}
                      />

                      {/* Status Selector Badge / Toggle */}
                      {p.val.trim() && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleTogglePriorityStatus(idx)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition flex items-center gap-1 ${
                              p.status === 'Selesai'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : p.status === 'Berjalan'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : p.status === 'Pindah ke besok'
                                ? 'bg-purple-100 text-purple-800 border border-purple-300'
                                : 'bg-slate-100 text-slate-600 border border-slate-300'
                            }`}
                            title="Klik untuk ubah status: Belum → Berjalan → Selesai"
                          >
                            {p.status === 'Selesai' ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            ) : p.status === 'Berjalan' ? (
                              <RotateCcw className="w-3 h-3 text-amber-600 animate-spin" />
                            ) : (
                              <div className="w-2 h-2 rounded-full bg-slate-400" />
                            )}
                            <span>{p.status}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Blocker / Kendala Hari Ini */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  3. Kendala / Blocker (Kolaborasi Silang Tim)
                </label>
                <div className="relative">
                  <textarea
                    rows={2}
                    value={blockers}
                    onChange={(e) => setBlockers(e.target.value)}
                    placeholder="Ada kendala atau hal yang menghambat Anda hari ini? Tuliskan agar rekan tim lain dapat mengetahui dan menawarkan bantuan..."
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00236f]/20 focus:border-[#00236f] transition"
                  />
                  {blockers.trim() && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>
                        Kendala ini akan ditampilkan di radar tim agar rekan konsultan/tim lain bisa saling bantu.
                      </span>
                    </div>
                  )}
                </div>

                {/* Received Help Offers for this user */}
                {userCheckin?.helpOffers && userCheckin.helpOffers.length > 0 && (
                  <div className="mt-3 p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
                    <div className="text-xs font-bold text-[#00236f] flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>Tawaran Bantuan dari Rekan Tim:</span>
                    </div>
                    <div className="space-y-1.5">
                      {userCheckin.helpOffers.map((offer) => (
                        <div
                          key={offer.id}
                          className="bg-white p-2.5 rounded-lg border border-blue-100 text-xs text-slate-700 shadow-2xs"
                        >
                          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-900 mb-1">
                            <span>{offer.fromUserName || offer.helperName || 'Rekan Tim'}</span>
                            <span className="text-slate-400 font-normal">
                              {offer.createdAt ? formatWITA(offer.createdAt) : ''}
                            </span>
                          </div>
                          <p className="text-slate-600">{offer.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Check-out Sore / Evaluasi Akhir Hari */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Moon className="w-3.5 h-3.5 text-indigo-600" />
                    <span>4. Refleksi &amp; Check-out Sore (Opsional)</span>
                  </label>
                  {userCheckin?.eveningCheckoutAt && (
                    <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                      Check-out: {formatWITA(userCheckin.eveningCheckoutAt)}
                    </span>
                  )}
                </div>
                <textarea
                  rows={2}
                  value={checkoutNotes}
                  onChange={(e) => setCheckoutNotes(e.target.value)}
                  placeholder="Catatan hasil hari ini atau poin evaluasi sore sebelum mengakhiri jam kerja..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <div className="text-[11px] text-slate-400">
                  {userCheckin?.updatedAt
                    ? `Terakhir diperbarui: ${formatWITA(userCheckin.updatedAt)}`
                    : 'Belum disimpan ke database hari ini.'}
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSaveCheckin(false)}
                    className="inline-flex items-center gap-1.5 bg-[#00236f] hover:bg-[#1e3a8a] text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {saving ? (
                      <RotateCcw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    <span>{userHasCheckedIn ? 'Perbarui Check-in' : 'Simpan Check-in Harian'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSaveCheckin(true)}
                    className="inline-flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 text-xs font-semibold px-3.5 py-2.5 rounded-xl transition cursor-pointer disabled:opacity-50"
                    title="Simpan evaluasi sore & tandai jam selesai kerja"
                  >
                    <Moon className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Check-out Sore</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AKTIVITAS TIM NEXUS HARI INI (TEAM STANDUP FEED) */}
          {activeTab === 'team-activity' && (
            <div className="space-y-6 animate-in fade-in">
              {/* Summary Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Check-in Rate
                  </div>
                  <div className="text-xl font-extrabold text-[#00236f] font-['Plus_Jakarta_Sans'] mt-1">
                    {checkinRate}%
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {checkedInUsersCount} dari {internalUsersCount} anggota
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Distribusi Mode
                  </div>
                  <div className="text-xl font-extrabold text-emerald-700 font-['Plus_Jakarta_Sans'] mt-1">
                    {wfaCount} WFA
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {officeCount} Kantor Hub • 0 Cuti
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Target Tercapai
                  </div>
                  <div className="text-xl font-extrabold text-[#0051d5] font-['Plus_Jakarta_Sans'] mt-1">
                    {teamCheckins.reduce((acc, c) => acc + (c.completedCount || 0), 0)} Selesai
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Dari akumulasi prioritas hari ini
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Kendala / Blocker
                  </div>
                  <div className="text-xl font-extrabold text-amber-700 font-['Plus_Jakarta_Sans'] mt-1">
                    {blockersCount} Kendala
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {blockersCount > 0 ? 'Membutuhkan dukungan tim' : 'Semua berjalan lancar'}
                  </div>
                </div>
              </div>

              {/* Team Members Standup Cards */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Daftar Check-in Anggota Tim Nexus ({teamUsers.length} Anggota)
                  </h3>
                  <span className="text-[11px] text-slate-400">Diurutkan berdasarkan waktu check-in</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {teamUsers.map((member) => {
                    const memberCheckin = teamCheckins.find((c) => c.userId === member.id);
                    const isCurrentUser = member.id === userProfile?.id;
                    const hasBlocker =
                      !!memberCheckin?.blockers && memberCheckin.blockers.trim().length > 0;

                    const roleLabel =
                      member.role === 'owner'
                        ? 'Owner / Founder'
                        : member.role === 'konsultan' || member.role === 'consultant'
                        ? 'Konsultan Pendamping'
                        : member.role === 'tim_grup'
                        ? 'Fasilitator Grup'
                        : member.role === 'tim_konten'
                        ? 'Tim Konten & Media'
                        : 'Staf Operasional';

                    return (
                      <div
                        key={member.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isCurrentUser
                            ? 'bg-blue-50/40 border-blue-200 shadow-2xs'
                            : 'bg-white border-slate-200/90 hover:border-slate-300'
                        }`}
                      >
                        {/* Member Header */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={
                                member.avatarUrl ||
                                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                              }
                              alt={member.displayName}
                              className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-200"
                            />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-slate-900">
                                  {member.displayName}
                                </span>
                                {isCurrentUser && (
                                  <span className="text-[9px] font-bold bg-[#00236f] text-white px-1.5 py-0.2 rounded">
                                    Anda
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-500 block leading-tight">
                                {member.title || roleLabel}
                              </span>
                            </div>
                          </div>

                          {/* Work Mode Pill */}
                          {memberCheckin ? (
                            <div className="text-right shrink-0">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  memberCheckin.workStatus === 'WFA'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : memberCheckin.workStatus === 'Kantor'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {memberCheckin.workStatus === 'WFA' ? (
                                  <Home className="w-2.5 h-2.5" />
                                ) : (
                                  <Building2 className="w-2.5 h-2.5" />
                                )}
                                <span>{memberCheckin.workStatus}</span>
                              </span>
                              <div className="text-[9px] text-slate-400 mt-0.5">
                                {memberCheckin.morningCheckinAt
                                  ? formatWITA(memberCheckin.morningCheckinAt)
                                  : 'Aktif'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                              Belum Check-in
                            </span>
                          )}
                        </div>

                        {/* Location Note if available */}
                        {memberCheckin?.locationNote && (
                          <div className="text-[11px] text-slate-600 mb-2 italic">
                            📍 {memberCheckin.locationNote}
                          </div>
                        )}

                        {/* Priorities List */}
                        {memberCheckin?.priorities && memberCheckin.priorities.length > 0 ? (
                          <div className="space-y-1 mb-3">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Fokus Hari Ini:
                            </span>
                            {memberCheckin.priorities.map((item, idx) => {
                              const st = memberCheckin.priorityStatuses?.[idx] || 'Belum';
                              return (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between text-xs py-0.5 gap-2"
                                >
                                  <span
                                    className={`truncate ${
                                      st === 'Selesai'
                                        ? 'line-through text-slate-400'
                                        : 'text-slate-700'
                                    }`}
                                  >
                                    {idx + 1}. {item}
                                  </span>
                                  <span
                                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0 ${
                                      st === 'Selesai'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : st === 'Berjalan'
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-slate-100 text-slate-500'
                                    }`}
                                  >
                                    {st}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400 italic mb-2">
                            {memberCheckin
                              ? 'Tidak ada target prioritas tertulis.'
                              : 'Menunggu anggota check-in.'}
                          </div>
                        )}

                        {/* Blocker & Help Collaboration */}
                        {hasBlocker && (
                          <div className="p-2.5 rounded-lg bg-amber-50/80 border border-amber-200 space-y-2 mb-2">
                            <div className="flex items-start gap-1.5 text-xs text-amber-900">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold text-[11px] uppercase tracking-wider text-amber-800 block">
                                  Kendala / Butuh Dukungan:
                                </span>
                                <p className="text-[11px] text-amber-800 mt-0.5">
                                  {memberCheckin?.blockers}
                                </p>
                              </div>
                            </div>

                            {/* Help Offers List */}
                            {memberCheckin?.helpOffers && memberCheckin.helpOffers.length > 0 && (
                              <div className="pt-1.5 border-t border-amber-200/60 space-y-1">
                                <span className="text-[10px] font-bold text-amber-900 block">
                                  Bantuan Masuk:
                                </span>
                                {memberCheckin.helpOffers.map((ho) => (
                                  <div
                                    key={ho.id}
                                    className="text-[10px] bg-white/80 p-1.5 rounded text-slate-700 border border-amber-100"
                                  >
                                    <strong className="text-slate-900">
                                      {ho.fromUserName || ho.helperName}:
                                    </strong>{' '}
                                    {ho.message}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Button to Offer Help if not current user */}
                            {!isCurrentUser && (
                              <button
                                type="button"
                                onClick={() => {
                                  setHelpTargetCheckin(memberCheckin!);
                                  setHelpMessage('');
                                }}
                                className="w-full text-center text-xs font-semibold py-1 rounded bg-amber-600 hover:bg-amber-700 text-white transition cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                              >
                                <MessageSquare className="w-3 h-3" />
                                <span>Tawarkan Bantuan ke {member.displayName.split(' ')[0]}</span>
                              </button>
                            )}
                          </div>
                        )}

                        {/* Evening Notes / Checkout */}
                        {(memberCheckin?.checkoutNotes || memberCheckin?.eveningNotes) && (
                          <div className="p-2 rounded-lg bg-indigo-50/60 border border-indigo-100 text-[11px] text-indigo-900">
                            <span className="font-bold text-[10px] uppercase text-indigo-800 block">
                              Catatan Sore:
                            </span>
                            <p className="mt-0.5">
                              {memberCheckin.checkoutNotes || memberCheckin.eveningNotes}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: Import from Today's Agendas */}
      {showAgendaModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#00236f]" />
                <h3 className="text-sm font-bold text-slate-900">
                  Agenda &amp; Jadwal Anda Hari Ini
                </h3>
              </div>
              <button
                onClick={() => setShowAgendaModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 my-3">
              Pilih sesi bimbingan atau tugas yang jatuh tempo hari ini untuk langsung disematkan ke prioritas kerja harian Anda.
            </p>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {agendas.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleImportAgenda(item)}
                  className="p-2.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition cursor-pointer flex items-center justify-between gap-3 text-xs"
                >
                  <div className="overflow-hidden">
                    <div className="font-bold text-slate-900 truncate">{item.title}</div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>{item.clientOrGroupName || item.clientName}</span>
                      <span>•</span>
                      <span>{item.timeOrDeadline ? formatWITA(item.timeOrDeadline) : 'Hari Ini'}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-[#0051d5] bg-blue-100 px-2 py-0.5 rounded-full shrink-0">
                    + Pasang
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-right">
              <button
                onClick={() => setShowAgendaModal(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Offer Help Form */}
      {helpTargetCheckin && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-[#00236f]">
                <MessageSquare className="w-4 h-4" />
                <h3 className="text-sm font-bold text-slate-900">
                  Tawarkan Bantuan ke {helpTargetCheckin.userName}
                </h3>
              </div>
              <button
                onClick={() => setHelpTargetCheckin(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            <div className="my-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
              <span className="font-bold block text-[10px] uppercase tracking-wider text-amber-800">
                Kendala yang dialami:
              </span>
              <p className="mt-0.5">{helpTargetCheckin.blockers}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pesan / Rencana Bantuan:
              </label>
              <textarea
                rows={3}
                value={helpMessage}
                onChange={(e) => setHelpMessage(e.target.value)}
                placeholder="Contoh: 'Saya bisa bantu review template food cost jam 11:30 via Google Meet ya.'"
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#00236f]/20 focus:border-[#00236f]"
              />
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setHelpTargetCheckin(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={sendingHelp || !helpMessage.trim()}
                onClick={handleSendHelpOffer}
                className="px-4 py-1.5 rounded-lg bg-[#00236f] hover:bg-[#1e3a8a] text-white text-xs font-semibold cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {sendingHelp ? (
                  <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Kirim Tawaran Bantuan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
