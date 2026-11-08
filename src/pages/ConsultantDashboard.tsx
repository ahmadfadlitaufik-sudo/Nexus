import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Calendar,
  Clock,
  Video,
  AlertCircle,
  CheckCircle2,
  Users,
  ArrowRight,
  ExternalLink,
  FileText,
  Building2,
  CalendarCheck,
  Target,
  Plus,
} from 'lucide-react';
import { Client, Session, Task } from '../types';
import { getClients, getSessions, getTasks } from '../services/db';
import { formatWITA, isTaskOverdue, getDaysDiff } from '../utils/formatters';
import { DailyActivityTracker } from '../components/DailyActivityTracker';
import { TeamActivitySummary } from '../components/TeamActivitySummary';

interface ConsultantDashboardProps {
  onSelectClient: (clientId: string) => void;
  onOpenSessionModal: (sessionId?: string, clientId?: string) => void;
}

export const ConsultantDashboard: React.FC<ConsultantDashboardProps> = ({
  onSelectClient,
  onOpenSessionModal,
}) => {
  const { userProfile } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const consultantId = userProfile?.id || '';

  useEffect(() => {
    async function loadData() {
      try {
        const [cList, sList, tList] = await Promise.all([
          getClients(),
          getSessions(),
          getTasks(),
        ]);

        // Filter strictly for this consultant's assigned clients (primary or multi-consultant array)
        const myClients = cList.filter(
          (c) =>
            c.primaryConsultantId === consultantId ||
            (c.consultantIds && c.consultantIds.includes(consultantId))
        );
        const myClientIds = new Set(myClients.map((c) => c.id));

        const mySessions = sList.filter(
          (s) => s.consultantId === consultantId || myClientIds.has(s.clientId)
        );
        const myTasks = tList.filter((t) => myClientIds.has(t.clientId));

        setClients(myClients);
        setSessions(mySessions);
        setTasks(myTasks);
      } catch (err) {
        console.error('Error loading consultant dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    if (consultantId) {
      loadData();
    }
  }, [consultantId]);

  // 1. Sesi Minggu Ini (Sessions within 7 days in WITA)
  const now = new Date();
  const oneWeekLater = new Date(now.getTime() + 7 * 86400000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 86400000);

  const sessionsThisWeek = sessions
    .filter((s) => {
      const sDate = new Date(s.dateTime);
      return sDate >= oneWeekAgo && sDate <= oneWeekLater;
    })
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

  // 2. Tugas Jatuh Tempo: tasks overdue or due within 3 days for assigned clients
  const dueTasks = tasks
    .filter((t) => {
      if (t.status === 'Selesai') return false;
      if (t.status === 'Terlambat') return true;
      if (isTaskOverdue(t.deadline, t.status)) return true;
      const diff = (new Date(t.deadline).getTime() - now.getTime()) / 86400000;
      return diff <= 3; // due within next 3 days
    })
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

  // 3. Klien yang Perlu Perhatian:
  // Klien binaan dengan tugas terlambat atau belum ada sesi terlaksana dalam 10-14 hari
  const clientsNeedingAttention = clients
    .map((c) => {
      const clientTasks = tasks.filter((t) => t.clientId === c.id);
      const overdueTasks = clientTasks.filter(
        (t) => t.status === 'Terlambat' || isTaskOverdue(t.deadline, t.status)
      );

      const lastCompletedSession = sessions
        .filter((s) => s.clientId === c.id && s.status === 'Selesai')
        .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())[0];

      const daysSince = lastCompletedSession
        ? getDaysDiff(lastCompletedSession.dateTime)
        : c.lastSessionDate
        ? getDaysDiff(c.lastSessionDate)
        : 99;

      let reason = '';
      if (overdueTasks.length > 0 && daysSince >= 14) {
        reason = `${overdueTasks.length} tugas terlambat & tidak ada sesi ≥ 14 hari`;
      } else if (overdueTasks.length > 0) {
        reason = `${overdueTasks.length} tugas melewati batas tenggat`;
      } else if (daysSince >= 14) {
        reason = `Tidak ada sesi sejak ${daysSince} hari lalu`;
      } else if (daysSince >= 10) {
        reason = `Sudah ${daysSince} hari sejak sesi terakhir`;
      }

      return {
        ...c,
        overdueCount: overdueTasks.length,
        daysSinceLastSession: daysSince,
        attentionReason: reason,
        needsAttention: overdueTasks.length > 0 || daysSince >= 10,
      };
    })
    .filter((c) => c.needsAttention);

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-['Plus_Jakarta_Sans'] tracking-tight">
            Dashboard Konsultan
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Selamat bertugas, <strong className="text-slate-800">{userProfile?.displayName}</strong>.
            Prioritas pendampingan WFA klien binaan Anda minggu ini.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-blue-50 border border-blue-200 text-[#00236f] px-4 py-2 rounded-xl text-xs font-semibold">
            {clients.length} Klien Binaan Ditugaskan
          </div>
          <button
            onClick={() => onOpenSessionModal(undefined, clients[0]?.id)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00236f] text-white text-xs font-semibold hover:bg-[#1e3a8a] transition cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Jadwalkan Sesi Baru
          </button>
        </div>
      </div>

      {/* Daily Activity Tracker for Consultant Standup & Check-in */}
      <DailyActivityTracker
        title="Daily Activity Tracker • Konsultan Pendamping"
        defaultCollapsed={false}
      />

      {/* Grid: 1. Sesi Minggu Ini & 2. Tugas Jatuh Tempo */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Kolom 1: Sesi Minggu Ini (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans'] flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#00236f]" />
              Sesi Minggu Ini (WITA)
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-[#00236f]">
                {sessionsThisWeek.length} Sesi
              </span>
            </h2>
            <button
              onClick={() => onOpenSessionModal(undefined, clients[0]?.id)}
              className="text-xs font-semibold text-[#0051d5] hover:text-[#00236f] cursor-pointer"
            >
              + Jadwalkan Sesi
            </button>
          </div>

          {sessionsThisWeek.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500 text-xs">
              <CalendarCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              Tidak ada sesi terjadwal dalam rentang minggu ini untuk klien Anda.
            </div>
          ) : (
            <div className="space-y-3">
              {sessionsThisWeek.map((session) => {
                const client = clients.find((c) => c.id === session.clientId);
                const isUpcoming = session.status === 'Terjadwal';

                return (
                  <div
                    key={session.id}
                    className={`bg-white p-5 rounded-2xl border transition shadow-xs ${
                      isUpcoming ? 'border-blue-200 hover:border-blue-300' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            {client?.namaBisnis || 'Klien Binaan'}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              session.status === 'Selesai'
                                ? 'bg-emerald-100 text-emerald-800'
                                : session.status === 'Terjadwal'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {session.status}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                            {session.jenis || 'Individu'}
                          </span>
                        </div>
                        <h3 className="font-semibold text-sm text-slate-800 mt-1.5">
                          {session.agenda}
                        </h3>
                      </div>

                      <div className="text-left sm:text-right shrink-0">
                        <div className="text-xs font-bold text-[#00236f] flex items-center sm:justify-end gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatWITA(session.dateTime, true)}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Durasi: {session.durationMinutes} Menit
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                      {session.meetingUrl ? (
                        <a
                          href={session.meetingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-medium"
                        >
                          <Video className="w-3.5 h-3.5" />
                          Buka Google Meet
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-slate-400">Tautan meet belum diatur</span>
                      )}

                      <div className="flex items-center gap-2 ml-auto">
                        <button
                          onClick={() => onOpenSessionModal(session.id, session.clientId)}
                          className="px-3.5 py-1.5 rounded-lg bg-[#00236f] hover:bg-[#1e3a8a] text-white text-xs font-medium transition cursor-pointer"
                        >
                          Catat &amp; Notulensi Sesi
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Kolom 2: Tugas Jatuh Tempo (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans'] flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              Tugas Jatuh Tempo
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                {dueTasks.length} Tugas
              </span>
            </h2>
          </div>

          {dueTasks.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500 text-xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              Tidak ada tugas terlambat atau kritis untuk klien binaan Anda saat ini.
            </div>
          ) : (
            <div className="space-y-3">
              {dueTasks.map((task) => {
                const client = clients.find((c) => c.id === task.clientId);
                const isOverdue =
                  task.status === 'Terlambat' || isTaskOverdue(task.deadline, task.status);

                return (
                  <div
                    key={task.id}
                    className={`bg-white p-4 rounded-xl border transition shadow-xs ${
                      isOverdue ? 'border-red-200 bg-red-50/20' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[11px] font-bold text-slate-500 uppercase">
                          {client?.namaBisnis || 'Klien'}
                        </div>
                        <h4 className="text-xs font-semibold text-slate-900 mt-0.5 leading-snug">
                          {task.title}
                        </h4>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0 ${
                          isOverdue
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {isOverdue ? 'Terlambat' : task.status}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                      <span>
                        PIC: <strong>{task.assigneeName}</strong> ({task.assigneeRole})
                      </span>
                      <span className={isOverdue ? 'text-red-700 font-semibold' : ''}>
                        Tenggat: {task.deadline}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 3. KLIEN YANG PERLU PERHATIAN */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans'] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#00236f]" />
              Klien Binaan yang Perlu Perhatian
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                {clientsNeedingAttention.length} Klien
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Klien binaan Anda dengan keterlambatan tugas atau belum memiliki jadwal sesi reguler.
            </p>
          </div>
        </div>

        {clientsNeedingAttention.length === 0 ? (
          <div className="py-6 text-center text-slate-500 text-xs">
            <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
            Seluruh klien binaan Anda berjalan sesuai ritme dan rencana aksi.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clientsNeedingAttention.map((client) => (
              <div
                key={client.id}
                className="p-4 rounded-xl border border-amber-200 bg-amber-50/30 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">{client.namaBisnis}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-100 text-[#00236f]">
                      {client.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Pemilik: {client.namaPemilik} · {client.kota}
                  </div>

                  <div className="mt-2.5 p-2 rounded-lg bg-white border border-amber-200 text-xs text-amber-900 space-y-0.5">
                    <div className="font-semibold text-[11px] text-amber-800 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-amber-600" />
                      {client.attentionReason}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between">
                  <button
                    onClick={() => onSelectClient(client.id)}
                    className="text-xs font-semibold text-[#00236f] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    Buka Detail Klien
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onOpenSessionModal(undefined, client.id)}
                    className="text-xs font-semibold px-2.5 py-1 rounded bg-[#00236f] text-white hover:bg-[#1e3a8a] cursor-pointer"
                  >
                    + Jadwalkan Sesi
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ringkasan Aktivitas Seluruh Rekan Tim Nexus (Tabel / Kartu) */}
      <TeamActivitySummary
        title="Ringkasan Aktivitas Rekan Tim Nexus"
        defaultView="cards"
      />
    </div>
  );
};
