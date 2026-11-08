import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  LayoutGrid,
  Table as TableIcon,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Home,
  Building2,
  Palmtree,
  HeartPulse,
  FileQuestion,
  AlertTriangle,
  MessageSquare,
  Send,
  RotateCcw,
  Sparkles,
  Calendar,
  Check,
  ChevronRight,
  HelpCircle,
  TrendingUp,
  Briefcase,
} from 'lucide-react';
import { TeamCheckin, UserProfile, WorkStatus, PlanItemStatus } from '../types';
import { getTeamCheckins, getAllUsers, addHelpOfferToCheckin } from '../services/db';
import { formatWITA } from '../utils/formatters';

interface TeamActivitySummaryProps {
  title?: string;
  defaultView?: 'table' | 'cards';
  filterRole?: string;
  className?: string;
  compact?: boolean;
}

export const TeamActivitySummary: React.FC<TeamActivitySummaryProps> = ({
  title = 'Ringkasan Aktivitas Tim Nexus',
  defaultView = 'cards',
  filterRole = 'all',
  className = '',
  compact = false,
}) => {
  const { userProfile } = useAuth();
  const todayDateStr = new Date().toISOString().split('T')[0];

  const [viewMode, setViewMode] = useState<'table' | 'cards'>(defaultView);
  const [selectedDate, setSelectedDate] = useState<string>(todayDateStr);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>(filterRole);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [loading, setLoading] = useState(true);
  const [checkins, setCheckins] = useState<TeamCheckin[]>([]);
  const [teamUsers, setTeamUsers] = useState<UserProfile[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Help Offer Modal
  const [helpTargetCheckin, setHelpTargetCheckin] = useState<TeamCheckin | null>(null);
  const [helpMessage, setHelpMessage] = useState('');
  const [sendingHelp, setSendingHelp] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async (dateStr: string) => {
    setLoading(true);
    try {
      const [allCheckins, users] = await Promise.all([
        getTeamCheckins(dateStr),
        getAllUsers(),
      ]);

      setCheckins(allCheckins);
      // Filter internal team users only (exclude clients)
      const internalUsers = users.filter((u) => u.role !== 'client' && u.role !== 'klien');
      setTeamUsers(internalUsers);
    } catch (err) {
      console.error('Error loading team activity summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedDate);
  }, [selectedDate]);

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

      const refreshed = await getTeamCheckins(selectedDate);
      setCheckins(refreshed);
    } catch (err) {
      console.error('Error sending help offer:', err);
      showToast('Gagal mengirim bantuan. Coba lagi.');
    } finally {
      setSendingHelp(false);
    }
  };

  // Filtered members list
  const filteredUsers = teamUsers.filter((u) => {
    // Search query
    if (
      searchQuery &&
      !u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !(u.title || '').toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }

    // Role filter
    if (roleFilter !== 'all') {
      if (roleFilter === 'konsultan' && u.role !== 'konsultan' && u.role !== 'consultant') {
        return false;
      }
      if (roleFilter !== 'konsultan' && u.role !== roleFilter) {
        return false;
      }
    }

    // Work status filter
    if (statusFilter !== 'all') {
      const memberCheckin = checkins.find((c) => c.userId === u.id);
      if (statusFilter === 'unrecorded') {
        if (memberCheckin) return false;
      } else if (memberCheckin?.workStatus !== statusFilter) {
        return false;
      }
    }

    return true;
  });

  // Calculate Metrics
  const totalInternal = teamUsers.length || 5;
  const checkedInCount = checkins.length;
  const checkinRate = Math.round((checkedInCount / totalInternal) * 100);
  const wfaCount = checkins.filter((c) => c.workStatus === 'WFA').length;
  const officeCount = checkins.filter((c) => c.workStatus === 'Kantor').length;
  const leaveCount = checkins.filter((c) => ['Cuti', 'Sakit', 'Izin'].includes(c.workStatus)).length;
  const activeBlockers = checkins.filter((c) => !!c.blockers && c.blockers.trim().length > 0);

  // Priorities total and completed
  let totalPriorities = 0;
  let completedPriorities = 0;
  checkins.forEach((c) => {
    if (c.priorities) {
      c.priorities.forEach((_, idx) => {
        totalPriorities++;
        if (c.priorityStatuses && c.priorityStatuses[idx] === 'Selesai') {
          completedPriorities++;
        }
      });
    }
  });
  const priorityCompletionRate =
    totalPriorities > 0 ? Math.round((completedPriorities / totalPriorities) * 100) : 0;

  const getWorkStatusBadge = (ws?: WorkStatus) => {
    if (!ws) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">
          Belum Check-in
        </span>
      );
    }
    switch (ws) {
      case 'WFA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
            <Home className="w-3 h-3 text-emerald-600" />
            WFA
          </span>
        );
      case 'Kantor':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-[#00236f]">
            <Building2 className="w-3 h-3 text-[#0051d5]" />
            Kantor Hub
          </span>
        );
      case 'Cuti':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
            <Palmtree className="w-3 h-3 text-purple-600" />
            Cuti
          </span>
        );
      case 'Sakit':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
            <HeartPulse className="w-3 h-3 text-rose-600" />
            Sakit
          </span>
        );
      case 'Izin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
            <FileQuestion className="w-3 h-3 text-amber-600" />
            Izin
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
            {ws}
          </span>
        );
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return 'Owner / Partner';
      case 'konsultan':
      case 'consultant':
        return 'Konsultan';
      case 'tim_grup':
        return 'Tim Grup';
      case 'tim_konten':
        return 'Tim Konten';
      default:
        return 'Staf Ops';
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'konsultan':
      case 'consultant':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'tim_grup':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'tim_konten':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden ${className}`}>
      {/* Toast Notification */}
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

      {/* Header Bar */}
      <div className="p-5 sm:p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 via-white to-blue-50/30 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-8 h-8 rounded-lg bg-[#00236f]/10 text-[#00236f] flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 font-['Plus_Jakarta_Sans'] tracking-tight">
              {title}
            </h2>
            <span className="text-[11px] font-bold bg-[#00236f]/10 text-[#00236f] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              WITA Standup
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Pantau kehadiran harian, sebaran lokasi kerja (WFA vs Kantor), progres 3 fokus utama per anggota, serta deteksi hambatan kerja tim.
          </p>
        </div>

        {/* View Mode Toggle & Date Indicator */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-[#00236f]" />
            <span>
              {selectedDate === todayDateStr
                ? 'Hari Ini'
                : selectedDate}
            </span>
          </div>

          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80 text-xs font-semibold">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'cards'
                  ? 'bg-white text-[#00236f] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Tampilkan format kartu detail"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Kartu</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'table'
                  ? 'bg-white text-[#00236f] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Tampilkan format tabel ringkas"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Tabel</span>
            </button>
          </div>

          <button
            onClick={() => loadData(selectedDate)}
            className="p-2 rounded-xl text-slate-500 hover:text-[#00236f] hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
            title="Muat ulang status aktivitas tim"
          >
            <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Highlight Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-slate-100 bg-slate-50/40 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
        <div className="p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Check-in Rate
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl sm:text-2xl font-extrabold text-[#00236f] font-['Plus_Jakarta_Sans']">
              {checkinRate}%
            </span>
            <span className="text-xs text-slate-500 font-medium">
              ({checkedInCount}/{totalInternal} Anggota)
            </span>
          </div>
          <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-[#00236f] h-full rounded-full transition-all duration-500"
              style={{ width: `${checkinRate}%` }}
            />
          </div>
        </div>

        <div className="p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Distribusi Kehadiran
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl sm:text-2xl font-extrabold text-emerald-700 font-['Plus_Jakarta_Sans']">
              {wfaCount} WFA
            </span>
            <span className="text-xs text-slate-500 font-medium">
              • {officeCount} Kantor Hub
            </span>
          </div>
          <span className="text-[11px] text-slate-500 mt-2">
            {leaveCount > 0 ? `${leaveCount} sedang cuti/izin/sakit` : 'Tidak ada cuti'}
          </span>
        </div>

        <div className="p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Progres Prioritas
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl sm:text-2xl font-extrabold text-[#0051d5] font-['Plus_Jakarta_Sans']">
              {priorityCompletionRate}%
            </span>
            <span className="text-xs text-slate-500 font-medium">
              ({completedPriorities}/{totalPriorities} Tuntas)
            </span>
          </div>
          <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${priorityCompletionRate}%` }}
            />
          </div>
        </div>

        <div className="p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Kendala / Blocker
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span
              className={`text-xl sm:text-2xl font-extrabold font-['Plus_Jakarta_Sans'] ${
                activeBlockers.length > 0 ? 'text-amber-600' : 'text-slate-700'
              }`}
            >
              {activeBlockers.length} Isu
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {activeBlockers.length > 0 ? 'Perlu respon' : 'Lancar'}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 mt-2">
            {activeBlockers.length > 0
              ? 'Rekan tim saling berkolaborasi'
              : 'Seluruh tim bebas hambatan'}
          </span>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari anggota tim atau jabatan..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00236f]/20 focus:border-[#00236f] transition text-xs"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Role Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-semibold text-[11px]">Peran:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-[#00236f] text-xs cursor-pointer"
            >
              <option value="all">Semua Peran</option>
              <option value="owner">Owner / Partner</option>
              <option value="konsultan">Konsultan</option>
              <option value="tim_grup">Tim Grup</option>
              <option value="tim_konten">Tim Konten</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-semibold text-[11px]">Kehadiran:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-[#00236f] text-xs cursor-pointer"
            >
              <option value="all">Semua Status</option>
              <option value="WFA">WFA</option>
              <option value="Kantor">Kantor Hub</option>
              <option value="Cuti">Cuti</option>
              <option value="unrecorded">Belum Check-in</option>
            </select>
          </div>
        </div>
      </div>

      {/* CONTENT: TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Anggota Tim</th>
                <th className="py-3.5 px-3">Peran</th>
                <th className="py-3.5 px-3">Status Kehadiran</th>
                <th className="py-3.5 px-3">Waktu (WITA)</th>
                <th className="py-3.5 px-4 min-w-[280px]">Fokus Prioritas Hari Ini</th>
                <th className="py-3.5 px-3 text-center">Progres</th>
                <th className="py-3.5 px-3 min-w-[200px]">Kendala / Kolaborasi</th>
                <th className="py-3.5 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Tidak ada anggota tim yang cocok dengan kriteria filter.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((member) => {
                  const checkin = checkins.find((c) => c.userId === member.id);
                  const isCurrent = member.id === userProfile?.id;
                  const hasBlocker = !!checkin?.blockers && checkin.blockers.trim().length > 0;

                  const memberTotalPriorities = checkin?.priorities?.length || 0;
                  const memberCompletedPriorities = checkin?.priorities
                    ? checkin.priorities.filter(
                        (_, idx) => checkin.priorityStatuses?.[idx] === 'Selesai'
                      ).length
                    : 0;

                  const completionPercent =
                    memberTotalPriorities > 0
                      ? Math.round((memberCompletedPriorities / memberTotalPriorities) * 100)
                      : 0;

                  return (
                    <tr
                      key={member.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isCurrent ? 'bg-blue-50/20' : ''
                      }`}
                    >
                      {/* 1. Member Profile */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={
                              member.avatarUrl ||
                              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                            }
                            alt={member.displayName}
                            className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5 truncate">
                              <span>{member.displayName}</span>
                              {isCurrent && (
                                <span className="text-[9px] font-bold bg-[#00236f] text-white px-1.5 py-0.2 rounded">
                                  Anda
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">
                              {member.title || member.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Role */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getRoleBadgeStyle(
                            member.role
                          )}`}
                        >
                          {getRoleLabel(member.role)}
                        </span>
                      </td>

                      {/* 3. Work Status & Location */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div>
                          {getWorkStatusBadge(checkin?.workStatus)}
                          {checkin?.locationNote && (
                            <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[130px]">
                              📍 {checkin.locationNote}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 4. Timestamp WITA */}
                      <td className="py-3 px-3 whitespace-nowrap text-[11px] text-slate-500">
                        {checkin?.morningCheckinAt ? (
                          <div>
                            <div className="font-semibold text-slate-700">
                              {formatWITA(checkin.morningCheckinAt)}
                            </div>
                            {checkin.eveningCheckoutAt && (
                              <div className="text-[10px] text-indigo-600 font-semibold mt-0.5">
                                Sore: {formatWITA(checkin.eveningCheckoutAt)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">-</span>
                        )}
                      </td>

                      {/* 5. Priorities List */}
                      <td className="py-3 px-4">
                        {checkin?.priorities && checkin.priorities.length > 0 ? (
                          <div className="space-y-1">
                            {checkin.priorities.map((item, idx) => {
                              const st = checkin.priorityStatuses?.[idx] || 'Belum';
                              return (
                                <div key={idx} className="flex items-center gap-1.5 text-[11px]">
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                      st === 'Selesai'
                                        ? 'bg-emerald-500'
                                        : st === 'Berjalan'
                                        ? 'bg-amber-500'
                                        : 'bg-slate-300'
                                    }`}
                                  />
                                  <span
                                    className={`truncate max-w-[240px] ${
                                      st === 'Selesai' ? 'line-through text-slate-400' : 'text-slate-700'
                                    }`}
                                  >
                                    {item}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">
                            {checkin ? 'Belum mencatat prioritas' : 'Menunggu check-in'}
                          </span>
                        )}
                      </td>

                      {/* 6. Progress Completion */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {memberTotalPriorities > 0 ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="font-bold text-xs text-slate-900">
                              {memberCompletedPriorities}/{memberTotalPriorities}
                            </span>
                            <span className="text-[10px] text-emerald-700 font-semibold">
                              {completionPercent}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[10px]">-</span>
                        )}
                      </td>

                      {/* 7. Blocker & Help Info */}
                      <td className="py-3 px-3">
                        {hasBlocker ? (
                          <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900 space-y-1">
                            <div className="flex items-start gap-1 font-semibold text-amber-800">
                              <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                              <span className="line-clamp-2">{checkin?.blockers}</span>
                            </div>
                            {checkin?.helpOffers && checkin.helpOffers.length > 0 && (
                              <div className="text-[10px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold inline-block">
                                ✓ {checkin.helpOffers.length} bantuan masuk
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Tidak ada kendala</span>
                        )}
                      </td>

                      {/* 8. Action Button */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        {hasBlocker && !isCurrent ? (
                          <button
                            onClick={() => {
                              setHelpTargetCheckin(checkin!);
                              setHelpMessage('');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 ml-auto shadow-2xs"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>Bantu</span>
                          </button>
                        ) : (
                          <span className="text-slate-300 text-[10px]">•</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* CONTENT: CARD GRID VIEW */}
      {viewMode === 'cards' && (
        <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.length === 0 ? (
            <div className="col-span-full py-10 text-center text-slate-400 text-xs">
              Tidak ada anggota tim yang cocok dengan kriteria filter.
            </div>
          ) : (
            filteredUsers.map((member) => {
              const checkin = checkins.find((c) => c.userId === member.id);
              const isCurrent = member.id === userProfile?.id;
              const hasBlocker = !!checkin?.blockers && checkin.blockers.trim().length > 0;

              const memberTotalPriorities = checkin?.priorities?.length || 0;
              const memberCompletedPriorities = checkin?.priorities
                ? checkin.priorities.filter(
                    (_, idx) => checkin.priorityStatuses?.[idx] === 'Selesai'
                  ).length
                : 0;

              const completionPercent =
                memberTotalPriorities > 0
                  ? Math.round((memberCompletedPriorities / memberTotalPriorities) * 100)
                  : 0;

              return (
                <div
                  key={member.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                    isCurrent
                      ? 'bg-blue-50/30 border-blue-200 shadow-2xs ring-1 ring-blue-100'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div>
                    {/* Top Header: Avatar, Name, Role */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={
                            member.avatarUrl ||
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                          }
                          alt={member.displayName}
                          className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {member.displayName}
                            </span>
                            {isCurrent && (
                              <span className="text-[9px] font-bold bg-[#00236f] text-white px-1.5 py-0.2 rounded shrink-0">
                                Anda
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 block truncate">
                            {member.title || getRoleLabel(member.role)}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {getWorkStatusBadge(checkin?.workStatus)}
                        {checkin?.morningCheckinAt && (
                          <div className="text-[9px] text-slate-400 mt-1">
                            {formatWITA(checkin.morningCheckinAt)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Location Tag */}
                    {checkin?.locationNote && (
                      <div className="text-[11px] text-slate-600 mb-2.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-100 italic truncate">
                        📍 {checkin.locationNote}
                      </div>
                    )}

                    {/* Priorities Section */}
                    <div className="space-y-1.5 mb-3 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <span>Fokus Prioritas Hari Ini:</span>
                        {memberTotalPriorities > 0 && (
                          <span className="text-emerald-700">
                            {memberCompletedPriorities}/{memberTotalPriorities} ({completionPercent}%)
                          </span>
                        )}
                      </div>

                      {checkin?.priorities && checkin.priorities.length > 0 ? (
                        <div className="space-y-1">
                          {checkin.priorities.map((item, idx) => {
                            const st = checkin.priorityStatuses?.[idx] || 'Belum';
                            return (
                              <div
                                key={idx}
                                className="flex items-center justify-between text-xs py-0.5 gap-2"
                              >
                                <span
                                  className={`truncate ${
                                    st === 'Selesai'
                                      ? 'line-through text-slate-400'
                                      : 'text-slate-800 font-medium'
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
                        <div className="text-[11px] text-slate-400 italic py-1">
                          {checkin
                            ? 'Belum merincikan target prioritas.'
                            : 'Anggota belum melakukan check-in hari ini.'}
                        </div>
                      )}
                    </div>

                    {/* Blocker Card Section */}
                    {hasBlocker && (
                      <div className="p-2.5 rounded-lg bg-amber-50/80 border border-amber-200 text-xs text-amber-900 space-y-1.5 mb-3">
                        <div className="flex items-start gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-[10px] uppercase tracking-wider text-amber-800 block">
                              Kendala / Butuh Dukungan:
                            </span>
                            <p className="text-[11px] text-amber-800 mt-0.5">
                              {checkin?.blockers}
                            </p>
                          </div>
                        </div>

                        {checkin?.helpOffers && checkin.helpOffers.length > 0 && (
                          <div className="pt-1.5 border-t border-amber-200/60 space-y-1">
                            <span className="text-[10px] font-bold text-amber-900 block">
                              Bantuan Rekan Tim ({checkin.helpOffers.length}):
                            </span>
                            {checkin.helpOffers.slice(0, 2).map((ho) => (
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
                      </div>
                    )}

                    {/* Evening Checkout Notes */}
                    {(checkin?.checkoutNotes || checkin?.eveningNotes) && (
                      <div className="p-2 rounded-lg bg-indigo-50/60 border border-indigo-100 text-[11px] text-indigo-900 mb-2">
                        <span className="font-bold text-[10px] uppercase text-indigo-800 block">
                          Catatan Sore:
                        </span>
                        <p className="mt-0.5 line-clamp-2">
                          {checkin.checkoutNotes || checkin.eveningNotes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Card Footer: Offer Help or Status */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[10px] text-slate-400">
                      {checkin?.updatedAt
                        ? `Sinkron: ${formatWITA(checkin.updatedAt)}`
                        : 'Menunggu aktivitas'}
                    </span>

                    {hasBlocker && !isCurrent ? (
                      <button
                        onClick={() => {
                          setHelpTargetCheckin(checkin!);
                          setHelpMessage('');
                        }}
                        className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Tawarkan Bantuan</span>
                      </button>
                    ) : (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getRoleBadgeStyle(
                          member.role
                        )}`}
                      >
                        {getRoleLabel(member.role)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
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
                Kendala yang dihadapi:
              </span>
              <p className="mt-0.5">{helpTargetCheckin.blockers}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pesan Bantuan / Jadwal Sinkronisasi:
              </label>
              <textarea
                rows={3}
                value={helpMessage}
                onChange={(e) => setHelpMessage(e.target.value)}
                placeholder="Contoh: 'Saya ada waktu luang jam 14:00 WITA untuk bantu review draf atau analisis datanya.'"
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
                <span>Kirim Bantuan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
