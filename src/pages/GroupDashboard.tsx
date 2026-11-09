import React, { useState, useEffect } from 'react';
import {
  Layers,
  Users,
  Calendar,
  AlertTriangle,
  Clock,
  Video,
  ArrowRight,
  Phone,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sparkles,
  TrendingUp,
  MessageSquare,
} from 'lucide-react';
import { Group, GroupMember, GroupAttendance, Client, Session, Task, UserProfile } from '../types';
import {
  getGroups,
  getAllGroupMembers,
  getAttendanceByGroup,
  getClients,
  getSessions,
  getTasks,
  evaluatePassiveGroupMember,
} from '../services/db';
import { useAuth } from '../context/AuthContext';
import { formatWITA, isTaskOverdue } from '../utils/formatters';

interface GroupDashboardProps {
  onSelectGroup: (groupId: string) => void;
  onSelectClient?: (clientId: string) => void;
}

export const GroupDashboard: React.FC<GroupDashboardProps> = ({
  onSelectGroup,
  onSelectClient,
}) => {
  const { userProfile } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [attendances, setAttendances] = useState<GroupAttendance[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const userId = userProfile?.id || '';
  const isOwner = userProfile?.role === 'owner';

  useEffect(() => {
    async function loadData() {
      try {
        const [allGroups, allMembers, allClients, allSessions, allTasks] = await Promise.all([
          getGroups(),
          getAllGroupMembers(),
          getClients(),
          getSessions(),
          getTasks(),
        ]);

        // Filter groups for this facilitator (or all if owner)
        const myGroups = isOwner
          ? allGroups
          : allGroups.filter(
              (g) =>
                g.facilitatorId === userId ||
                (g.facilitatorIds && g.facilitatorIds.includes(userId))
            );

        const myGroupIds = new Set(myGroups.map((g) => g.id));
        const myMembers = allMembers.filter((m) => myGroupIds.has(m.groupId));

        // Load attendances for these groups
        const attPromises = myGroups.map((g) => getAttendanceByGroup(g.id));
        const attResults = await Promise.all(attPromises);
        const myAttendances = attResults.flat();

        const mySessions = allSessions.filter(
          (s) =>
            (s.groupId && myGroupIds.has(s.groupId)) ||
            (s.jenis === 'Grup' && (s.consultantId === userId || isOwner))
        );

        setGroups(myGroups);
        setMembers(myMembers);
        setClients(allClients);
        setSessions(mySessions);
        setAttendances(myAttendances);
        setTasks(allTasks);
      } catch (err) {
        console.error('Error loading group dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [userId, isOwner]);

  // Compute Upcoming Sessions This Week
  const now = new Date();
  const oneWeekLater = new Date(now.getTime() + 7 * 86400000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 86400000);

  const sessionsThisWeek = sessions
    .filter((s) => {
      const sDate = new Date(s.dateTime);
      return sDate >= oneWeekAgo && sDate <= oneWeekLater;
    })
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

  // Evaluate All Passive Members Across Assigned Groups
  const passiveMembersList: {
    member: GroupMember;
    group: Group;
    client: Client | undefined;
    reason: string;
    attendanceRate: number;
  }[] = [];

  groups.forEach((grp) => {
    const grpMembers = members.filter((m) => m.groupId === grp.id);
    const grpSessions = sessions.filter((s) => s.groupId === grp.id || s.jenis === 'Grup');
    const grpAtt = attendances.filter((a) => a.groupId === grp.id);

    grpMembers.forEach((m) => {
      const clientData = clients.find((c) => c.id === m.clientId);
      const clientTasks = tasks.filter((t) => t.clientId === m.clientId);
      const evalResult = evaluatePassiveGroupMember(
        m.clientId,
        grpSessions,
        grpAtt,
        clientTasks
      );

      if (evalResult.isPassive) {
        passiveMembersList.push({
          member: m,
          group: grp,
          client: clientData,
          reason: evalResult.reason,
          attendanceRate: evalResult.attendanceRate,
        });
      }
    });
  });

  const totalMembersCount = members.length;
  const activeGroupsCount = groups.filter((g) => g.status === 'Aktif').length;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#00236f] to-[#1e3a8a] text-white p-6 sm:p-7 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-200 text-xs font-semibold border border-blue-400/30">
            <Layers className="w-3.5 h-3.5 text-blue-300" />
            Dashboard Fasilitator Tim Grup • Nexus WFA Hub
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-['Plus_Jakarta_Sans']">
            Pusat Kendali Mastermind &amp; Cohort
          </h1>
          <p className="text-xs sm:text-sm text-blue-100 font-normal">
            Pantau kehadiran para direktur &amp; pemilik bisnis, deteksi anggota pasif lebih dini, dan fasilitasi sesi bimbingan kelompok.
          </p>
        </div>
      </div>

      {/* Daily Activity Tracker for Group Team Standup & Check-in */}

      {/* 4 Core Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Grup Aktif */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Grup Binaan Aktif
            </span>
            <div className="text-3xl font-extrabold text-[#00236f] font-['Plus_Jakarta_Sans'] mt-1">
              {activeGroupsCount}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Dari total {groups.length} grup
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#00236f] flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Total Peserta Binaan */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Peserta / Anggota
            </span>
            <div className="text-3xl font-extrabold text-slate-900 font-['Plus_Jakarta_Sans'] mt-1">
              {totalMembersCount}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Pemilik bisnis terhubung
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Sesi Grup Minggu Ini */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-[#0051d5] uppercase tracking-wider">
              Sesi Minggu Ini
            </span>
            <div className="text-3xl font-extrabold text-slate-900 font-['Plus_Jakarta_Sans'] mt-1">
              {sessionsThisWeek.length}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Pertemuan breakout WITA
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-[#0051d5] flex items-center justify-center font-bold">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Anggota Pasif (Perlu Perhatian) */}
        <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">
              Anggota Pasif
            </span>
            <div className="text-3xl font-extrabold text-rose-600 font-['Plus_Jakarta_Sans'] mt-1">
              {passiveMembersList.length}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              2x absen berturut-turut / tugas macet
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2 Balanced Columns: Anggota Pasif & Jadwal Sesi */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols): Daftar Anggota Pasif Memerlukan Follow-up */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-rose-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                  Anggota Pasif Memerlukan Follow-Up
                </h2>
                <p className="text-xs text-slate-500">
                  Indikator: Absen 2 sesi pendampingan berturut-turut atau tugas macet
                </p>
              </div>
            </div>

            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 shrink-0">
              {passiveMembersList.length} Anggota
            </span>
          </div>

          {passiveMembersList.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              Luar biasa! Seluruh anggota aktif hadir di setiap pertemuan grup dan tugas berjalan tepat waktu.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {passiveMembersList.map(({ member, group: grp, client: cl, reason, attendanceRate }) => (
                <div
                  key={member.id}
                  className="py-4 first:pt-1 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 p-3 rounded-xl transition"
                >
                  <div className="space-y-1 max-w-md">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900">{cl?.namaBisnis || 'Klien'}</span>
                      <span className="text-xs text-slate-500 font-medium">({cl?.namaPemilik})</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-[#00236f] font-semibold truncate max-w-[150px]">
                        {grp.name}
                      </span>
                    </div>

                    <div className="text-xs text-rose-700 font-medium bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200/60 inline-flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{reason}</span>
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center gap-3 pt-0.5">
                      <span>Kehadiran: <strong>{attendanceRate}%</strong></span>
                      <span>•</span>
                      <span>Kontak: {cl?.kontak || '-'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {cl?.kontak && (
                      <a
                        href={`https://wa.me/${cl.kontak.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition inline-flex items-center gap-1 shadow-2xs"
                      >
                        <Phone className="w-3.5 h-3.5" /> WA PIC
                      </a>
                    )}
                    <button
                      onClick={() => onSelectGroup(grp.id)}
                      className="px-3 py-1.5 rounded-lg bg-[#00236f] hover:bg-[#1e3a8a] text-white text-xs font-semibold transition shadow-2xs cursor-pointer"
                    >
                      Buka Grup
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column (5 cols): Sesi Grup Minggu Ini & Navigasi Cepat */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#00236f]" />
                Jadwal Sesi Mastermind Minggu Ini
              </h3>
            </div>

            {sessionsThisWeek.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Tidak ada jadwal sesi grup dalam 7 hari ke depan.
              </div>
            ) : (
              <div className="space-y-3">
                {sessionsThisWeek.map((s) => {
                  const grp = groups.find((g) => g.id === s.groupId);
                  return (
                    <div
                      key={s.id}
                      className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2 hover:bg-slate-100/70 transition"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#00236f] flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {formatWITA(s.dateTime, true)}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-100 text-[#00236f] uppercase">
                          {s.status}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900">{s.agenda}</h4>
                      <p className="text-xs text-slate-500">
                        Grup: <strong>{grp?.name || 'Mastermind Grup'}</strong>
                      </p>

                      {s.meetingUrl && (
                        <div className="pt-2 flex justify-end">
                          <a
                            href={s.meetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-2 px-3 rounded-lg bg-[#00236f] hover:bg-[#1e3a8a] text-white text-xs font-semibold text-center inline-flex items-center justify-center gap-1.5 shadow-2xs"
                          >
                            <Video className="w-3.5 h-3.5" /> Buka Google Meet Room
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Group Cards List */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#00236f]" />
              Daftar Grup Binaan Anda
            </h3>
            <div className="space-y-2">
              {groups.map((grp) => {
                const grpMembersCount = members.filter((m) => m.groupId === grp.id).length;
                return (
                  <div
                    key={grp.id}
                    onClick={() => onSelectGroup(grp.id)}
                    className="p-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{grp.name}</h4>
                      <span className="text-[11px] text-slate-500">{grpMembersCount} Klien Terdaftar</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
