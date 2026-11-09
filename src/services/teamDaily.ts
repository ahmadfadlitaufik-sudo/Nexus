/**
 * Absensi & to-do harian tim.
 * - Absen disimpan di koleksi team_checkins (id: chk-{userId}-{tanggal}).
 *   Jam masuk/pulang dicap oleh server (tidak bisa dimanipulasi dari browser).
 * - To-do disimpan di koleksi plan_items (satu dokumen per tugas).
 */
import { collection, db, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from './store';
import { PlanItem, PlanItemStatus, TeamCheckin, UserProfile, WorkStatus } from '../types';

export interface TodoItem extends PlanItem {
  note?: string;
  priority?: 'Tinggi' | 'Normal';
  assignedById?: string;
  assignedByName?: string;
  completedAt?: string;
  updatedAt?: string;
}

export const checkinId = (userId: string, date: string) => `chk-${userId}-${date}`;

const TEAM_ROLES = ['owner', 'konsultan', 'consultant', 'tim_grup', 'tim_konten', 'staf_operasional'];

export function isTeamMember(u: UserProfile): boolean {
  return TEAM_ROLES.includes(u.role) && u.status !== 'pending' && u.status !== 'rejected';
}

// ---------------- Absen ----------------

export async function getCheckin(userId: string, date: string): Promise<TeamCheckin | null> {
  const snap = await getDoc(doc(db, 'team_checkins', checkinId(userId, date)));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as TeamCheckin) : null;
}

export async function getCheckinsByDate(date: string): Promise<TeamCheckin[]> {
  const snap = await getDocs(query(collection(db, 'team_checkins'), where('date', '==', date)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TeamCheckin);
}

export async function getAllCheckins(): Promise<TeamCheckin[]> {
  const snap = await getDocs(collection(db, 'team_checkins'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TeamCheckin);
}

/** Absen masuk. Jam masuk dicap server. */
export async function clockIn(
  user: UserProfile,
  date: string,
  workStatus: WorkStatus,
  locationNote: string,
  priorities: string[]
): Promise<TeamCheckin> {
  const id = checkinId(user.id, date);
  const now = new Date().toISOString();
  const existing = await getCheckin(user.id, date);
  const data: TeamCheckin = {
    ...(existing || {}),
    id,
    userId: user.id,
    userName: user.displayName,
    userRole: user.role,
    userAvatar: user.avatarUrl,
    date,
    workStatus,
    locationNote: locationNote.trim() || undefined,
    priorities: priorities.slice(0, 3),
    morningCheckinAt: existing?.morningCheckinAt || now,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  } as TeamCheckin;
  await setDoc(doc(db, 'team_checkins', id), data);
  return (await getCheckin(user.id, date)) || data;
}

/** Absen pulang. Jam pulang dicap server. */
export async function clockOut(
  user: UserProfile,
  date: string,
  notes: string,
  completedCount: number
): Promise<TeamCheckin | null> {
  const id = checkinId(user.id, date);
  await updateDoc(doc(db, 'team_checkins', id), {
    eveningCheckoutAt: new Date().toISOString(),
    checkoutNotes: notes.trim(),
    completedCount,
    updatedAt: new Date().toISOString(),
  });
  return getCheckin(user.id, date);
}

// ---------------- To-do ----------------

export async function getTodosForUser(userId: string): Promise<TodoItem[]> {
  const snap = await getDocs(query(collection(db, 'plan_items'), where('userId', '==', userId)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TodoItem);
}

export async function getTodosByDate(date: string): Promise<TodoItem[]> {
  const snap = await getDocs(query(collection(db, 'plan_items'), where('date', '==', date)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TodoItem);
}

export async function getAllTodos(): Promise<TodoItem[]> {
  const snap = await getDocs(collection(db, 'plan_items'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TodoItem);
}

export async function addTodo(
  input: Pick<TodoItem, 'userId' | 'date' | 'title'> &
    Partial<Pick<TodoItem, 'note' | 'priority' | 'assignedById' | 'assignedByName'>>
): Promise<TodoItem> {
  const id = `todo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  const item: TodoItem = {
    id,
    userId: input.userId,
    date: input.date,
    title: input.title.trim(),
    note: input.note?.trim() || undefined,
    priority: input.priority || 'Normal',
    status: 'Belum',
    sourceType: input.assignedById && input.assignedById !== input.userId ? 'task' : 'manual',
    assignedById: input.assignedById,
    assignedByName: input.assignedByName,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(doc(db, 'plan_items', id), item);
  return item;
}

export async function setTodoStatus(item: TodoItem, status: PlanItemStatus): Promise<void> {
  await updateDoc(doc(db, 'plan_items', item.id), {
    status,
    completedAt: status === 'Selesai' ? new Date().toISOString() : null,
    updatedAt: new Date().toISOString(),
  });
}

export async function moveTodo(item: TodoItem, date: string): Promise<void> {
  await updateDoc(doc(db, 'plan_items', item.id), {
    date,
    status: 'Belum',
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteTodo(item: TodoItem): Promise<void> {
  await deleteDoc(doc(db, 'plan_items', item.id));
}

export const OPEN_STATUSES: PlanItemStatus[] = ['Belum', 'Berjalan', 'Tertunda', 'Pindah ke besok'];
export const isOpen = (t: TodoItem) => OPEN_STATUSES.includes(t.status);
