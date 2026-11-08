import React, { useState, useEffect } from 'react';
import {
  Layers,
  Users,
  Calendar,
  CheckSquare,
  Bell,
  ArrowLeft,
  Plus,
  Video,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Trash2,
  Edit,
  ExternalLink,
  Send,
  Building2,
  Sparkles,
  UserPlus,
  UserMinus,
  Search,
} from 'lucide-react';
import {
  Group,
  GroupMember,
  GroupAttendance,
  GroupAnnouncement,
  Client,
  Session,
  Task,
  UserProfile,
  AttendanceStatus,
} from '../types';
import {
  getGroupById,
  getGroupMembers,
  addClientToGroup,
  removeClientFromGroup,
  getAttendanceByGroup,
  recordGroupAttendance,
  getAnnouncementsByGroup,
  saveGroupAnnouncement,
  getClients,
  getSessions,
  getTasks,
  getAllUsers,
  evaluatePassiveGroupMember,
  saveSessionWithInternalAndTasks,
} from '../services/db';
import { useAuth } from '../context/AuthContext';
import { formatWITA, isTaskOverdue } from '../utils/formatters';

interface GroupDetailProps {
  groupId: string;
  onBack: () => void;
  onSelectClient?: (clientId: string) => void;
}

export const GroupDetail: React.FC<GroupDetailProps> = ({
  groupId,
  onBack,
  onSelectClient,
}) => {
  const { userProfile } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [attendances, setAttendances] = useState<GroupAttendance[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [announcements, setAnnouncements] = useState<GroupAnnouncement[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'ringkasan' | 'anggota' | 'sesi' | 'tugas' | 'pengumuman'>('ringkasan');

  // Modal: Add Member
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedClientIdToAdd, setSelectedClientIdToAdd] = useState('');
  const [addMemberNotes, setAddMemberNotes] = useState('');

  // Modal: New Group Session
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [sessionAgenda, setSessionAgenda] = useState('');
  const [sessionDateTime, setSessionDateTime] = useState('');
  const [sessionDuration, setSessionDuration] = useState(90);
  const [sessionMeetingUrl, setSessionMeetingUrl] = useState('');
  const [sessionSharedNotes, setSessionSharedNotes] = useState('');

  // Modal: New Announcement
  const [showNewAnnounceModal, setShowNewAnnounceModal] = useState(false);
  const [announceTitle, setAnnounceTitle] = useState('');
  const [announceContent, setAnnounceContent] = useState('');

  // Selected Session for Attendance Editing
  const [selectedSessionForAttendance, setSelectedSessionForAttendance] = useState<Session | null>(null);

  const role = userProfile?.role;
  const isOwnerOrTimGrup = role === 'owner' || role === 'tim_grup' || role === 'konsultan' || role === 'consultant';

  const loadData = async () => {
    try {
      const [g, mList, cList, sList, aList, tList, annList, uList] = await Promise.all([
        getGroupById(groupId),
        getGroupMembers(groupId),
        getClients(),
        getSessions(),
        getAttendanceByGroup(groupId),
        getTasks(),
        getAnnouncementsByGroup(groupId),
        getAllUsers(),
      ]);

      setGroup(g);
      setMembers(mList);
      setClients(cList);

      // Filter sessions for this group
      const grpSessions = sList.filter(
        (s) => s.groupId === groupId || (s.jenis === 'Grup' && s.agenda.toLowerCase().includes(g?.name.toLowerCase() || ''))
      );
      setSessions(grpSessions);
      setAttendances(aList);
      setTasks(tList);
      setAnnouncements(annList);
      setUsers(uList);

      if (grpSessions.length > 0 && !selectedSessionForAttendance) {
        setSelectedSessionForAttendance(grpSessions[0]);
      }
    } catch (err) {
      console.error('Error loading group detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [groupId]);

  if (!group) {
    return (
      <div className="p-8 text-center text-slate-500 text-xs">
        Memuat detail data grup...
      </div>
    );
  }

  const facilitator = users.find((u) => u.id === group.facilitatorId);

  // Group Member Evaluations with Passive Detection
  const groupSessions = sessions.filter((s) => s.groupId === groupId || s.jenis === 'Grup');
  const evaluatedMembers = members.map((member) => {
    const clientData = clients.find((c) => c.id === member.clientId);
    const clientTasks = tasks.filter((t) => t.clientId === member.clientId);
    const evaluation = evaluatePassiveGroupMember(
      member.clientId,
      groupSessions,
      attendances,
      clientTasks
    );

    return {
      ...member,
      client: clientData,
      isPassive: evaluation.isPassive,
      passiveReason: evaluation.reason,
      attendanceRate: evaluation.attendanceRate,
    };
  });

  const passiveMembersCount = evaluatedMembers.filter((m) => m.isPassive).length;

  // Add Member to Group Handler (Supports multi-group membership!)
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientIdToAdd) return;
    try {
      const newMember = await addClientToGroup(
        groupId,
        selectedClientIdToAdd,
        addMemberNotes.trim()
      );
      setMembers([...members, newMember]);
      setShowAddMemberModal(false);
      setSelectedClientIdToAdd('');
      setAddMemberNotes('');
    } catch (err) {
      console.error('Error adding member to group:', err);
    }
  };

  // Remove Member from Group Handler
  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Keluarkan anggota ini dari grup mastermind?')) return;
    try {
      await removeClientFromGroup(memberId);
      setMembers(members.filter((m) => m.id !== memberId));
    } catch (err) {
      console.error('Error removing member:', err);
    }
  };

  // Create Group Session Handler
  const handleCreateGroupSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionAgenda.trim() || !sessionDateTime) return;
    try {
      const newSessId = `sess-grp-${Date.now()}`;
      const firstMemberClientId = members[0]?.clientId || 'client-1';

      const newSess: Session = {
        id: newSessId,
        groupId,
        group_id: groupId,
        clientId: firstMemberClientId, // Anchor client
        consultantId: group.facilitatorId || userProfile?.id || 'tim-grup-1',
        programId: group.programId,
        dateTime: sessionDateTime,
        durationMinutes: Number(sessionDuration) || 90,
        meetingUrl: sessionMeetingUrl.trim() || group.meetingUrl || 'https://meet.google.com/nxt-grp',
        agenda: sessionAgenda.trim(),
        jenis: 'Grup',
        status: 'Terjadwal',
        catatanDibagikan: sessionSharedNotes.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveSessionWithInternalAndTasks(
        {
          session: newSess,
          catatanInternal: 'Catatan internal fasilitator grup.',
          keyObservations: 'Observasi dinamika kelompok.',
          actionItems: [],
        },
        userProfile?.displayName || 'Fasilitator Grup',
        'Fasilitator'
      );

      setSessions([...sessions, newSess]);
      setSelectedSessionForAttendance(newSess);
      setShowNewSessionModal(false);
      setSessionAgenda('');
      setSessionSharedNotes('');
    } catch (err) {
      console.error('Error creating group session:', err);
    }
  };

  // Record Attendance Handler (Hadir / Izin / Absen)
  const handleUpdateAttendance = async (
    sessionId: string,
    clientId: string,
    newStatus: AttendanceStatus,
    notes?: string
  ) => {
    try {
      const existing = attendances.find(
        (a) => a.sessionId === sessionId && a.clientId === clientId
      );
      const attId = existing?.id || `att-${sessionId}-${clientId}`;
      const attDoc: GroupAttendance = {
        id: attId,
        groupId,
        sessionId,
        clientId,
        status: newStatus,
        notes: notes !== undefined ? notes : existing?.notes || '',
        recordedAt: new Date().toISOString(),
        recordedBy: userProfile?.displayName || 'Fasilitator',
      };

      await recordGroupAttendance(attDoc);
      setAttendances((prev) => {
        const filtered = prev.filter((a) => a.id !== attId);
        return [...filtered, attDoc];
      });
    } catch (err) {
      console.error('Error recording attendance:', err);
    }
  };

  // Post Announcement Handler
  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announceTitle.trim() || !announceContent.trim()) return;
    try {
      const newAnn: GroupAnnouncement = {
        id: `ann-${Date.now()}`,
        groupId,
        title: announceTitle.trim(),
        content: announceContent.trim(),
        authorName: userProfile?.displayName || 'Fasilitator Grup',
        authorRole: role === 'owner' ? 'Owner / Principal' : 'Fasilitator Grup',
        createdAt: new Date().toISOString(),
      };

      await saveGroupAnnouncement(newAnn);
      setAnnouncements([newAnn, ...announcements]);
      setShowNewAnnounceModal(false);
      setAnnounceTitle('');
      setAnnounceContent('');
    } catch (err) {
      console.error('Error posting announcement:', err);
    }
  };

  // Available clients who are not yet in this group
  const memberClientIds = new Set(members.map((m) => m.clientId));
  const availableClientsToAdd = clients.filter((c) => !memberClientIds.has(c.id));

  return (
    <div className="space-y-6 pb-12 animate-in fade-in">
      {/* Back Button & Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Grup</span>
        </button>

        <div className="flex items-center gap-2">
          {group.meetingUrl && (
            <a
              href={group.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#00236f] hover:bg-[#1e3a8a] text-white text-xs font-semibold transition shadow-xs"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Buka Google Meet Grup</span>
            </a>
          )}
        </div>
      </div>

      {/* Group Header Hero Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00236f] to-[#1e3a8a] text-white flex items-center justify-center font-bold text-xl shadow-xs shrink-0 mt-0.5">
            <Layers className="w-7 h-7 text-blue-200" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                {group.name}
              </h1>
              <span
                className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                  group.status === 'Aktif'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-blue-100 text-[#00236f]'
                }`}
              >
                {group.status}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
              {group.description}
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
              <span className="flex items-center gap-1 font-semibold text-slate-800">
                <Clock className="w-3.5 h-3.5 text-[#0051d5]" />
                {group.schedule}
              </span>
              <span>•</span>
              <span>
                Fasilitator: <strong className="text-slate-800">{facilitator?.displayName || 'Fajar Ramadhan, B.Eng.'}</strong>
              </span>
              <span>•</span>
              <span>{members.length} Klien Terdaftar</span>
            </div>
          </div>
        </div>

        {passiveMembersCount > 0 && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200/80 text-xs text-rose-800 flex items-center gap-2.5 shrink-0">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <span className="font-bold block">{passiveMembersCount} Anggota Pasif Terdeteksi</span>
              <span className="text-[11px] text-rose-700">Absen 2x berturut-turut atau tugas macet</span>
            </div>
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto text-xs font-semibold">
          {[
            { id: 'ringkasan', label: 'Ringkasan', icon: Layers },
            { id: 'anggota', label: `Anggota (${members.length})`, icon: Users },
            { id: 'sesi', label: `Sesi & Absensi (${groupSessions.length})`, icon: Calendar },
            { id: 'tugas', label: 'Tugas Kelompok', icon: CheckSquare },
            { id: 'pengumuman', label: `Pengumuman (${announcements.length})`, icon: Bell },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-3.5 border-b-2 font-semibold flex items-center gap-2 transition whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-[#00236f] text-[#00236f]'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* TAB 1: RINGKASAN */}
      {activeTab === 'ringkasan' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Anggota</span>
              <div className="text-3xl font-extrabold text-[#00236f] font-['Plus_Jakarta_Sans'] mt-1">
                {members.length}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Pemilik bisnis terdaftar</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sesi Terlaksana</span>
              <div className="text-3xl font-extrabold text-slate-900 font-['Plus_Jakarta_Sans'] mt-1">
                {groupSessions.filter((s) => s.status === 'Selesai').length}
                <span className="text-lg text-slate-400 font-normal">/{group.totalSessions || 8}</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Sesi grup mastermind</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rata-rata Kehadiran</span>
              <div className="text-3xl font-extrabold text-emerald-700 font-['Plus_Jakarta_Sans'] mt-1">
                {evaluatedMembers.length > 0
                  ? Math.round(
                      evaluatedMembers.reduce((acc, m) => acc + (m.attendanceRate || 100), 0) /
                        evaluatedMembers.length
                    )
                  : 100}
                %
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Kehadiran seluruh batch</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Anggota Pasif</span>
              <div className="text-3xl font-extrabold text-rose-600 font-['Plus_Jakarta_Sans'] mt-1">
                {passiveMembersCount}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Memerlukan intervensi</div>
            </div>
          </div>

          {/* Quick Schedule & Latest Announcement */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#00236f]" />
                  Jadwal Sesi Mendatang
                </h3>
              </div>

              {groupSessions.filter((s) => s.status === 'Terjadwal').length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs">
                  Belum ada sesi baru yang dijadwalkan.
                </div>
              ) : (
                <div className="space-y-3">
                  {groupSessions
                    .filter((s) => s.status === 'Terjadwal')
                    .slice(0, 3)
                    .map((s) => (
                      <div key={s.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                        <div className="text-xs font-bold text-[#00236f] flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {formatWITA(s.dateTime, true)}
                        </div>
                        <h4 className="text-sm font-bold text-slate-900">{s.agenda}</h4>
                        <div className="pt-1 flex items-center justify-between text-xs">
                          <span className="text-slate-500">Durasi: {s.durationMinutes} Menit</span>
                          {s.meetingUrl && (
                            <a
                              href={s.meetingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#0051d5] font-semibold hover:underline flex items-center gap-1"
                            >
                              <Video className="w-3.5 h-3.5" /> Link Meet
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#00236f]" />
                  Pengumuman Terbaru
                </h3>
              </div>

              {announcements.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs">
                  Belum ada pengumuman yang dibagikan ke grup ini.
                </div>
              ) : (
                <div className="space-y-3">
                  {announcements.slice(0, 2).map((ann) => (
                    <div key={ann.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-semibold text-slate-700">{ann.authorName}</span>
                        <span>{formatWITA(ann.createdAt)}</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">{ann.title}</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">{ann.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ANGGOTA (With Passive Member Detection & Multi-Group client support) */}
      {activeTab === 'anggota' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                Daftar Klien Anggota Grup
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Satu klien dapat berada di beberapa grup mastermind sekaligus.
              </p>
            </div>

            {isOwnerOrTimGrup && (
              <button
                onClick={() => setShowAddMemberModal(true)}
                className="px-3.5 py-2 rounded-xl bg-[#00236f] hover:bg-[#1e3a8a] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <UserPlus className="w-4 h-4" />
                <span>Tambah Anggota Klien</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Bisnis &amp; Pemilik</th>
                  <th className="px-4 py-3">Industri / Kota</th>
                  <th className="px-4 py-3">Tingkat Kehadiran</th>
                  <th className="px-4 py-3">Status Anggota</th>
                  <th className="px-4 py-3">Catatan</th>
                  {isOwnerOrTimGrup && <th className="px-4 py-3 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {evaluatedMembers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                      Belum ada klien yang ditambahkan ke grup mastermind ini.
                    </td>
                  </tr>
                ) : (
                  evaluatedMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {member.client?.namaBisnis || 'Klien'}
                        <div className="text-[11px] font-normal text-slate-400">
                          {member.client?.namaPemilik}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-800">{member.client?.industri || '-'}</span>
                        <div className="text-[11px] text-slate-400">{member.client?.kota}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{member.attendanceRate}%</span>
                          <div className="w-16 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                (member.attendanceRate || 0) >= 75
                                  ? 'bg-emerald-600'
                                  : (member.attendanceRate || 0) >= 50
                                  ? 'bg-blue-600'
                                  : 'bg-rose-600'
                              }`}
                              style={{ width: `${member.attendanceRate}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {member.isPassive ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase bg-rose-100 text-rose-800">
                              <AlertTriangle className="w-3 h-3" /> Pasif
                            </span>
                            <div className="text-[10px] text-rose-600 font-medium">
                              {member.passiveReason}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase bg-emerald-100 text-emerald-800">
                            Aktif
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500 max-w-xs truncate">
                        {member.notes || '-'}
                      </td>
                      {isOwnerOrTimGrup && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {onSelectClient && member.client && (
                              <button
                                onClick={() => onSelectClient(member.client!.id)}
                                className="text-xs font-semibold text-[#00236f] hover:underline"
                              >
                                Profil Klien
                              </button>
                            )}
                            <button
                              onClick={() => handleRemoveMember(member.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 transition"
                              title="Keluarkan dari grup"
                            >
                              <UserMinus className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SESI & ABSENSI */}
      {activeTab === 'sesi' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                  Daftar Pertemuan Sesi Grup & Absensi
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Catat presensi kehadiran tiap anggota: <strong>Hadir</strong>, <strong>Izin</strong>, atau <strong>Absen</strong>.
                </p>
              </div>

              {isOwnerOrTimGrup && (
                <button
                  onClick={() => setShowNewSessionModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-[#00236f] hover:bg-[#1e3a8a] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Jadwalkan Sesi Grup</span>
                </button>
              )}
            </div>

            {/* Session Selector Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {groupSessions.map((sess, idx) => (
                <button
                  key={sess.id}
                  onClick={() => setSelectedSessionForAttendance(sess)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
                    selectedSessionForAttendance?.id === sess.id
                      ? 'bg-[#00236f] text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Sesi #{idx + 1}: {sess.agenda}
                </button>
              ))}
            </div>

            {/* Attendance Matrix for Selected Session */}
            {selectedSessionForAttendance ? (
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Presensi: {selectedSessionForAttendance.agenda}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Jadwal: {formatWITA(selectedSessionForAttendance.dateTime, true)} • Status: {selectedSessionForAttendance.status}
                    </p>
                  </div>

                  {selectedSessionForAttendance.meetingUrl && (
                    <a
                      href={selectedSessionForAttendance.meetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-[#0051d5] text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 shadow-2xs self-start sm:self-center"
                    >
                      <Video className="w-3.5 h-3.5" /> Buka Ruang Meet
                    </a>
                  )}
                </div>

                {/* Member attendance rows */}
                <div className="space-y-3">
                  {members.map((member) => {
                    const clientData = clients.find((c) => c.id === member.clientId);
                    const att = attendances.find(
                      (a) =>
                        a.sessionId === selectedSessionForAttendance.id &&
                        a.clientId === member.clientId
                    );
                    const currentStatus: AttendanceStatus = att?.status || 'Hadir';

                    return (
                      <div
                        key={member.id}
                        className="p-3.5 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div>
                          <span className="font-bold text-xs sm:text-sm text-slate-900 block">
                            {clientData?.namaBisnis || 'Klien'} ({clientData?.namaPemilik})
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Kota: {clientData?.kota} • PIC
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {(['Hadir', 'Izin', 'Absen'] as AttendanceStatus[]).map((st) => (
                            <button
                              key={st}
                              onClick={() =>
                                handleUpdateAttendance(
                                  selectedSessionForAttendance.id,
                                  member.clientId,
                                  st
                                )
                              }
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                                currentStatus === st
                                  ? st === 'Hadir'
                                    ? 'bg-emerald-600 text-white shadow-2xs'
                                    : st === 'Izin'
                                    ? 'bg-amber-600 text-white shadow-2xs'
                                    : 'bg-rose-600 text-white shadow-2xs'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                Pilih atau jadwalkan sesi untuk mengisi presensi anggota.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: TUGAS KELOMPOK */}
      {activeTab === 'tugas' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                Tugas &amp; Action Items Anggota Grup
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Daftar tindak lanjut pengerjaan studi kasus dan implementasi lapangan dari sesi mastermind.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {tasks.filter((t) => memberClientIds.has(t.clientId)).length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Belum ada tugas yang ditugaskan ke anggota grup ini.
              </div>
            ) : (
              tasks
                .filter((t) => memberClientIds.has(t.clientId))
                .map((task) => {
                  const clientData = clients.find((c) => c.id === task.clientId);
                  const isOverdue = task.status === 'Terlambat' || isTaskOverdue(task.deadline, task.status);

                  return (
                    <div
                      key={task.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">{task.title}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-[#00236f] font-semibold">
                            {clientData?.namaBisnis}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span>PIC: <strong>{task.assigneeName}</strong></span>
                          <span>Batas Waktu: {task.deadline}</span>
                          {task.notes && <span>• {task.notes}</span>}
                        </div>
                      </div>

                      <span
                        className={`text-xs px-3 py-1 rounded-full font-bold uppercase shrink-0 ${
                          task.status === 'Selesai'
                            ? 'bg-emerald-100 text-emerald-800'
                            : isOverdue
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {isOverdue && task.status !== 'Selesai' ? 'Terlambat' : task.status}
                      </span>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* TAB 5: PENGUMUMAN */}
      {activeTab === 'pengumuman' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                Papan Pengumuman &amp; Materi Grup
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Pesan siaran, materi workshop, dan tautan tugas yang dibagikan kepada seluruh anggota grup.
              </p>
            </div>

            {isOwnerOrTimGrup && (
              <button
                onClick={() => setShowNewAnnounceModal(true)}
                className="px-3.5 py-2 rounded-xl bg-[#00236f] hover:bg-[#1e3a8a] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Pengumuman</span>
              </button>
            )}
          </div>

          <div className="space-y-4">
            {announcements.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Belum ada pengumuman yang diposting di grup ini.
              </div>
            ) : (
              announcements.map((ann) => (
                <div
                  key={ann.id}
                  className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-bold text-[#00236f]">{ann.authorName} ({ann.authorRole})</span>
                    <span>{formatWITA(ann.createdAt)}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                    {ann.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {ann.content}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal: Tambah Anggota ke Grup */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
              Tambah Klien ke Grup Mastermind
            </h3>
            <p className="text-xs text-slate-500">
              Pilih klien yang akan dimasukkan ke cohort ini. Klien dapat tergabung di beberapa grup.
            </p>

            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pilih Klien *
                </label>
                <select
                  value={selectedClientIdToAdd}
                  onChange={(e) => setSelectedClientIdToAdd(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm bg-white"
                  required
                >
                  <option value="">-- Pilih Klien --</option>
                  {availableClientsToAdd.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.namaBisnis} ({c.namaPemilik}) - {c.industri}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Keanggotaan
                </label>
                <textarea
                  rows={2}
                  value={addMemberNotes}
                  onChange={(e) => setAddMemberNotes(e.target.value)}
                  placeholder="Catatan latar belakang atau tujuan klien di grup ini..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs sm:text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#00236f] text-white text-xs font-semibold rounded-xl"
                >
                  Tambahkan ke Grup
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Jadwal Sesi Grup */}
      {showNewSessionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
              Jadwalkan Sesi Mastermind Grup
            </h3>

            <form onSubmit={handleCreateGroupSession} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Agenda / Topik Sesi *
                </label>
                <input
                  type="text"
                  value={sessionAgenda}
                  onChange={(e) => setSessionAgenda(e.target.value)}
                  placeholder="Contoh: Workshop Bedah COGS & Restrukturisasi Menu"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal &amp; Waktu (WITA) *
                  </label>
                  <input
                    type="datetime-local"
                    value={sessionDateTime}
                    onChange={(e) => setSessionDateTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Durasi (Menit)
                  </label>
                  <input
                    type="number"
                    value={sessionDuration}
                    onChange={(e) => setSessionDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tautan Google Meet
                </label>
                <input
                  type="url"
                  value={sessionMeetingUrl}
                  onChange={(e) => setSessionMeetingUrl(e.target.value)}
                  placeholder={group.meetingUrl || 'https://meet.google.com/...'}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Persiapan untuk Anggota
                </label>
                <textarea
                  rows={2}
                  value={sessionSharedNotes}
                  onChange={(e) => setSessionSharedNotes(e.target.value)}
                  placeholder="Instruksi materi yang perlu dibawa oleh peserta..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewSessionModal(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#00236f] text-white text-xs font-semibold rounded-xl"
                >
                  Simpan Sesi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Buat Pengumuman */}
      {showNewAnnounceModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
              Kirim Pengumuman ke Anggota Grup
            </h3>

            <form onSubmit={handlePostAnnouncement} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Judul Pengumuman *
                </label>
                <input
                  type="text"
                  value={announceTitle}
                  onChange={(e) => setAnnounceTitle(e.target.value)}
                  placeholder="Contoh: Rangkuman Materi & Tugas Sesi 4"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Isi Pesan / Rincian *
                </label>
                <textarea
                  rows={4}
                  value={announceContent}
                  onChange={(e) => setAnnounceContent(e.target.value)}
                  placeholder="Tuliskan pengumuman atau instruksi..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs sm:text-sm"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewAnnounceModal(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#00236f] text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" /> Kirim Pengumuman
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
