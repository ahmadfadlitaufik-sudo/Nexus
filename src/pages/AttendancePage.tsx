import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  ClipboardList,
  Clock,
  Download,
  Flag,
  LogIn,
  LogOut,
  Plus,
  Trash2,
  ArrowRightCircle,
  Users,
  BarChart3,
  UserCheck,
  AlertCircle,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { TeamCheckin, UserProfile, WorkStatus } from '../types';
import { getAllUsers } from '../services/db';
import {
  TodoItem,
  addTodo,
  clockIn,
  clockOut,
  deleteTodo,
  getAllCheckins,
  getAllTodos,
  getCheckin,
  getCheckinsByDate,
  getTodosByDate,
  getTodosForUser,
  isOpen,
  isTeamMember,
  moveTodo,
  setTodoStatus,
} from '../services/teamDaily';
import { shiftDate, timeWITA, todayWITA } from '../utils/formatters';

/** Batas jam masuk (WITA). Absen setelah jam ini ditandai "Terlambat". */
const JAM_MASUK = '08.00';

/** Menit sejak tengah malam (WITA) dari sebuah waktu. */
function minutesWITA(iso?: string | null): number | null {
  const t = timeWITA(iso);
  if (t === '-') return null;
  const [h, m] = t.split(/[.:]/).map(Number);
  return h * 60 + m;
}

const BATAS_MENIT = 8 * 60;

const WORK_STATUSES: { value: WorkStatus; label: string }[] = [
  { value: 'Kantor', label: 'Hadir di Kantor' },
  { value: 'WFA', label: 'WFA (Kerja dari mana saja)' },
  { value: 'Izin', label: 'Izin' },
  { value: 'Sakit', label: 'Sakit' },
  { value: 'Cuti', label: 'Cuti' },
];

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  konsultan: 'Konsultan',
  consultant: 'Konsultan',
  tim_grup: 'Tim Grup',
  tim_konten: 'Tim Konten',
  staf_operasional: 'Staf Operasional',
};
const roleLabel = (u: UserProfile) => u.title || ROLE_LABELS[u.role] || u.role;

const isWorking = (s?: WorkStatus) => s === 'Kantor' || s === 'WFA';

function isLate(c?: TeamCheckin | null): boolean {
  if (!c?.morningCheckinAt || !isWorking(c.workStatus)) return false;
  const m = minutesWITA(c.morningCheckinAt);
  return m !== null && m > BATAS_MENIT;
}

function duration(c?: TeamCheckin | null): string {
  if (!c?.morningCheckinAt || !c.eveningCheckoutAt) return '-';
  const mins = Math.max(0, Math.round((+new Date(c.eveningCheckoutAt) - +new Date(c.morningCheckinAt)) / 60000));
  return `${Math.floor(mins / 60)} jam ${mins % 60} mnt`;
}

function formatDateLong(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : 'Terjadi kesalahan. Silakan coba lagi.';
}

// ---------------------------------------------------------------------------

function StatusBadge({ checkin, date }: { checkin?: TeamCheckin | null; date: string }) {
  if (!checkin?.morningCheckinAt) {
    const past = date < todayWITA();
    return (
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${past ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
        {past ? 'Tidak absen' : 'Belum absen'}
      </span>
    );
  }
  if (!isWorking(checkin.workStatus)) {
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
        {checkin.workStatus}
      </span>
    );
  }
  return (
    <span className="inline-flex gap-1">
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
        Hadir • {checkin.workStatus}
      </span>
      {isLate(checkin) && (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">Terlambat</span>
      )}
    </span>
  );
}

function TodoRow({
  item,
  canEdit,
  canDelete,
  onToggle,
  onTomorrow,
  onDelete,
}: {
  item: TodoItem;
  canEdit: boolean;
  canDelete: boolean;
  onToggle?: () => void;
  onTomorrow?: () => void;
  onDelete?: () => void;
}) {
  const done = item.status === 'Selesai';
  return (
    <li className="flex items-start gap-2.5 py-2 group">
      <button
        type="button"
        disabled={!canEdit}
        onClick={onToggle}
        className={`mt-0.5 shrink-0 ${canEdit ? 'cursor-pointer' : 'cursor-default'}`}
        title={done ? 'Tandai belum selesai' : 'Tandai selesai'}
        aria-label={done ? 'Tandai belum selesai' : 'Tandai selesai'}
      >
        {done ? (
          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
        ) : (
          <Circle className="w-4.5 h-4.5 text-slate-300 hover:text-[#0051d5]" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div className={`text-xs ${done ? 'line-through text-slate-400' : 'text-slate-800 font-medium'}`}>
          {item.priority === 'Tinggi' && !done && <Flag className="inline w-3 h-3 text-rose-500 mr-1 -mt-0.5" />}
          {item.title}
        </div>
        <div className="flex flex-wrap gap-x-2 text-[10px] text-slate-400">
          {item.assignedByName && item.assignedById !== item.userId && (
            <span className="text-[#0051d5] font-semibold">Dari {item.assignedByName}</span>
          )}
          {done && item.completedAt && <span>Selesai {timeWITA(item.completedAt)}</span>}
          {item.note && <span className="text-slate-500">{item.note}</span>}
        </div>
      </div>
      {canEdit && !done && onTomorrow && (
        <button
          type="button"
          onClick={onTomorrow}
          className="text-[10px] text-slate-400 hover:text-[#0051d5] [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 focus:opacity-100 cursor-pointer"
          title="Pindahkan ke besok"
        >
          Besok →
        </button>
      )}
      {canDelete && onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="text-slate-300 hover:text-rose-600 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 focus:opacity-100 cursor-pointer"
          title="Hapus to-do"
          aria-label="Hapus to-do"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Tab 1: Hari Saya

function MyDay({ me, onError }: { me: UserProfile; onError: (m: string) => void }) {
  const today = todayWITA();
  const [checkin, setCheckin] = useState<TeamCheckin | null>(null);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [workStatus, setWorkStatus] = useState<WorkStatus>('Kantor');
  const [location, setLocation] = useState('');
  const [outNotes, setOutNotes] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newHigh, setNewHigh] = useState(false);

  const load = async () => {
    try {
      const [c, t] = await Promise.all([getCheckin(me.id, today), getTodosForUser(me.id)]);
      setCheckin(c);
      setTodos(t);
    } catch (err) {
      onError(errorText(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [me.id]);

  const todayTodos = todos
    .filter((t) => t.date === today)
    .sort((a, b) => Number(a.status === 'Selesai') - Number(b.status === 'Selesai') || (a.priority === 'Tinggi' ? -1 : 1));
  const carryOver = todos.filter((t) => t.date < today && isOpen(t)).sort((a, b) => a.date.localeCompare(b.date));
  const doneCount = todayTodos.filter((t) => t.status === 'Selesai').length;

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      await load();
    } catch (err) {
      onError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const handleClockIn = () =>
    run(() =>
      clockIn(
        me,
        today,
        workStatus,
        location,
        todayTodos.filter(isOpen).map((t) => t.title)
      )
    );

  const handleClockOut = () => run(() => clockOut(me, today, outNotes, doneCount));

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    run(async () => {
      await addTodo({ userId: me.id, date: today, title: newTitle, priority: newHigh ? 'Tinggi' : 'Normal' });
      setNewTitle('');
      setNewHigh(false);
    });
  };

  if (loading) return <div className="text-xs text-slate-500 py-10 text-center">Memuat data hari ini...</div>;

  const hasIn = !!checkin?.morningCheckinAt;
  const hasOut = !!checkin?.eveningCheckoutAt;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      {/* ABSEN */}
      <section className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 space-y-4 h-fit">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-[#0051d5]" /> Absen Hari Ini
          </h2>
          <StatusBadge checkin={checkin} date={today} />
        </div>

        {!hasIn ? (
          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Status hari ini</label>
              <select
                value={workStatus}
                onChange={(e) => setWorkStatus(e.target.value as WorkStatus)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0051d5]"
              >
                {WORK_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {isWorking(workStatus) ? 'Lokasi kerja (opsional)' : 'Keterangan'}
              </label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={isWorking(workStatus) ? 'Contoh: Kantor Makassar / Rumah' : 'Contoh: Demam, sudah izin ke Owner'}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0051d5]"
              />
            </div>
            <button
              type="button"
              onClick={handleClockIn}
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 bg-[#00236f] hover:bg-[#1e3a8a] text-white py-2.5 rounded-xl font-bold cursor-pointer disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              {isWorking(workStatus) ? 'Absen Masuk Sekarang' : `Kirim Keterangan ${workStatus}`}
            </button>
            <p className="text-[10px] text-slate-400 text-center">
              Jam absen dicatat otomatis oleh server (WITA). Batas jam masuk: {JAM_MASUK}.
            </p>
          </div>
        ) : (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                <div className="text-[10px] text-emerald-700 font-semibold">Jam masuk</div>
                <div className="text-lg font-black text-emerald-900">{timeWITA(checkin?.morningCheckinAt)}</div>
              </div>
              <div className={`p-3 rounded-xl border ${hasOut ? 'bg-purple-50 border-purple-100' : 'bg-slate-50 border-slate-200'}`}>
                <div className={`text-[10px] font-semibold ${hasOut ? 'text-purple-700' : 'text-slate-500'}`}>Jam pulang</div>
                <div className={`text-lg font-black ${hasOut ? 'text-purple-900' : 'text-slate-400'}`}>
                  {hasOut ? timeWITA(checkin?.eveningCheckoutAt) : '--.--'}
                </div>
              </div>
            </div>
            {checkin?.locationNote && <div className="text-slate-500">📍 {checkin.locationNote}</div>}

            {isWorking(checkin?.workStatus) && !hasOut && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block font-semibold text-slate-700">Catatan pulang (opsional)</label>
                <textarea
                  value={outNotes}
                  onChange={(e) => setOutNotes(e.target.value)}
                  rows={2}
                  placeholder="Ringkasan pekerjaan hari ini / kendala"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0051d5]"
                />
                <button
                  type="button"
                  onClick={handleClockOut}
                  disabled={busy}
                  className="w-full inline-flex items-center justify-center gap-2 bg-purple-700 hover:bg-purple-800 text-white py-2.5 rounded-xl font-bold cursor-pointer disabled:opacity-50"
                >
                  <LogOut className="w-4 h-4" /> Absen Pulang
                </button>
              </div>
            )}
            {hasOut && (
              <div className="text-slate-600">
                Durasi kerja: <span className="font-bold">{duration(checkin)}</span>
                {checkin?.checkoutNotes && <div className="mt-1 text-slate-500">“{checkin.checkoutNotes}”</div>}
              </div>
            )}
          </div>
        )}
      </section>

      {/* TO-DO */}
      <section className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-[#0051d5]" /> To-Do Hari Ini
          </h2>
          <span className="text-[11px] font-semibold text-slate-500">
            {doneCount}/{todayTodos.length} selesai
          </span>
        </div>
        {todayTodos.length > 0 && (
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${(doneCount / todayTodos.length) * 100}%` }}
            />
          </div>
        )}

        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Tambah pekerjaan hari ini..."
            className="flex-1 min-w-0 px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0051d5]"
          />
          <button
            type="button"
            onClick={() => setNewHigh(!newHigh)}
            className={`px-2.5 rounded-xl border text-xs cursor-pointer ${newHigh ? 'bg-rose-50 border-rose-300 text-rose-600' : 'border-slate-300 text-slate-400'}`}
            title="Tandai prioritas tinggi"
            aria-pressed={newHigh}
          >
            <Flag className="w-3.5 h-3.5" />
          </button>
          <button
            type="submit"
            disabled={busy || !newTitle.trim()}
            className="inline-flex items-center gap-1 px-3 rounded-xl bg-[#00236f] text-white text-xs font-bold cursor-pointer disabled:opacity-40"
          >
            <Plus className="w-4 h-4" /> Tambah
          </button>
        </form>

        {todayTodos.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">Belum ada to-do untuk hari ini.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {todayTodos.map((t) => (
              <TodoRow
                key={t.id}
                item={t}
                canEdit
                canDelete={!t.assignedById || t.assignedById === me.id}
                onToggle={() => run(() => setTodoStatus(t, t.status === 'Selesai' ? 'Belum' : 'Selesai'))}
                onTomorrow={() => run(() => moveTodo(t, shiftDate(today, 1)))}
                onDelete={() => run(() => deleteTodo(t))}
              />
            ))}
          </ul>
        )}

        {carryOver.length > 0 && (
          <div className="pt-3 border-t border-slate-100">
            <div className="text-[11px] font-bold text-amber-700 mb-1 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" /> Belum selesai dari hari sebelumnya ({carryOver.length})
            </div>
            <ul className="divide-y divide-slate-100">
              {carryOver.map((t) => (
                <li key={t.id} className="flex items-center gap-2 py-2 text-xs">
                  <span className="text-[10px] text-slate-400 w-16 shrink-0">{t.date.slice(5).split('-').reverse().join('/')}</span>
                  <span className="flex-1 min-w-0 text-slate-700">{t.title}</span>
                  <button
                    type="button"
                    onClick={() => run(() => moveTodo(t, today))}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0051d5] hover:underline cursor-pointer"
                  >
                    <ArrowRightCircle className="w-3.5 h-3.5" /> Kerjakan hari ini
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 2: Papan Tim

function TeamBoard({ me, onError }: { me: UserProfile; onError: (m: string) => void }) {
  const isOwner = me.role === 'owner';
  const [date, setDate] = useState(todayWITA());
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [checkins, setCheckins] = useState<TeamCheckin[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignFor, setAssignFor] = useState<string | null>(null);
  const [assignTitle, setAssignTitle] = useState('');
  const [assignHigh, setAssignHigh] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [u, c, t] = await Promise.all([getAllUsers(), getCheckinsByDate(date), getTodosByDate(date)]);
      setMembers(u.filter(isTeamMember).sort((a, b) => a.displayName.localeCompare(b.displayName)));
      setCheckins(c);
      setTodos(t);
    } catch (err) {
      onError(errorText(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [date]);

  const byUser = useMemo(() => new Map(checkins.map((c) => [c.userId, c])), [checkins]);
  const hadir = members.filter((m) => isWorking(byUser.get(m.id)?.workStatus) && byUser.get(m.id)?.morningCheckinAt).length;
  const absen = members.filter((m) => byUser.get(m.id) && !isWorking(byUser.get(m.id)?.workStatus)).length;
  const belum = members.length - hadir - absen;
  const todoDone = todos.filter((t) => t.status === 'Selesai').length;

  const handleAssign = async (e: React.FormEvent, userId: string) => {
    e.preventDefault();
    if (!assignTitle.trim()) return;
    try {
      await addTodo({
        userId,
        date,
        title: assignTitle,
        priority: assignHigh ? 'Tinggi' : 'Normal',
        assignedById: me.id,
        assignedByName: me.displayName,
      });
      setAssignTitle('');
      setAssignHigh(false);
      setAssignFor(null);
      await load();
    } catch (err) {
      onError(errorText(err));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setDate(shiftDate(date, -1))}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"
            aria-label="Hari sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
          />
          <button
            type="button"
            onClick={() => setDate(shiftDate(date, 1))}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"
            aria-label="Hari berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          {date !== todayWITA() && (
            <button type="button" onClick={() => setDate(todayWITA())} className="text-xs text-[#0051d5] font-semibold ml-1 cursor-pointer">
              Hari ini
            </button>
          )}
        </div>
        <div className="text-xs text-slate-500">{formatDateLong(date)}</div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Hadir', value: hadir, cls: 'text-emerald-700' },
          { label: 'Izin / Sakit / Cuti', value: absen, cls: 'text-amber-700' },
          { label: date < todayWITA() ? 'Tidak absen' : 'Belum absen', value: belum, cls: 'text-slate-700' },
          { label: 'To-do selesai', value: `${todoDone}/${todos.length}`, cls: 'text-[#00236f]' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-3">
            <div className={`text-xl font-black ${s.cls}`}>{s.value}</div>
            <div className="text-[11px] text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-xs text-slate-500 py-10 text-center">Memuat papan tim...</div>
      ) : members.length === 0 ? (
        <div className="text-xs text-slate-500 py-10 text-center">Belum ada anggota tim aktif.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {members.map((m) => {
            const c = byUser.get(m.id);
            const list = todos
              .filter((t) => t.userId === m.id)
              .sort((a, b) => Number(a.status === 'Selesai') - Number(b.status === 'Selesai'));
            const done = list.filter((t) => t.status === 'Selesai').length;
            const canAssign = isOwner || m.id === me.id;
            return (
              <div key={m.id} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate">{m.displayName}</div>
                    <div className="text-[11px] text-slate-500 truncate">{roleLabel(m)}</div>
                  </div>
                  <StatusBadge checkin={c} date={date} />
                </div>
                {c?.morningCheckinAt && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Masuk {timeWITA(c.morningCheckinAt)}
                    </span>
                    <span>Pulang {c.eveningCheckoutAt ? timeWITA(c.eveningCheckoutAt) : '-'}</span>
                    {c.eveningCheckoutAt && <span>{duration(c)}</span>}
                    {c.locationNote && <span className="text-slate-400">📍 {c.locationNote}</span>}
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                    <span>To-do ({done}/{list.length})</span>
                    {canAssign && (
                      <button
                        type="button"
                        onClick={() => setAssignFor(assignFor === m.id ? null : m.id)}
                        className="inline-flex items-center gap-0.5 text-[#0051d5] hover:underline cursor-pointer"
                      >
                        {assignFor === m.id ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                        {m.id === me.id ? 'Tambah' : 'Tugaskan'}
                      </button>
                    )}
                  </div>
                  {assignFor === m.id && (
                    <form onSubmit={(e) => handleAssign(e, m.id)} className="flex gap-1.5 mt-2">
                      <input
                        autoFocus
                        value={assignTitle}
                        onChange={(e) => setAssignTitle(e.target.value)}
                        placeholder={`Tugas untuk ${m.displayName.split(' ')[0]}...`}
                        className="flex-1 min-w-0 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#0051d5]"
                      />
                      <button
                        type="button"
                        onClick={() => setAssignHigh(!assignHigh)}
                        className={`px-2 rounded-lg border cursor-pointer ${assignHigh ? 'bg-rose-50 border-rose-300 text-rose-600' : 'border-slate-300 text-slate-400'}`}
                        title="Prioritas tinggi"
                        aria-pressed={assignHigh}
                      >
                        <Flag className="w-3 h-3" />
                      </button>
                      <button
                        type="submit"
                        className="px-2.5 rounded-lg bg-[#00236f] text-white text-[11px] font-bold cursor-pointer"
                      >
                        Simpan
                      </button>
                    </form>
                  )}
                  {list.length === 0 ? (
                    <p className="text-[11px] text-slate-400 mt-1.5">Belum ada to-do.</p>
                  ) : (
                    <ul className="divide-y divide-slate-50">
                      {list.map((t) => (
                        <TodoRow key={t.id} item={t} canEdit={false} canDelete={isOwner} onDelete={async () => {
                          try {
                            await deleteTodo(t);
                            await load();
                          } catch (err) {
                            onError(errorText(err));
                          }
                        }} />
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 3: Rekap Bulanan (Owner)

interface RecapRow {
  user: UserProfile;
  hadir: number;
  terlambat: number;
  izin: number;
  sakit: number;
  cuti: number;
  avgIn: string;
  todoDone: number;
  todoTotal: number;
}

function MonthlyRecap({ onError }: { onError: (m: string) => void }) {
  const [month, setMonth] = useState(todayWITA().slice(0, 7));
  const [rows, setRows] = useState<RecapRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [users, checkins, todos] = await Promise.all([getAllUsers(), getAllCheckins(), getAllTodos()]);
        const inMonth = (d?: string) => !!d && d.startsWith(month);
        const result = users.filter(isTeamMember).map((u) => {
          const cs = checkins.filter((c) => c.userId === u.id && inMonth(c.date) && c.morningCheckinAt);
          const working = cs.filter((c) => isWorking(c.workStatus));
          const mins = working.map((c) => minutesWITA(c.morningCheckinAt)).filter((v): v is number => v !== null);
          const avg = mins.length ? Math.round(mins.reduce((a, b) => a + b, 0) / mins.length) : null;
          const ts = todos.filter((t) => t.userId === u.id && inMonth(t.date));
          return {
            user: u,
            hadir: working.length,
            terlambat: working.filter(isLate).length,
            izin: cs.filter((c) => c.workStatus === 'Izin').length,
            sakit: cs.filter((c) => c.workStatus === 'Sakit').length,
            cuti: cs.filter((c) => c.workStatus === 'Cuti').length,
            avgIn: avg === null ? '-' : `${String(Math.floor(avg / 60)).padStart(2, '0')}.${String(avg % 60).padStart(2, '0')}`,
            todoDone: ts.filter((t) => t.status === 'Selesai').length,
            todoTotal: ts.length,
          };
        });
        setRows(result.sort((a, b) => a.user.displayName.localeCompare(b.user.displayName)));
      } catch (err) {
        onError(errorText(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [month]);

  const exportCsv = () => {
    const header = ['Nama', 'Peran', 'Hadir', 'Terlambat', 'Izin', 'Sakit', 'Cuti', 'Rata-rata jam masuk', 'To-do selesai', 'Total to-do'];
    const lines = rows.map((r) =>
      [r.user.displayName, roleLabel(r.user), r.hadir, r.terlambat, r.izin, r.sakit, r.cuti, r.avgIn, r.todoDone, r.todoTotal]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    );
    const blob = new Blob(['﻿' + [header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `rekap-absen-${month}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <label className="font-semibold text-slate-700" htmlFor="recap-month">Bulan</label>
          <input
            id="recap-month"
            type="month"
            value={month}
            onChange={(e) => e.target.value && setMonth(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg"
          />
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={rows.length === 0}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold hover:bg-slate-50 cursor-pointer disabled:opacity-40"
        >
          <Download className="w-3.5 h-3.5" /> Unduh Excel (CSV)
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-xs min-w-[720px]">
          <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Nama</th>
              <th className="px-3 py-3 font-semibold">Hadir</th>
              <th className="px-3 py-3 font-semibold">Terlambat</th>
              <th className="px-3 py-3 font-semibold">Izin</th>
              <th className="px-3 py-3 font-semibold">Sakit</th>
              <th className="px-3 py-3 font-semibold">Cuti</th>
              <th className="px-3 py-3 font-semibold">Rata-rata masuk</th>
              <th className="px-3 py-3 font-semibold">To-do selesai</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-slate-500">Menghitung rekap...</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-slate-500">Belum ada anggota tim.</td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.user.id} className="text-center">
                  <td className="text-left px-4 py-3">
                    <div className="font-semibold text-slate-900">{r.user.displayName}</div>
                    <div className="text-[10px] text-slate-400">{roleLabel(r.user)}</div>
                  </td>
                  <td className="px-3 py-3 font-bold text-emerald-700">{r.hadir}</td>
                  <td className={`px-3 py-3 ${r.terlambat ? 'font-bold text-orange-600' : 'text-slate-400'}`}>{r.terlambat}</td>
                  <td className="px-3 py-3">{r.izin}</td>
                  <td className="px-3 py-3">{r.sakit}</td>
                  <td className="px-3 py-3">{r.cuti}</td>
                  <td className="px-3 py-3">{r.avgIn}</td>
                  <td className="px-3 py-3">
                    {r.todoTotal ? `${r.todoDone}/${r.todoTotal} (${Math.round((r.todoDone / r.todoTotal) * 100)}%)` : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-slate-400">
        "Terlambat" = absen masuk setelah jam {JAM_MASUK} WITA. "Hadir" menghitung absen Kantor & WFA.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------

export const AttendancePage: React.FC = () => {
  const { userProfile } = useAuth();
  const isOwner = userProfile?.role === 'owner';
  const [tab, setTab] = useState<'me' | 'team' | 'recap'>('me');
  const [error, setError] = useState<string | null>(null);

  if (!userProfile) return null;

  const tabs = [
    { id: 'me' as const, label: 'Hari Saya', icon: UserCheck },
    { id: 'team' as const, label: 'Papan Tim', icon: Users },
    ...(isOwner ? [{ id: 'recap' as const, label: 'Rekap Bulanan', icon: BarChart3 }] : []),
  ];

  return (
    <div className="space-y-5 pb-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-['Plus_Jakarta_Sans'] flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-[#0051d5]" /> Absen &amp; To-Do Harian
          </h1>
          <p className="text-xs text-slate-500 mt-1">{formatDateLong(todayWITA())} • Waktu WITA</p>
        </div>
        <div className="bg-slate-200/70 p-1 rounded-xl flex">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer ${
                tab === t.id ? 'bg-white text-[#00236f] shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-2">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="cursor-pointer" aria-label="Tutup">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {tab === 'me' && <MyDay me={userProfile} onError={setError} />}
      {tab === 'team' && <TeamBoard me={userProfile} onError={setError} />}
      {tab === 'recap' && isOwner && <MonthlyRecap onError={setError} />}
    </div>
  );
};

