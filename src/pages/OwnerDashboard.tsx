import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  Plus,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
  Video,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ActivityLog, Client, Session, Task, TeamCheckin, UserProfile } from '../types';
import { getActivityLogs, getAllUsers, getClients, getSessions, getTasks } from '../services/db';
import { getCheckinsByDate, getTodosForUser, isOpen, TodoItem } from '../services/teamDaily';
import { dateWITA, evaluateClientRisk, isTaskOverdue, shiftDate, timeWITA, todayWITA } from '../utils/formatters';
import { OwnerNotificationCenter } from '../components/OwnerNotificationCenter';

interface OwnerDashboardProps {
  onSelectClient: (clientId: string) => void;
  onOpenNewClientModal: () => void;
  onNavigate: (tab: string) => void;
  onOpenSessionModal?: (sessionId?: string, clientId?: string) => void;
}

const TEAM_ROLES = ['owner', 'konsultan', 'consultant', 'tim_grup', 'tim_konten', 'staf_operasional'];
const ADVISORY_ROLES = ['owner', 'konsultan', 'consultant', 'tim_grup'];
const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  konsultan: 'Konsultan',
  consultant: 'Konsultan',
  tim_grup: 'Tim Grup',
  tim_konten: 'Tim Konten',
  staf_operasional: 'Staf Operasional',
};

/** Senin pada minggu berjalan (WITA), format YYYY-MM-DD. */
function mondayOf(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Minggu
  return shiftDate(dateStr, dow === 0 ? -6 : 1 - dow);
}

function relativeTime(iso?: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return 'baru saja';
  if (min < 60) return `${min} mnt lalu`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.round(h / 24);
  return d === 1 ? 'kemarin' : `${d} hari lalu`;
}

function greeting(): string {
  const h = Number(timeWITA(new Date().toISOString()).split(/[.:]/)[0]);
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 18) return 'Selamat sore';
  return 'Selamat malam';
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`bg-white rounded-2xl border border-slate-200 p-5 ${className}`}>{children}</section>;
}

function CardHeader({
  icon: Icon,
  title,
  action,
}: {
  icon: React.ElementType;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 mb-4">
      <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
        <Icon className="w-4 h-4 text-[#0051d5]" /> {title}
      </h2>
      {action}
    </div>
  );
}

function LinkButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs font-semibold text-[#0051d5] hover:underline cursor-pointer inline-flex items-center gap-1"
    >
      {children} <ArrowRight className="w-3 h-3" />
    </button>
  );
}

function Kpi({
  label,
  value,
  sub,
  icon: Icon,
  tone = 'default',
  trend,
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  sub: React.ReactNode;
  icon: React.ElementType;
  tone?: 'default' | 'danger' | 'success';
  trend?: { value: number; label: string } | null;
  onClick?: () => void;
}) {
  const toneCls =
    tone === 'danger' ? 'text-rose-600' : tone === 'success' ? 'text-emerald-700' : 'text-slate-900';
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left bg-white rounded-2xl border border-slate-200 p-5 hover:border-[#0051d5]/40 hover:shadow-sm transition cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold text-slate-500">{label}</span>
        <span className="w-9 h-9 rounded-xl bg-[#00236f]/5 text-[#00236f] flex items-center justify-center shrink-0">
          <Icon className="w-4.5 h-4.5" />
        </span>
      </div>
      <div className={`text-3xl font-black tracking-tight mt-1 tabular-nums font-['Plus_Jakarta_Sans'] ${toneCls}`}>
        {value}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
        {trend && trend.value !== 0 && (
          <span
            className={`inline-flex items-center gap-0.5 font-bold whitespace-nowrap ${
              trend.value > 0 ? 'text-emerald-700' : 'text-rose-600'
            }`}
          >
            {trend.value > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {trend.label}
          </span>
        )}
        <span>{sub}</span>
      </div>
    </button>
  );
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({
  onSelectClient,
  onOpenNewClientModal,
  onNavigate,
  onOpenSessionModal,
}) => {
  const { userProfile } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [checkins, setCheckins] = useState<TeamCheckin[]>([]);
  const [myTodos, setMyTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);

  const today = todayWITA();

  const loadData = async () => {
    try {
      const [c, s, t, u, l, chk, todos] = await Promise.all([
        getClients(),
        getSessions(),
        getTasks(),
        getAllUsers(),
        getActivityLogs().catch(() => [] as ActivityLog[]),
        getCheckinsByDate(today).catch(() => [] as TeamCheckin[]),
        userProfile ? getTodosForUser(userProfile.id).catch(() => [] as TodoItem[]) : Promise.resolve([]),
      ]);
      setClients(c);
      setSessions(s);
      setTasks(t);
      setUsers(u);
      setLogs(l);
      setCheckins(chk);
      setMyTodos(todos);
    } catch (err) {
      console.error('Gagal memuat dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const m = useMemo(() => {
    const thisMonth = today.slice(0, 7);
    const lastMonth = shiftDate(`${thisMonth}-01`, -1).slice(0, 7);
    const weekStart = mondayOf(today);
    const weekEnd = shiftDate(weekStart, 6);
    const lastWeekStart = shiftDate(weekStart, -7);

    const team = users.filter((u) => TEAM_ROLES.includes(u.role) && u.status !== 'pending' && u.status !== 'rejected');
    const clientName = (id: string) => clients.find((c) => c.id === id)?.namaBisnis || 'Klien';
    const userName = (id?: string) => users.find((u) => u.id === id)?.displayName;

    // KPI 1: klien aktif
    const activeClients = clients.filter((c) => c.status === 'Aktif');
    const newThisMonth = clients.filter((c) => c.createdAt && dateWITA(c.createdAt).startsWith(thisMonth)).length;
    const newLastMonth = clients.filter((c) => c.createdAt && dateWITA(c.createdAt).startsWith(lastMonth)).length;

    // KPI 2: sesi minggu ini (Senin–Minggu, WITA)
    const sessionDay = (s: Session) => dateWITA(s.dateTime);
    const weekSessions = sessions.filter((s) => s.status !== 'Dibatalkan' && sessionDay(s) >= weekStart && sessionDay(s) <= weekEnd);
    const lastWeekSessions = sessions.filter(
      (s) => s.status !== 'Dibatalkan' && sessionDay(s) >= lastWeekStart && sessionDay(s) < weekStart
    );

    // KPI 3: tugas terlambat
    const overdue = tasks.filter((t) => t.status === 'Terlambat' || isTaskOverdue(t.deadline, t.status));

    // KPI 4: absen hari ini
    const present = team.filter((u) =>
      checkins.some((c) => c.userId === u.id && c.morningCheckinAt && (c.workStatus === 'Kantor' || c.workStatus === 'WFA'))
    ).length;
    const away = team.filter((u) =>
      checkins.some((c) => c.userId === u.id && c.morningCheckinAt && !['Kantor', 'WFA'].includes(c.workStatus))
    ).length;

    // Agenda hari ini
    const todaySessions = sessions
      .filter((s) => s.status === 'Terjadwal' && sessionDay(s) === today)
      .sort((a, b) => a.dateTime.localeCompare(b.dateTime));
    const dueTasks = tasks
      .filter((t) => t.status !== 'Selesai' && t.deadline && t.deadline.slice(0, 10) <= today)
      .sort((a, b) => a.deadline.localeCompare(b.deadline));
    const todayTodos = myTodos.filter((t) => t.date === today);
    const todayTodosOpen = todayTodos.filter(isOpen);

    // Pipeline
    const stages = [
      { key: 'Prospek', label: 'Prospek', color: 'bg-sky-400' },
      { key: 'Onboarding', label: 'Onboarding', color: 'bg-[#0051d5]' },
      { key: 'Aktif', label: 'Aktif', color: 'bg-[#00236f]' },
      { key: 'Selesai', label: 'Selesai', color: 'bg-emerald-600' },
    ].map((st) => ({ ...st, count: clients.filter((c) => c.status === st.key).length }));
    const stopped = clients.filter((c) => c.status === 'Berhenti').length;
    const maxStage = Math.max(1, ...stages.map((s) => s.count));

    // Klien perlu perhatian
    const atRisk = clients
      .filter((c) => c.status === 'Aktif' || c.status === 'Onboarding')
      .map((c) => {
        const done = sessions
          .filter((s) => s.clientId === c.id && s.status === 'Selesai')
          .sort((a, b) => b.dateTime.localeCompare(a.dateTime))[0];
        const ct = tasks.filter((t) => t.clientId === c.id);
        // Masa tenggang: klien baru (< 14 hari) tanpa sesi belum dianggap berisiko.
        const lastSession = done?.dateTime || c.lastSessionDate;
        const ageDays = c.createdAt ? (Date.now() - new Date(c.createdAt).getTime()) / 86400000 : Infinity;
        const risk =
          !lastSession && ageDays < 14 && !ct.some((t) => isTaskOverdue(t.deadline, t.status))
            ? { isAtRisk: false, reason: undefined }
            : evaluateClientRisk(lastSession, ct);
        const consultant = userName(c.primaryConsultantId) || userName(c.consultantIds?.[0]);
        return { client: c, ...risk, consultant };
      })
      .filter((r) => r.isAtRisk);

    // Beban kerja
    const workload = team
      .filter((u) => ADVISORY_ROLES.includes(u.role))
      .map((u) => {
        const mine = clients.filter(
          (c) =>
            (c.primaryConsultantId === u.id || c.consultantIds?.includes(u.id)) &&
            c.status !== 'Selesai' &&
            c.status !== 'Berhenti'
        );
        const ids = new Set(mine.map((c) => c.id));
        return {
          user: u,
          clients: mine.length,
          sessions: weekSessions.filter((s) => s.consultantId === u.id && s.status === 'Terjadwal').length,
          openTasks: tasks.filter((t) => ids.has(t.clientId) && t.status !== 'Selesai').length,
        };
      })
      .sort((a, b) => b.clients - a.clients);
    const maxLoad = Math.max(1, ...workload.map((w) => w.clients));

    const recentLogs = [...logs].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 6);

    return {
      team,
      clientName,
      userName,
      activeClients,
      newThisMonth,
      newLastMonth,
      weekSessions,
      lastWeekSessions,
      overdue,
      present,
      away,
      todaySessions,
      dueTasks,
      todayTodos,
      todayTodosOpen,
      stages,
      stopped,
      maxStage,
      atRisk,
      workload,
      maxLoad,
      recentLogs,
    };
  }, [clients, sessions, tasks, users, logs, checkins, myTodos, today]);

  const [y, mo] = today.split('-').map(Number);
  const dateLabel = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Makassar',
  }).format(new Date());
  const firstName = (userProfile?.displayName || '').split(/[ ,]/)[0];
  const weekDone = m.weekSessions.filter((s) => s.status === 'Selesai').length;
  const weekPlanned = m.weekSessions.filter((s) => s.status === 'Terjadwal').length;
  const overdueClients = new Set(m.overdue.map((t) => t.clientId)).size;
  const notYet = Math.max(0, m.team.length - m.present - m.away);
  const agendaEmpty = m.todaySessions.length === 0 && m.dueTasks.length === 0 && m.todayTodos.length === 0;

  if (loading) {
    return <div className="py-20 text-center text-xs text-slate-500">Memuat dashboard...</div>;
  }

  return (
    <div className="space-y-5 pb-12">
      {/* HEADER */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-['Plus_Jakarta_Sans']">
            {greeting()}
            {firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {dateLabel} • Q{Math.ceil(mo / 3)} {y} • WITA
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onOpenSessionModal && (
            <button
              type="button"
              onClick={() => onOpenSessionModal()}
              className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <CalendarClock className="w-4 h-4" /> Jadwalkan Sesi
            </button>
          )}
        </div>
      </div>

      <OwnerNotificationCenter variant="banner" onNavigate={onNavigate} onActionComplete={loadData} />

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Kpi
          label="Klien Aktif"
          value={m.activeClients.length}
          icon={Users}
          sub={`${m.newThisMonth} baru bulan ini`}
          trend={{ value: m.newThisMonth - m.newLastMonth, label: `${m.newThisMonth - m.newLastMonth > 0 ? '+' : ''}${m.newThisMonth - m.newLastMonth} vs bln lalu` }}
          onClick={() => onNavigate('clients')}
        />
        <Kpi
          label="Sesi Minggu Ini"
          value={m.weekSessions.length}
          icon={CalendarDays}
          sub={`${weekDone} selesai · ${weekPlanned} terjadwal`}
          trend={{
            value: m.weekSessions.length - m.lastWeekSessions.length,
            label: `${m.weekSessions.length - m.lastWeekSessions.length > 0 ? '+' : ''}${m.weekSessions.length - m.lastWeekSessions.length} vs mgg lalu`,
          }}
          onClick={() => onNavigate('reports')}
        />
        <Kpi
          label="Tugas Terlambat"
          value={m.overdue.length}
          icon={AlertTriangle}
          tone={m.overdue.length ? 'danger' : 'success'}
          sub={m.overdue.length ? `dari ${overdueClients} klien` : 'Semua tugas tepat waktu'}
          onClick={() => onNavigate('clients')}
        />
        <Kpi
          label="Tim Hadir Hari Ini"
          value={
            <>
              {m.present}
              <span className="text-lg text-slate-400 font-semibold">/{m.team.length}</span>
            </>
          }
          icon={UserCheck}
          sub={`${m.away} izin/sakit/cuti · ${notYet} belum absen`}
          onClick={() => onNavigate('attendance')}
        />
      </div>

      {/* AGENDA + PIPELINE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader
            icon={CalendarClock}
            title="Agenda Hari Ini"
            action={<LinkButton onClick={() => onNavigate('attendance')}>To-do saya</LinkButton>}
          />
          {agendaEmpty ? (
            <p className="text-xs text-slate-400 py-6 text-center">
              Tidak ada sesi, tugas jatuh tempo, atau to-do untuk hari ini.
            </p>
          ) : (
            <div className="space-y-4">
              {m.todaySessions.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                    Sesi hari ini ({m.todaySessions.length})
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {m.todaySessions.slice(0, 5).map((s) => (
                      <li key={s.id} className="flex items-center gap-3 py-2">
                        <span className="text-xs font-black text-[#00236f] w-12 shrink-0 tabular-nums">
                          {timeWITA(s.dateTime)}
                        </span>
                        <button
                          type="button"
                          onClick={() => onSelectClient(s.clientId)}
                          className="flex-1 min-w-0 text-left cursor-pointer"
                        >
                          <div className="text-xs font-semibold text-slate-900 truncate">{m.clientName(s.clientId)}</div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {s.agenda || 'Sesi pendampingan'} · {m.userName(s.consultantId) || 'Konsultan'}
                          </div>
                        </button>
                        {s.meetingUrl && /^https?:\/\//.test(s.meetingUrl) && (
                          <a
                            href={s.meetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-semibold text-[#0051d5] inline-flex items-center gap-1 hover:underline"
                          >
                            <Video className="w-3.5 h-3.5" /> Gabung
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {m.dueTasks.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                    Tugas klien jatuh tempo ({m.dueTasks.length})
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {m.dueTasks.slice(0, 5).map((t) => {
                      const late = t.deadline.slice(0, 10) < today;
                      return (
                        <li key={t.id}>
                          <button
                            type="button"
                            onClick={() => onSelectClient(t.clientId)}
                            className="w-full flex items-center gap-3 py-2 text-left cursor-pointer"
                          >
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                late ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              {late ? 'Terlambat' : 'Hari ini'}
                            </span>
                            <span className="flex-1 min-w-0">
                              <span className="block text-xs font-semibold text-slate-900 truncate">{t.title}</span>
                              <span className="block text-[11px] text-slate-500 truncate">
                                {m.clientName(t.clientId)} · PIC {t.assigneeName || t.assigneeRole}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  {m.dueTasks.length > 5 && (
                    <div className="text-[11px] text-slate-400 mt-1">+{m.dueTasks.length - 5} tugas lainnya</div>
                  )}
                </div>
              )}

              {m.todayTodos.length > 0 && (
                <button
                  type="button"
                  onClick={() => onNavigate('attendance')}
                  className="w-full flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer"
                >
                  <span className="flex items-center gap-2 text-xs text-slate-700">
                    <ClipboardList className="w-4 h-4 text-[#0051d5]" />
                    To-do saya hari ini:{' '}
                    <strong>
                      {m.todayTodos.length - m.todayTodosOpen.length}/{m.todayTodos.length} selesai
                    </strong>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              )}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader icon={BarChart3} title="Pipeline Klien" />
          <div className="space-y-3">
            {m.stages.map((st) => (
              <div key={st.key}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700">{st.label}</span>
                  <span className="font-bold text-slate-900 tabular-nums">{st.count}</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${st.color}`}
                    style={{ width: `${(st.count / m.maxStage) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Total {clients.length} klien{m.stopped ? ` · ${m.stopped} berhenti` : ''}
            </span>
            <LinkButton onClick={() => onNavigate('clients')}>Daftar klien</LinkButton>
          </div>
        </Card>
      </div>

      {/* RISIKO + BEBAN KERJA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader
            icon={AlertTriangle}
            title={`Klien Perlu Perhatian${m.atRisk.length ? ` (${m.atRisk.length})` : ''}`}
          />
          {m.atRisk.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Semua klien aktif dalam kondisi baik.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {m.atRisk.slice(0, 5).map((r) => (
                <li key={r.client.id}>
                  <button
                    type="button"
                    onClick={() => onSelectClient(r.client.id)}
                    className="w-full flex items-center gap-3 py-2.5 text-left cursor-pointer group"
                  >
                    <span className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center text-xs font-black shrink-0">
                      {(r.client.namaBisnis || '?').charAt(0).toUpperCase()}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-xs font-semibold text-slate-900 truncate">{r.client.namaBisnis}</span>
                      <span className="block text-[11px] text-rose-600 truncate">{r.reason || 'Perlu ditinjau'}</span>
                    </span>
                    <span className="text-[11px] text-slate-500 text-right shrink-0 max-w-[40%] truncate">
                      {r.consultant || 'Belum ada konsultan'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            icon={Users}
            title="Beban Kerja Tim"
            action={<LinkButton onClick={() => onNavigate('team')}>Atur tim</LinkButton>}
          />
          {m.workload.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">Belum ada konsultan atau tim grup aktif.</p>
          ) : (
            <ul className="space-y-3">
              {m.workload.slice(0, 6).map((w) => (
                <li key={w.user.id}>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="min-w-0">
                      <span className="font-semibold text-slate-900">{w.user.displayName}</span>
                      <span className="text-slate-400"> · {ROLE_LABELS[w.user.role] || w.user.role}</span>
                    </span>
                    <span className="text-slate-500 shrink-0 tabular-nums">
                      <strong className="text-slate-900">{w.clients}</strong> klien · {w.sessions} sesi · {w.openTasks} tugas
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mt-1">
                    <div className="h-full bg-[#0051d5] rounded-full" style={{ width: `${(w.clients / m.maxLoad) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* AKTIVITAS TERBARU */}
      <Card>
        <CardHeader
          icon={Clock}
          title="Aktivitas Terbaru"
          action={<LinkButton onClick={() => onNavigate('security-audit')}>Lihat semua</LinkButton>}
        />
        {m.recentLogs.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">Belum ada aktivitas.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {m.recentLogs.map((l) => (
              <li key={l.id} className="flex items-start gap-3 py-2.5">
                <span className="w-2 h-2 rounded-full bg-[#0051d5] mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-slate-800">
                    <span className="font-semibold">{l.action || 'Aktivitas'}</span>
                    {l.clientId && <span className="text-slate-500"> · {m.clientName(l.clientId)}</span>}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    oleh {l.actorName || 'Sistem'}
                    {l.actorRole ? ` (${l.actorRole})` : ''}
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 shrink-0">{relativeTime(l.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="flex flex-wrap gap-3 justify-center text-xs">
        <LinkButton onClick={() => onNavigate('reports')}>Laporan &amp; analitik lengkap</LinkButton>
        <span className="text-slate-300">•</span>
        <button
          type="button"
          onClick={() => onNavigate('security-audit')}
          className="text-xs font-semibold text-slate-500 hover:underline cursor-pointer inline-flex items-center gap-1"
        >
          <ShieldCheck className="w-3.5 h-3.5" /> Log audit keamanan
        </button>
      </div>
    </div>
  );
};
