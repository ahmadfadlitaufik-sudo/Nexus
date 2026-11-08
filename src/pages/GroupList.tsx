import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Calendar,
  Clock,
  Video,
  ArrowRight,
  Layers,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Filter,
  UserCheck,
  Building2,
  ExternalLink,
} from 'lucide-react';
import { Group, UserProfile, GroupMember, Program } from '../types';
import {
  getGroups,
  saveGroup,
  getAllGroupMembers,
  getAllUsers,
  getPrograms,
} from '../services/db';
import { useAuth } from '../context/AuthContext';

interface GroupListProps {
  onSelectGroup: (groupId: string) => void;
}

export const GroupList: React.FC<GroupListProps> = ({ onSelectGroup }) => {
  const { userProfile } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Semua' | 'Aktif' | 'Persiapan' | 'Selesai'>('Semua');

  // New Group Modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [programId, setProgramId] = useState('');
  const [facilitatorId, setFacilitatorId] = useState('');
  const [schedule, setSchedule] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [totalSessions, setTotalSessions] = useState(8);

  const role = userProfile?.role;
  const isOwnerOrTimGrup = role === 'owner' || role === 'tim_grup' || role === 'konsultan' || role === 'consultant';

  const loadData = async () => {
    try {
      const [gList, mList, uList, pList] = await Promise.all([
        getGroups(),
        getAllGroupMembers(),
        getAllUsers(),
        getPrograms(),
      ]);
      setGroups(gList);
      setMembers(mList);
      setUsers(uList);
      setPrograms(pList);
      if (uList.length > 0 && !facilitatorId) {
        const defaultFac = uList.find((u) => u.role === 'tim_grup') || uList[0];
        setFacilitatorId(defaultFac.id);
      }
    } catch (err) {
      console.error('Error loading groups:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const newId = `group-${Date.now()}`;
      const newGroup: Group = {
        id: newId,
        name: name.trim(),
        description: description.trim(),
        programId: programId || undefined,
        facilitatorId: facilitatorId || userProfile?.id || 'tim-grup-1',
        facilitatorIds: [facilitatorId || userProfile?.id || 'tim-grup-1'],
        status: 'Aktif',
        schedule: schedule.trim() || 'Setiap Selasa, 10:00 WITA',
        meetingUrl: meetingUrl.trim() || 'https://meet.google.com/nxt-mastermind',
        totalSessions: Number(totalSessions) || 8,
        completedSessions: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveGroup(newGroup);
      setGroups([...groups, newGroup]);
      setShowNewModal(false);
      setName('');
      setDescription('');
      setSchedule('');
      setMeetingUrl('');
      onSelectGroup(newId);
    } catch (err) {
      console.error('Error creating group:', err);
    }
  };

  const filteredGroups = groups.filter((g) => {
    const matchesSearch =
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'Semua' || g.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalMembersCount = members.length;
  const activeGroupsCount = groups.filter((g) => g.status === 'Aktif').length;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-50 text-[#00236f] text-[11px] font-bold uppercase tracking-wider mb-1">
            <Layers className="w-3.5 h-3.5 text-[#0051d5]" />
            Mastermind & Cohort Groups
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-['Plus_Jakarta_Sans'] tracking-tight">
            Daftar Grup & Mastermind
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Kelola kelompok bimbingan berkala, presensi kehadiran anggota, dan sesi breakout terstruktur.
          </p>
        </div>

        {isOwnerOrTimGrup && (
          <button
            onClick={() => setShowNewModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00236f] hover:bg-[#1e3a8a] text-white text-xs sm:text-sm font-semibold transition shadow-sm cursor-pointer self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Grup Baru</span>
          </button>
        )}
      </div>

      {/* Quick Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Grup
            </span>
            <div className="text-2xl font-extrabold text-[#00236f] font-['Plus_Jakarta_Sans'] mt-0.5">
              {groups.length}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {activeGroupsCount} grup aktif berjalan
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#00236f] flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Keanggotaan
            </span>
            <div className="text-2xl font-extrabold text-slate-900 font-['Plus_Jakarta_Sans'] mt-0.5">
              {totalMembersCount}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Klien dapat tergabung di &gt;1 grup
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Format Pertemuan
            </span>
            <div className="text-lg font-bold text-slate-900 font-['Plus_Jakarta_Sans'] mt-0.5">
              WFA Mastermind
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Zona Waktu WITA (UTC+8)
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-[#0051d5] flex items-center justify-center font-bold">
            <Video className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama grup atau topik..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00236f]/20 transition"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {(['Semua', 'Aktif', 'Persiapan', 'Selesai'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
                statusFilter === st
                  ? 'bg-[#00236f] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Group Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGroups.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            <Layers className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            Tidak ada grup yang sesuai dengan pencarian Anda.
          </div>
        ) : (
          filteredGroups.map((group) => {
            const groupMembers = members.filter((m) => m.groupId === group.id);
            const passiveCount = groupMembers.filter((m) => m.status === 'Pasif').length;
            const facilitator = users.find((u) => u.id === group.facilitatorId);
            const prog = programs.find((p) => p.id === group.programId);
            const totalSess = group.totalSessions || 8;
            const compSess = group.completedSessions || 0;
            const progressPct = Math.round((compSess / totalSess) * 100);

            return (
              <div
                key={group.id}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                        group.status === 'Aktif'
                          ? 'bg-emerald-100 text-emerald-800'
                          : group.status === 'Persiapan'
                          ? 'bg-blue-100 text-[#00236f]'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {group.status}
                    </span>

                    {prog && (
                      <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-medium truncate max-w-[130px]">
                        {prog.name}
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans'] leading-snug">
                      {group.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {group.description}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-[#0051d5]" />
                      <span className="font-semibold text-slate-800">{group.schedule || 'Setiap Selasa, 10:00 WITA'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                      <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                      <span>Fasilitator: <strong className="text-slate-700">{facilitator?.displayName || 'Fajar Ramadhan, B.Eng.'}</strong></span>
                    </div>
                  </div>

                  {/* Progress & Members Breakdown */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Progres Pertemuan ({compSess}/{totalSess} Sesi)</span>
                      <span className="font-bold text-[#00236f]">{progressPct}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#00236f] h-full rounded-full transition-all"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700">
                      <Users className="w-4 h-4 text-slate-400" />
                      {groupMembers.length} Anggota
                    </span>

                    {passiveCount > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-100 text-rose-800 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {passiveCount} Pasif
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => onSelectGroup(group.id)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#00236f] hover:text-[#0051d5] transition cursor-pointer"
                  >
                    Buka Detail &rarr;
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Buat Grup Baru */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
              Buat Grup / Mastermind Baru
            </h3>
            <p className="text-xs text-slate-500">
              Buat cohort pendampingan kelompok untuk mempertemukan para pengusaha sejenis.
            </p>

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Grup / Batch *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Grup CEO Scale-Up Batch 5"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Deskripsi & Fokus Bahasan
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Fokus bahasan mastermind..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs sm:text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Program Terkait
                  </label>
                  <select
                    value={programId}
                    onChange={(e) => setProgramId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                  >
                    <option value="">Umum / Tanpa Program</option>
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fasilitator / Tim Grup *
                  </label>
                  <select
                    value={facilitatorId}
                    onChange={(e) => setFacilitatorId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                    required
                  >
                    {users
                      .filter((u) => u.role === 'tim_grup' || u.role === 'owner' || u.role === 'konsultan' || u.role === 'consultant')
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.displayName} ({u.role})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jadwal Pertemuan (WITA)
                  </label>
                  <input
                    type="text"
                    value={schedule}
                    onChange={(e) => setSchedule(e.target.value)}
                    placeholder="Setiap Selasa, 10:00 WITA"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Target Total Sesi
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={totalSessions}
                    onChange={(e) => setTotalSessions(Number(e.target.value))}
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
                  value={meetingUrl}
                  onChange={(e) => setMeetingUrl(e.target.value)}
                  placeholder="https://meet.google.com/..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#00236f] hover:bg-[#1e3a8a] text-white text-xs font-semibold rounded-xl"
                >
                  Simpan &amp; Buat Grup
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
