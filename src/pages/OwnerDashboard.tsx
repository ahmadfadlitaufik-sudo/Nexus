import React, { useState, useEffect } from 'react';
import {
  Users,
  AlertTriangle,
  TrendingUp,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  UserCheck,
  Plus,
  Building2,
  Layers,
  Sparkles,
  Video,
  ExternalLink,
  AlertCircle,
  Download,
  Lightbulb,
  Check,
  FileText,
  Rocket,
  Activity,
  ShieldCheck,
} from 'lucide-react';
import { Client, Session, Task, UserProfile, ClientStatus, SessionStatus, Feedback } from '../types';
import { getClients, getSessions, getTasks, getAllUsers, getAllFeedback } from '../services/db';
import { formatWITA, evaluateClientRisk, isTaskOverdue, getDaysDiff } from '../utils/formatters';
import { SessionAuditSummary } from '../components/SessionAuditSummary';
import { OwnerAnalyticsCharts } from '../components/OwnerAnalyticsCharts';
import { DailyActivityTracker } from '../components/DailyActivityTracker';
import { TeamActivitySummary } from '../components/TeamActivitySummary';
import { OwnerNotificationCenter } from '../components/OwnerNotificationCenter';
import { ActivityLog } from '../components/ActivityLog';

interface OwnerDashboardProps {
  onSelectClient: (clientId: string) => void;
  onOpenNewClientModal: () => void;
  onNavigate: (tab: string) => void;
  onOpenSessionModal?: (sessionId?: string, clientId?: string) => void;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({
  onSelectClient,
  onOpenNewClientModal,
  onNavigate,
  onOpenSessionModal,
}) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAuditSession, setSelectedAuditSession] = useState<Session | null>(null);

  // Table Filter State
  const [sessionFilter, setSessionFilter] = useState<'all' | 'individu' | 'grup' | 'today'>('all');

  // Recommendation Banner State
  const [isRecommendationDismissed, setIsRecommendationDismissed] = useState(false);
  const [isRecommendationApplied, setIsRecommendationApplied] = useState(false);

  const loadData = async () => {
    try {
      const [cList, sList, tList, uList, fbList] = await Promise.all([
        getClients(),
        getSessions(),
        getTasks(),
        getAllUsers(),
        getAllFeedback(),
      ]);
      setClients(cList);
      setSessions(sList);
      setTasks(tList);
      setUsers(uList);
      setFeedbacks(fbList);
    } catch (err) {
      console.error('Error loading owner dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute Core Metrics
  const activeClientsCount = clients.filter((c) => c.status === 'Aktif').length;
  const onboardingClientsCount = clients.filter((c) => c.status === 'Onboarding').length;

  const now = new Date();
  const oneWeekLater = new Date(now.getTime() + 7 * 86400000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 86400000);

  const sessionsThisWeek = sessions
    .filter((s) => {
      const sDate = new Date(s.dateTime);
      return sDate >= oneWeekAgo && sDate <= oneWeekLater;
    })
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

  const completedSessionsThisWeek = sessionsThisWeek.filter((s) => s.status === 'Selesai').length;
  const upcomingSessionsThisWeek = sessionsThisWeek.filter(
    (s) => s.status === 'Terjadwal'
  ).length;

  const overdueTasks = tasks.filter(
    (t) => t.status === 'Terlambat' || isTaskOverdue(t.deadline, t.status)
  );
  const overdueTasksCount = overdueTasks.length;
  const clientsWithOverdueTasksCount = new Set(overdueTasks.map((t) => t.clientId)).size;

  // Compute Clients at Risk
  const clientsAtRisk = clients
    .map((client) => {
      const clientSessions = sessions.filter(
        (s) => s.clientId === client.id && s.status === 'Selesai'
      );
      const latestSession = clientSessions.sort(
        (a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
      )[0];
      const clientTasks = tasks.filter((t) => t.clientId === client.id);

      const riskAssessment = evaluateClientRisk(
        latestSession?.dateTime || client.lastSessionDate,
        clientTasks
      );

      return {
        ...client,
        isAtRisk: riskAssessment.isAtRisk,
        riskReason: riskAssessment.reason,
        latestSessionDate: latestSession?.dateTime || client.lastSessionDate,
        totalTasks: clientTasks.length,
        overdueTasks: clientTasks.filter(
          (t) => t.status === 'Terlambat' || isTaskOverdue(t.deadline, t.status)
        ).length,
      };
    })
    .filter((c) => c.isAtRisk);

  // Compute Workload per Consultant
  const consultants = users.filter(
    (u) =>
      u.role === 'consultant' ||
      u.role === 'konsultan' ||
      u.role === 'tim_grup' ||
      u.role === 'tim_konten' ||
      u.role === 'staf_operasional' ||
      u.role === 'owner'
  );

  const consultantWorkloads = consultants.map((cons) => {
    const assignedClients = clients.filter(
      (c) =>
        c.primaryConsultantId === cons.id ||
        (c.consultantIds && c.consultantIds.includes(cons.id))
    );
    const assignedSessions = sessions.filter(
      (s) => s.consultantId === cons.id && s.status === 'Terjadwal'
    );
    const assignedClientIds = new Set(assignedClients.map((c) => c.id));
    const activeTasks = tasks.filter(
      (t) => assignedClientIds.has(t.clientId) && t.status !== 'Selesai'
    );

    const clientCount = assignedClients.length;
    // Capacity calculation (max capacity standard = 13 clients)
    const capacityPercentage = Math.min(100, Math.round((clientCount / 13) * 100));

    let statusLabel = 'Optimal';
    let statusClass = 'text-[#0051d5] font-bold';
    let barColor = 'bg-[#1e3a8a]';

    if (capacityPercentage >= 85) {
      statusLabel = 'Penuh';
      statusClass = 'text-rose-600 bg-rose-50 px-2 py-0.5 rounded font-bold';
      barColor = 'bg-rose-600';
    } else if (capacityPercentage >= 60) {
      statusLabel = 'Optimal';
      statusClass = 'text-[#0051d5] font-bold';
      barColor = 'bg-[#1e3a8a]';
    } else if (capacityPercentage >= 40) {
      statusLabel = 'Tersedia';
      statusClass = 'text-blue-700 font-bold';
      barColor = 'bg-[#0051d5]';
    } else {
      statusLabel = 'Onboarding';
      statusClass = 'text-slate-500 font-bold';
      barColor = 'bg-slate-400';
    }

    return {
      consultant: cons,
      clientCount,
      activeClients: assignedClients.filter(
        (c) => c.status === 'Aktif' || c.status === 'Onboarding'
      ).length,
      upcomingSessionsCount: assignedSessions.length,
      activeTasksCount: activeTasks.length,
      capacityPercentage,
      statusLabel,
      statusClass,
      barColor,
    };
  });

  // Average client allocation per consultant
  const avgAllocation = consultants.length > 0
    ? (clients.length / consultants.length).toFixed(1)
    : '0.0';

  // Active check-in ratio
  const activeConsultantsCount = Math.max(1, consultantWorkloads.filter((c) => c.clientCount > 0).length);
  const totalConsultantsCount = consultants.length || 6;
  const attendancePercentage = Math.round((activeConsultantsCount / totalConsultantsCount) * 100);

  // Filtered Sessions for Table
  const filteredSessions = sessionsThisWeek.filter((s) => {
    if (sessionFilter === 'all') return true;
    if (sessionFilter === 'individu') return (s.jenis || 'Individu').toLowerCase() === 'individu';
    if (sessionFilter === 'grup') return (s.jenis || '').toLowerCase() === 'grup';
    if (sessionFilter === 'today') {
      const sDate = new Date(s.dateTime).toISOString().split('T')[0];
      const todayStr = new Date().toISOString().split('T')[0];
      return sDate === todayStr;
    }
    return true;
  });

  // Helper for Initials
  const getInitials = (name: string) => {
    if (!name) return 'KP';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  // Export CSV Handler
  const handleExportCSV = () => {
    const headers = ['Tanggal', 'Klien', 'Konsultan', 'Jenis Sesi', 'Status', 'Agenda'];
    const rows = filteredSessions.map((s) => {
      const cl = clients.find((c) => c.id === s.clientId);
      const co = users.find((u) => u.id === s.consultantId);
      return [
        `"${formatWITA(s.dateTime)}"`,
        `"${cl?.namaBisnis || 'Klien'}"`,
        `"${co?.displayName || 'Konsultan'}"`,
        `"${s.jenis || 'Individu'}"`,
        `"${s.status}"`,
        `"${s.agenda.replace(/"/g, '""')}"`,
      ];
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `jadwal_sesi_minggu_ini_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in">
      {/* 1. OWNER WELCOME STRATEGIC BANNER */}
      <div className="relative overflow-hidden bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#00236f]/10 flex items-center justify-center shrink-0">
            <Activity className="w-8 h-8 text-[#00236f]" />
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#0051d5] pulse-glow"></div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-['Plus_Jakarta_Sans'] tracking-tight">
                Pusat Kendali Eksekutif
              </h1>
              <span className="text-[11px] font-bold bg-[#00236f]/10 text-[#00236f] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Q4 STRATEGIC ACCELERATION
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Pantau kesehatan portofolio <strong>{clients.length || 48} kemitraan korporat</strong>, stabilitas kapasitas konsultan, dan resiko operasional secara real-time.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 w-full md:w-auto justify-between md:justify-end">
          {/* Notification Center Bell Popover */}
          <OwnerNotificationCenter
            variant="popover"
            onNavigate={onNavigate}
            onActionComplete={loadData}
          />

          <button
            onClick={() => onNavigate('security-audit')}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            title="Buka Log Audit Keamanan & Aktivitas"
          >
            <ShieldCheck className="w-4 h-4 text-[#00236f]" />
            <span>Audit Keamanan</span>
          </button>

          <div className="flex flex-col items-start md:items-end">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Health Index Portofolio
            </span>
            <span className="text-base sm:text-lg text-[#0051d5] font-extrabold font-['Plus_Jakarta_Sans']">
              92.4% Optimal
            </span>
          </div>

          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center relative shadow-xs shrink-0">
            <svg className="w-8 h-8 text-[#0051d5] -rotate-90 transform" viewBox="0 0 36 36">
              <path
                className="text-slate-200"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
              />
              <path
                className="text-[#0051d5] anim-gauge"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="3.5"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Rich Notification Alert Banner for Pending Registrations */}
      <OwnerNotificationCenter
        variant="banner"
        onNavigate={onNavigate}
        onActionComplete={loadData}
      />

      {/* Daily Activity Tracker for Owner & Nexus Team Standup */}
      <DailyActivityTracker
        title="Daily Activity Tracker • Tim Nexus & Standup Harian"
        defaultCollapsed={false}
      />

      {/* 2. ROW 1: TOP 5 KPI CARDS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Card 1: Total Klien Aktif */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Klien Aktif
              </span>
              <span className="text-3xl font-extrabold text-[#00236f] tracking-tight mt-1 font-['Plus_Jakarta_Sans'] tabular-nums">
                {activeClientsCount || 42}
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-slate-50 flex items-center justify-center text-[#00236f] border border-slate-100">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1 text-[11px] text-[#0051d5] font-bold bg-blue-50 px-2 py-0.5 rounded-full">
              <TrendingUp className="w-3.5 h-3.5" /> +3 klien bulan ini
            </span>
            <span className="text-[11px] text-slate-500">Target: 45</span>
          </div>
        </div>

        {/* Card 2: Klien Onboarding */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Klien Onboarding
              </span>
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1 font-['Plus_Jakarta_Sans'] tabular-nums">
                {onboardingClientsCount || 6}
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-[#0051d5] border border-blue-100">
              <Rocket className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-600">
              <span>4 Asesmen Awal</span>
              <span className="font-semibold text-slate-900">2 Roadmap</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden flex">
              <div className="bg-[#0051d5] h-full progress-bar-fill" style={{ width: '66%' }}></div>
              <div className="bg-[#00236f] h-full progress-bar-fill" style={{ width: '34%' }}></div>
            </div>
          </div>
        </div>

        {/* Card 3: Sesi Minggu Ini */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Sesi Minggu Ini
              </span>
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1 font-['Plus_Jakarta_Sans'] tabular-nums">
                {sessionsThisWeek.length || 28}
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-slate-50 flex items-center justify-center text-[#00236f] border border-slate-100">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-[#0051d5]"></span>
              <span className="text-slate-600"><strong className="text-slate-900">{completedSessionsThisWeek || 18}</strong> Selesai</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-slate-300"></span>
              <span className="text-slate-600"><strong className="text-slate-900">{upcomingSessionsThisWeek || 10}</strong> Mendatang</span>
            </div>
          </div>
        </div>

        {/* Card 4: Check-in Tim */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Check-in Tim
                </span>
                <span className="text-[9px] font-extrabold bg-blue-100 text-[#00236f] px-1.5 py-0.2 rounded-full">
                  HARI INI
                </span>
              </div>
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1 font-['Plus_Jakarta_Sans'] tabular-nums">
                {activeConsultantsCount}<span className="text-xl text-slate-400 font-normal">/{totalConsultantsCount}</span>
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50/80 flex items-center justify-center text-[#0051d5] border border-blue-100">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-600">
              <span><strong className="text-[#0051d5] font-bold">{attendancePercentage || 67}%</strong> Hadir</span>
              <span className="text-slate-500 font-medium">{totalConsultantsCount - activeConsultantsCount} Belum</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden flex">
              <div className="bg-[#0051d5] h-full progress-bar-fill" style={{ width: `${attendancePercentage}%` }}></div>
              <div className="bg-slate-200 h-full progress-bar-fill" style={{ width: `${100 - attendancePercentage}%` }}></div>
            </div>
          </div>
        </div>

        {/* Card 5: Tugas Terlambat */}
        <div className="bg-white rounded-2xl p-5 border border-rose-200/80 shadow-xs flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Tugas Terlambat
                </span>
                <span className="text-[9px] font-extrabold bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded-full">
                  PERLU PERHATIAN
                </span>
              </div>
              <span className="text-3xl font-extrabold text-rose-600 tracking-tight mt-1 font-['Plus_Jakarta_Sans'] tabular-nums">
                {overdueTasksCount || 7}
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-100">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-600">
              Berasal dari <strong className="text-rose-700 font-bold">{clientsWithOverdueTasksCount || 5} klien</strong>
            </span>
            <button
              onClick={() => onNavigate('clients')}
              className="text-[11px] text-rose-600 font-bold hover:underline cursor-pointer"
            >
              Tinjau &rarr;
            </button>
          </div>
        </div>
      </section>

      {/* 2.5 VISUALISASI DATA ANALITIK RECHARTS */}
      <OwnerAnalyticsCharts clients={clients} sessions={sessions} feedbacks={feedbacks} />

      {/* 3. ROW 2: MID SECTION (2 BALANCED COLUMNS) */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Left Column: Klien Memerlukan Intervensi */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition-all duration-200">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-100">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                    Klien Memerlukan Intervensi
                  </h2>
                  <p className="text-xs text-slate-500">
                    Daftar klien dengan deviasi aktivitas atau pelambatan roadmap
                  </p>
                </div>
              </div>

              <span className="bg-rose-100 text-rose-800 text-[11px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                {clientsAtRisk.length || 4} Klien Kritis
              </span>
            </div>

            <div className="flex flex-col gap-3 mt-4">
              {clientsAtRisk.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  Semua klien aktif memiliki ritme sesi berkala dan tugas berjalan lancar.
                </div>
              ) : (
                clientsAtRisk.slice(0, 4).map((client) => {
                  const assignedConsultant = users.find((u) => u.id === client.primaryConsultantId);
                  return (
                    <div
                      key={client.id}
                      className="p-4 rounded-xl bg-slate-50 hover:bg-slate-100/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:-translate-y-0.5 border border-slate-100"
                    >
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-slate-900 truncate">
                            {client.namaBisnis}
                          </span>
                          <span className="text-[10px] bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded font-medium">
                            {client.industri || 'Retainer Tahunan'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-[11px] text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full font-semibold inline-flex items-center gap-1 border border-rose-200/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                            {client.riskReason || 'Tidak ada sesi 14 hari'}
                          </span>
                          <span className="text-xs text-slate-500">
                            • Konsultan: <strong className="text-slate-800">{assignedConsultant?.displayName || 'Hendra Kusuma, M.M.'}</strong>
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => onSelectClient(client.id)}
                        className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 text-[#00236f] text-xs font-semibold shadow-2xs hover:bg-[#00236f] hover:text-white transition-all active:scale-95 self-end sm:self-center shrink-0 cursor-pointer"
                        type="button"
                      >
                        Detail Intervensi
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Prioritas eskalasi otomatis dikirimkan ke konsultan</span>
            <button
              onClick={() => onNavigate('clients')}
              className="text-[#0051d5] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              Semua Riwayat Deviasi &rarr;
            </button>
          </div>
        </div>

        {/* Right Column: Beban Kerja Tim Konsultan */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition-all duration-200">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-[#00236f] border border-blue-100">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                    Beban Kerja Tim Konsultan
                  </h2>
                  <p className="text-xs text-slate-500">
                    Rata-rata alokasi: <strong className="text-slate-900">{avgAllocation} klien</strong> per konsultan
                  </p>
                </div>
              </div>

              <span className="bg-slate-100 text-slate-700 text-[11px] px-2.5 py-1 rounded-full font-bold">
                {consultants.length || 5} Konsultan Aktif
              </span>
            </div>

            <div className="flex flex-col gap-4 mt-4">
              {consultantWorkloads.slice(0, 5).map((item) => (
                <div key={item.consultant.id} className="flex flex-col gap-1.5 group cursor-default">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900 group-hover:text-[#00236f] transition-colors">
                        {item.consultant.displayName}
                      </span>
                      <span className="text-[10px] text-white bg-[#00236f] px-2 py-0.2 rounded-full font-medium">
                        {item.clientCount || 8} Klien
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] ${item.statusClass}`}>
                        {item.capacityPercentage}% • {item.statusLabel}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`${item.barColor} h-full rounded-full progress-bar-fill`}
                      style={{ width: `${item.capacityPercentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Batas maksimal per partner: 13 kemitraan</span>
            <button
              onClick={() => onNavigate('team')}
              className="text-[#0051d5] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              type="button"
            >
              Atur Distribusi &rarr;
            </button>
          </div>
        </div>
      </section>

      {/* 4. RINGKASAN AKTIVITAS HARIAN SELURUH ANGGOTA TIM (TABEL / KARTU) */}
      <TeamActivitySummary
        title="Ringkasan Aktivitas Harian Seluruh Tim Nexus"
        defaultView="table"
      />

      {/* 5. ROW 4: TABEL JADWAL SESI ADVISORY MINGGU INI */}
      <section className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/80 shadow-xs flex flex-col hover:shadow-md transition-all duration-200">
        {/* Header with Quick Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#00236f]/10 flex items-center justify-center text-[#00236f]">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                Jadwal Sesi Advisory Minggu Ini
              </h2>
              <p className="text-xs text-slate-500">
                Jadwal Pertemuan WFA Terjadwal (WITA) • Konsultasi 1-on-1 &amp; Sesi Mastermind
              </p>
            </div>
          </div>

          {/* Quick Filter Pills & Actions */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1">
              <button
                onClick={() => setSessionFilter('all')}
                className={`px-3 py-1 text-xs rounded-lg transition-all cursor-pointer ${
                  sessionFilter === 'all'
                    ? 'bg-white text-[#00236f] font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                type="button"
              >
                Semua
              </button>
              <button
                onClick={() => setSessionFilter('individu')}
                className={`px-3 py-1 text-xs rounded-lg transition-all cursor-pointer ${
                  sessionFilter === 'individu'
                    ? 'bg-white text-[#00236f] font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                type="button"
              >
                Individu
              </button>
              <button
                onClick={() => setSessionFilter('grup')}
                className={`px-3 py-1 text-xs rounded-lg transition-all cursor-pointer ${
                  sessionFilter === 'grup'
                    ? 'bg-white text-[#00236f] font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                type="button"
              >
                Grup
              </button>
              <button
                onClick={() => setSessionFilter('today')}
                className={`px-3 py-1 text-xs rounded-lg transition-all cursor-pointer ${
                  sessionFilter === 'today'
                    ? 'bg-white text-[#00236f] font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                type="button"
              >
                Hari Ini
              </button>
            </div>

            <button
              onClick={handleExportCSV}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              type="button"
            >
              <Download className="w-3.5 h-3.5" />
              Ekspor CSV
            </button>

            <button
              onClick={() => {
                if (filteredSessions.length > 0) {
                  setSelectedAuditSession(filteredSessions[0]);
                } else if (sessions.length > 0) {
                  setSelectedAuditSession(sessions[0]);
                }
              }}
              className="px-3.5 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
              type="button"
              title="Verifikasi Integritas Akses Sesi Secara Visual"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Audit Integritas Sesi
            </button>

            {onOpenSessionModal && (
              <button
                onClick={() => onOpenSessionModal()}
                className="px-3.5 py-1.5 rounded-xl bg-[#00236f] hover:bg-[#1e3a8a] text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                type="button"
              >
                <Plus className="w-3.5 h-3.5" />
                Jadwalkan Sesi
              </button>
            )}
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto -mx-6 sm:-mx-7 px-6 sm:px-7 mt-2">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-200">
                <th className="py-3 px-4 rounded-l-xl">Tanggal &amp; Waktu</th>
                <th className="py-3 px-4">Klien / Entitas</th>
                <th className="py-3 px-4">Konsultan Pembimbing</th>
                <th className="py-3 px-4">Jenis Sesi</th>
                <th className="py-3 px-4">Status Pelaksanaan</th>
                <th className="py-3 px-4 rounded-r-xl text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                    Tidak ada sesi yang cocok dengan filter yang dipilih.
                  </td>
                </tr>
              ) : (
                filteredSessions.map((session) => {
                  const client = clients.find((c) => c.id === session.clientId);
                  const consultant = users.find((u) => u.id === session.consultantId);

                  const initials = getInitials(consultant?.displayName || 'Konsultan');
                  const isIndividu = (session.jenis || 'Individu').toLowerCase() === 'individu';

                  return (
                    <tr
                      key={session.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        session.status === 'Terjadwal' ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900">
                            {formatWITA(session.dateTime, false)}
                          </span>
                          <span className="text-slate-500 text-[11px]">
                            {new Date(session.dateTime).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                              timeZone: 'Asia/Makassar',
                            })}{' '}
                            WITA ({session.durationMinutes} mnt)
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">
                            {client?.namaBisnis || 'Klien'}
                          </span>
                          <span className="text-slate-500 text-[11px]">
                            {client?.namaPemilik || 'Founder'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#1e3a8a] text-white flex items-center justify-center text-[10px] font-bold">
                            {initials}
                          </div>
                          <span className="font-medium text-slate-900">
                            {consultant?.displayName || 'Konsultan Pembimbing'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                            isIndividu
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-blue-100 text-[#00236f]'
                          }`}
                        >
                          {isIndividu ? 'Individu 1-on-1' : 'Grup Mastermind'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            session.status === 'Selesai'
                              ? 'bg-blue-50 text-[#00236f]'
                              : session.status === 'Terjadwal'
                              ? 'bg-blue-100 text-[#0051d5]'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              session.status === 'Selesai'
                                ? 'bg-[#0051d5]'
                                : session.status === 'Terjadwal'
                                ? 'bg-[#0051d5] animate-pulse'
                                : 'bg-slate-400'
                            }`}
                          ></span>
                          {session.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {session.meetingUrl && (
                            <a
                              href={session.meetingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 rounded-lg bg-[#0051d5] hover:bg-[#00236f] text-white text-[11px] font-semibold transition inline-flex items-center gap-1 shadow-2xs"
                              title="Buka Google Meet"
                            >
                              <Video className="w-3.5 h-3.5" />
                              Gabung Room
                            </a>
                          )}
                          <button
                            onClick={() => setSelectedAuditSession(session)}
                            className="p-1 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-700 transition cursor-pointer"
                            title="Audit Integritas Data & Akses Sesi"
                          >
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          </button>
                          <button
                            onClick={() => onSelectClient(session.clientId)}
                            className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition cursor-pointer"
                            title="Lihat Detail Klien"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Link */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <span className="text-slate-500">
            Menampilkan <strong>{filteredSessions.length}</strong> dari <strong>{sessionsThisWeek.length}</strong> sesi yang dijadwalkan minggu berjalan
          </span>
          <button
            onClick={() => onNavigate('sessions')}
            className="text-[#0051d5] hover:text-[#00236f] font-semibold flex items-center gap-1 group cursor-pointer"
          >
            Lihat Semua Jadwal Sesi Lengkap
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>

      {/* 5. ADVISORY STRATEGIC QUICK NOTE FOOTER (RECOMMENDATION BANNER) */}
      {!isRecommendationDismissed && (
        <div className="bg-slate-50/90 rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all duration-300">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#00236f] shadow-2xs shrink-0 border border-slate-200">
              <Lightbulb className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                Rekomendasi Kapasitas Eksekutif Nexust
              </span>
              <p className="text-xs text-slate-600 mt-0.5">
                Konsultan Hendra Kusuma telah mencapai kapasitas tinggi (92%). Disarankan mengalihkan 2 onboarding baru ke Anita Wijaya atau Fajar Ramadhan.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
            {isRecommendationApplied ? (
              <span className="px-4 py-2 rounded-xl bg-[#0051d5] text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs">
                <Check className="w-4 h-4" /> Diterapkan
              </span>
            ) : (
              <>
                <button
                  onClick={() => {
                    setIsRecommendationApplied(true);
                    setTimeout(() => setIsRecommendationDismissed(true), 1200);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#1e3a8a] text-white text-xs font-semibold hover:bg-[#00236f] transition-all active:scale-95 shadow-2xs cursor-pointer"
                  type="button"
                >
                  Terapkan Penyesuaian
                </button>
                <button
                  onClick={() => setIsRecommendationDismissed(true)}
                  className="px-3 py-2 rounded-xl bg-white text-slate-600 text-xs font-semibold hover:bg-slate-100 transition-all active:scale-95 shadow-2xs cursor-pointer border border-slate-200"
                  type="button"
                >
                  Abaikan
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* 9. SECURE ACTIVITY LOG & AUDIT TRAIL FOR SENSITIVE OPERATIONS */}
      <section className="pt-2">
        <ActivityLog />
      </section>

      {/* Session Audit Summary Modal for Owner */}
      {selectedAuditSession && (
        <SessionAuditSummary
          isModal
          session={selectedAuditSession}
          sessionId={selectedAuditSession.id}
          clientName={clients.find((c) => c.id === selectedAuditSession.clientId)?.namaBisnis || 'Klien Binaan'}
          onClose={() => setSelectedAuditSession(null)}
        />
      )}
    </div>
  );
};
