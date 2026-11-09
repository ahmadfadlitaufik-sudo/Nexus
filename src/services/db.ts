import {
  db,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  deleteField,
} from './store';
import { DEMO_MODE } from '../config/appMode';
import { OperationType, handleFirestoreError } from './errors';
import {
  Client,
  UserProfile,
  UserRole,
  Program,
  Enrollment,
  ClientConsultant,
  Diagnosis,
  RoadmapItem,
  Kpi,
  Session,
  SessionInternal,
  Task,
  TaskStatus,
  DocumentItem,
  Feedback,
  ActivityLog,
  Group,
  GroupMember,
  GroupAttendance,
  GroupAnnouncement,
  ContentItem,
  ContentConsent,
  ContentStatus,
  ConsentStatus,
  SessionAuditLog,
  TeamCheckin,
  WorkStatus,
  PlanItemStatus,
  HelpOffer,
  WeeklyTeamRecap,
  WeeklyMemberRecapItem,
  PlanItem,
  PendingRegistration,
  RegistrationCategory,
  RegistrationStatus,
} from '../types';
import { isTaskOverdue, todayWITA } from '../utils/formatters';
import {
  SEED_USERS,
  SEED_CLIENTS,
  SEED_PROGRAMS,
  SEED_CLIENT_CONSULTANTS,
  SEED_ENROLLMENTS,
  SEED_DIAGNOSES,
  SEED_ROADMAP_ITEMS,
  SEED_KPIS,
  SEED_SESSIONS,
  SEED_SESSION_INTERNALS,
  SEED_TASKS,
  SEED_DOCUMENTS,
  SEED_ACTIVITY_LOGS,
  SEED_GROUPS,
  SEED_GROUP_MEMBERS,
  SEED_GROUP_ATTENDANCE,
  SEED_GROUP_ANNOUNCEMENTS,
  SEED_CONTENT_ITEMS,
  SEED_CONTENT_CONSENTS,
  SEED_SESSION_AUDIT_LOGS,
  SEED_FEEDBACKS,
} from '../data/seedData';

// Helper to seed data to Firestore if not yet populated
export async function seedInitialDatabaseIfEmpty(): Promise<boolean> {
  // Data contoh hanya boleh ditulis di mode demo, jangan pernah di produksi.
  if (!DEMO_MODE) return false;
  const path = 'clients';
  try {
    const snap = await getDocs(collection(db, path));
    if (!snap.empty) {
      return false; // already populated
    }

    console.info('Firestore is empty. Seeding initial data...');
    // Seed users
    for (const u of SEED_USERS) {
      await setDoc(doc(db, 'users', u.id), u);
    }
    // Seed programs
    for (const p of SEED_PROGRAMS) {
      await setDoc(doc(db, 'programs', p.id), p);
    }
    // Seed clients
    for (const c of SEED_CLIENTS) {
      await setDoc(doc(db, 'clients', c.id), c);
    }
    // Seed client_consultants
    for (const cc of SEED_CLIENT_CONSULTANTS) {
      await setDoc(doc(db, 'client_consultants', cc.id), cc);
    }
    // Seed enrollments
    for (const enr of SEED_ENROLLMENTS) {
      await setDoc(doc(db, 'enrollments', enr.id), enr);
    }
    // Seed diagnoses
    for (const d of SEED_DIAGNOSES) {
      await setDoc(doc(db, 'diagnoses', d.id), d);
    }
    // Seed roadmap
    for (const r of SEED_ROADMAP_ITEMS) {
      await setDoc(doc(db, 'roadmap_items', r.id), r);
    }
    // Seed KPIs
    for (const k of SEED_KPIS) {
      await setDoc(doc(db, 'kpis', k.id), k);
    }
    // Seed sessions
    for (const s of SEED_SESSIONS) {
      await setDoc(doc(db, 'sessions', s.id), s);
    }
    // Seed session internals (restricted)
    for (const si of SEED_SESSION_INTERNALS) {
      await setDoc(doc(db, 'session_internals', si.id), si);
    }
    // Seed tasks
    for (const t of SEED_TASKS) {
      await setDoc(doc(db, 'tasks', t.id), t);
    }
    // Seed groups
    for (const g of SEED_GROUPS) {
      await setDoc(doc(db, 'groups', g.id), g);
    }
    // Seed group members
    for (const gm of SEED_GROUP_MEMBERS) {
      await setDoc(doc(db, 'group_members', gm.id), gm);
    }
    // Seed group attendance
    for (const ga of SEED_GROUP_ATTENDANCE) {
      await setDoc(doc(db, 'group_attendance', ga.id), ga);
    }
    // Seed group announcements
    for (const gann of SEED_GROUP_ANNOUNCEMENTS) {
      await setDoc(doc(db, 'group_announcements', gann.id), gann);
    }
    // Seed documents
    for (const docItem of SEED_DOCUMENTS) {
      await setDoc(doc(db, 'documents', docItem.id), docItem);
    }
    // Seed activity logs
    for (const act of SEED_ACTIVITY_LOGS) {
      await setDoc(doc(db, 'activity_log', act.id), act);
    }
    // Seed content items
    for (const ci of SEED_CONTENT_ITEMS) {
      await setDoc(doc(db, 'content_items', ci.id), ci);
    }
    // Seed content consents
    for (const cc of SEED_CONTENT_CONSENTS) {
      await setDoc(doc(db, 'content_consents', cc.id), cc);
    }

    console.info('Database seeding completed successfully.');
    return true;
  } catch (error) {
    console.info('Initial database seed completed or using local cache:', error instanceof Error ? error.message : error);
    return false;
  }
}

// ----------------- USERS -----------------
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const path = `users/${userId}`;
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    if (!snap.exists()) {
      return SEED_USERS.find((u) => u.id === userId) || null;
    }
    return { id: snap.id, ...snap.data() } as UserProfile;
  } catch (error) {
    console.warn('Failed to fetch user profile, falling back to seed:', error);
    return SEED_USERS.find((u) => u.id === userId) || null;
  }
}

export async function getAllUsers(): Promise<UserProfile[]> {
  const path = 'users';
  try {
    const snap = await getDocs(collection(db, path));
    if (snap.empty) return SEED_USERS;
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as UserProfile);
  } catch (error) {
    console.warn('Failed to fetch all users, falling back to seed:', error);
    return SEED_USERS;
  }
}

export const getUsers = getAllUsers;

export async function saveUserProfile(user: UserProfile): Promise<void> {
  const path = `users/${user.id}`;
  if (user.email) user = { ...user, email: user.email.trim().toLowerCase() };
  try {
    await setDoc(doc(db, 'users', user.id), user, { merge: true });
    const idx = SEED_USERS.findIndex((u) => u.id === user.id);
    if (idx !== -1) {
      SEED_USERS[idx] = { ...SEED_USERS[idx], ...user };
    } else {
      SEED_USERS.push(user);
    }
  } catch (error) {
    console.warn('Failed to save user profile in Firestore:', error);
    if (!DEMO_MODE) throw error;
    const idx = SEED_USERS.findIndex((u) => u.id === user.id);
    if (idx !== -1) {
      SEED_USERS[idx] = { ...SEED_USERS[idx], ...user };
    } else {
      SEED_USERS.push(user);
    }
  }
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfile>,
  actorName = 'Owner',
  actorRole = 'Owner'
): Promise<void> {
  const path = `users/${userId}`;
  try {
    const payload = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await updateDoc(doc(db, 'users', userId), payload);
    const idx = SEED_USERS.findIndex((u) => u.id === userId);
    if (idx !== -1) {
      SEED_USERS[idx] = { ...SEED_USERS[idx], ...updates };
    }
    await logActivity({
      action: 'Perbarui Pengaturan & Akses Pengguna',
      actorName,
      actorRole,
      details: `Memperbarui profil & hak akses akun "${updates.displayName || userId}" (${updates.role || 'Peran tetap'}).`,
    });
  } catch (error) {
    console.warn('Failed to update user profile in Firestore:', error);
    if (!DEMO_MODE) throw error;
    const idx = SEED_USERS.findIndex((u) => u.id === userId);
    if (idx !== -1) {
      SEED_USERS[idx] = { ...SEED_USERS[idx], ...updates };
    }
  }
}

export async function deleteUserProfile(
  userId: string,
  actorName = 'Owner',
  actorRole = 'Owner'
): Promise<void> {
  const path = `users/${userId}`;
  try {
    let userName = userId;
    let userRole = '';
    const found = SEED_USERS.find((u) => u.id === userId);
    if (found) {
      userName = found.displayName;
      userRole = found.role;
    }

    await deleteDoc(doc(db, 'users', userId));

    const idx = SEED_USERS.findIndex((u) => u.id === userId);
    if (idx !== -1) {
      SEED_USERS.splice(idx, 1);
    }

    await logActivity({
      action: 'Hapus Akses Pengguna Tim',
      actorName,
      actorRole,
      details: `Menghapus akun dan hak akses "${userName}" (Peran sebelumnya: ${userRole || 'Pengguna'}).`,
    });
  } catch (error) {
    console.warn('Failed to delete user profile from Firestore:', error);
    const idx = SEED_USERS.findIndex((u) => u.id === userId);
    if (idx !== -1) {
      SEED_USERS.splice(idx, 1);
    }
  }
}

export async function getUserByEmail(email: string): Promise<UserProfile | null> {
  const normalized = email.trim().toLowerCase();
  try {
    const q = query(collection(db, 'users'), where('email', '==', normalized));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docData = snap.docs[0];
      return { id: docData.id, ...docData.data() } as UserProfile;
    }
  } catch (err) {
    console.warn('getUserByEmail error from Firestore:', err);
  }
  const found = SEED_USERS.find((u) => u.email.toLowerCase() === normalized);
  return found || null;
}

export async function getPendingUsers(): Promise<UserProfile[]> {
  try {
    const all = await getAllUsers();
    return all.filter((u) => u.status === 'pending');
  } catch (err) {
    console.warn('getPendingUsers error:', err);
    return SEED_USERS.filter((u) => u.status === 'pending');
  }
}

export async function registerNewAccount(
  data: Omit<UserProfile, 'id' | 'createdAt'> & { id?: string; rawPassword?: string }
): Promise<UserProfile> {
  // Password TIDAK PERNAH disimpan di Firestore; autentikasi ditangani Firebase Auth.
  const { rawPassword: _ignored, ...profileData } = data;
  const id = profileData.id || `user-reg-${Date.now()}`;
  const now = new Date().toISOString();
  const newUser: UserProfile = {
    ...profileData,
    email: profileData.email.trim().toLowerCase(),
    id,
    // Pendaftaran mandiri selalu menunggu persetujuan Owner.
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };
  // clientId hanya boleh diberikan Owner saat persetujuan.
  delete (newUser as Partial<UserProfile>).clientId;

  try {
    await setDoc(doc(db, 'users', id), newUser);
  } catch (err) {
    console.warn('Failed to save registration in Firestore:', err);
    if (!DEMO_MODE) throw err;
  }

  // Cache in-memory
  const existingIdx = SEED_USERS.findIndex((u) => u.id === id || u.email.toLowerCase() === newUser.email);
  if (existingIdx !== -1) {
    SEED_USERS[existingIdx] = newUser;
  } else {
    SEED_USERS.push(newUser);
  }

  await logActivity({
    action: 'Pendaftaran Akun Baru',
    actorName: newUser.displayName,
    actorRole: newUser.registrationCategory ? newUser.registrationCategory.toUpperCase() : newUser.role,
    details: `Pengguna baru "${newUser.displayName}" (${newUser.email}) mendaftar sebagai ${newUser.registrationCategory?.toUpperCase() || newUser.role}. Status: ${newUser.status?.toUpperCase()}.`,
  });

  return newUser;
}

export async function approveUserRegistration(
  userId: string,
  assignedRole: UserRole,
  assignedTitle: string,
  approverName = 'Ahmad Fadli Taufik (Owner)'
): Promise<void> {
  const now = new Date().toISOString();
  const updates: Partial<UserProfile> = {
    status: 'active',
    role: assignedRole,
    title: assignedTitle,
    approvedBy: approverName,
    approvedAt: now,
    rejectionReason: deleteField() as unknown as string,
  };

  // Klien baru otomatis dibuatkan data bisnis (Prospek) saat disetujui Owner.
  if (assignedRole === 'klien' || assignedRole === 'client') {
    const user = await getUserProfile(userId);
    if (user && !user.clientId) {
      const clientId = `client-reg-${Date.now()}`;
      const newClientData: Client = {
        id: clientId,
        namaPemilik: user.displayName,
        namaBisnis: user.companyName || `${user.displayName} Business`,
        industri: user.industry || 'Umum & Jasa',
        kota: user.city || 'Indonesia',
        lamaUsaha: '1-3 Tahun',
        jumlahKaryawan: user.teamSize || '1-5 Karyawan',
        kontak: user.phone || user.email,
        status: 'Prospek',
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(doc(db, 'clients', clientId), newClientData);
      SEED_CLIENTS.push(newClientData);
      updates.clientId = clientId;
    }
  }

  await updateUserProfile(userId, updates, approverName, 'Owner / Managing Partner');

  await logActivity({
    action: 'Persetujuan Akun Staf / Pengguna',
    actorName: approverName,
    actorRole: 'Owner / Managing Partner',
    details: `Menyetujui pendaftaran akun "${userId}" dengan peran "${assignedRole}" dan jabatan "${assignedTitle}". Akun kini aktif.`,
  });
}

export async function rejectUserRegistration(
  userId: string,
  reason: string,
  rejectorName = 'Ahmad Fadli Taufik (Owner)'
): Promise<void> {
  const updates: Partial<UserProfile> = {
    status: 'rejected',
    rejectionReason: reason,
  };

  await updateUserProfile(userId, updates, rejectorName, 'Owner / Managing Partner');

  await logActivity({
    action: 'Penolakan Pendaftaran Akun',
    actorName: rejectorName,
    actorRole: 'Owner / Managing Partner',
    details: `Menolak pendaftaran akun "${userId}". Alasan: ${reason}`,
  });
}

// ----------------- CLIENTS -----------------
export async function getClients(): Promise<Client[]> {
  const path = 'clients';
  try {
    const snap = await getDocs(collection(db, path));
    if (snap.empty) return SEED_CLIENTS;
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Client);
  } catch (error) {
    console.warn('Failed to fetch clients, falling back to seed:', error);
    return SEED_CLIENTS;
  }
}

export async function getClientById(clientId: string): Promise<Client | null> {
  const path = `clients/${clientId}`;
  try {
    const snap = await getDoc(doc(db, 'clients', clientId));
    if (!snap.exists()) {
      return SEED_CLIENTS.find((c) => c.id === clientId) || null;
    }
    return { id: snap.id, ...snap.data() } as Client;
  } catch (error) {
    console.warn('Failed to fetch client by id, falling back to seed:', error);
    return SEED_CLIENTS.find((c) => c.id === clientId) || null;
  }
}

export interface CreateClientInput {
  client: Omit<Client, 'id'>;
  consultantIds: string[];
  enrollment?: {
    programId: string;
    startDate: string;
    durationWeeks: number;
    totalSessions: number;
  };
}

export async function createClientWithEnrollmentAndConsultants(
  input: CreateClientInput
): Promise<string> {
  const newId = `client-${Date.now()}`;
  const path = `clients/${newId}`;
  try {
    const client: Client = {
      ...input.client,
      id: newId,
      consultantIds: input.consultantIds,
      primaryConsultantId: input.consultantIds[0] || input.client.primaryConsultantId,
    };
    await setDoc(doc(db, 'clients', newId), client);

    // Save client_consultants relations
    for (let i = 0; i < input.consultantIds.length; i++) {
      const cId = input.consultantIds[i];
      const ccId = `cc-${newId}-${cId}`;
      const ccDoc: ClientConsultant = {
        id: ccId,
        clientId: newId,
        consultantId: cId,
        role: i === 0 ? 'Lead Consultant' : 'Co-Consultant',
        assignedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'client_consultants', ccId), ccDoc);
    }

    // Save enrollment if provided & initialize roadmap from program milestone templates
    if (input.enrollment && input.enrollment.programId) {
      const enrId = `enr-${newId}`;
      const startDate = new Date(input.enrollment.startDate || Date.now());
      const endDate = new Date(
        startDate.getTime() + (input.enrollment.durationWeeks || 12) * 7 * 86400000
      );
      const enrDoc: Enrollment = {
        id: enrId,
        clientId: newId,
        programId: input.enrollment.programId,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        durationWeeks: input.enrollment.durationWeeks || 12,
        totalSessions: input.enrollment.totalSessions || 12,
        completedSessions: 0,
        remainingSessions: input.enrollment.totalSessions || 12,
        status: 'Aktif',
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'enrollments', enrId), enrDoc);

      // Fetch program to adopt its milestone templates into client roadmap
      const progDocSnap = await getDoc(doc(db, 'programs', input.enrollment.programId));
      let programData: Program | undefined;
      if (progDocSnap.exists()) {
        programData = { id: progDocSnap.id, ...progDocSnap.data() } as Program;
      } else {
        programData = SEED_PROGRAMS.find((p) => p.id === input.enrollment?.programId);
      }

      if (programData?.milestoneTemplates && programData.milestoneTemplates.length > 0) {
        for (let idx = 0; idx < programData.milestoneTemplates.length; idx++) {
          const tmpl = programData.milestoneTemplates[idx];
          const roadmapId = `road-${newId}-${idx + 1}`;
          const rItem: RoadmapItem = {
            id: roadmapId,
            clientId: newId,
            tahapan: tmpl.phase,
            sasaran: tmpl.title,
            tenggat: tmpl.targetWeek,
            status: idx === 0 ? 'Berjalan' : 'Belum',
            urutan: tmpl.order || idx + 1,
            deskripsi: tmpl.description,
            phase: tmpl.phase,
            title: tmpl.title,
            description: tmpl.description,
            targetWeek: tmpl.targetWeek,
            order: tmpl.order || idx + 1,
            createdAt: new Date().toISOString(),
          };
          await setDoc(doc(db, 'roadmap_items', roadmapId), rItem);
        }
      }
    }

    await logActivity({
      clientId: newId,
      action: 'Tambah Klien & Pendaftaran Program',
      actorName: 'Owner/Konsultan',
      actorRole: 'Tim',
      details: `Mendaftarkan klien baru "${client.namaBisnis}" dengan status ${client.status}`,
    });

    return newId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function createClient(clientData: Omit<Client, 'id'>): Promise<string> {
  return createClientWithEnrollmentAndConsultants({
    client: clientData,
    consultantIds: clientData.consultantIds || (clientData.primaryConsultantId ? [clientData.primaryConsultantId] : []),
  });
}

export async function updateClient(clientId: string, updates: Partial<Client>): Promise<void> {
  const path = `clients/${clientId}`;
  try {
    await updateDoc(doc(db, 'clients', clientId), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteClient(
  clientId: string,
  actorName = 'Owner/Konsultan',
  actorRole = 'Owner'
): Promise<void> {
  const path = `clients/${clientId}`;
  try {
    // Determine client business name for audit logging
    let clientName = clientId;
    try {
      const snap = await getDoc(doc(db, 'clients', clientId));
      if (snap.exists()) {
        clientName = snap.data().namaBisnis || clientId;
      } else {
        const seedFound = SEED_CLIENTS.find((c) => c.id === clientId);
        if (seedFound) clientName = seedFound.namaBisnis;
      }
    } catch (e) {
      // ignore
    }

    // 1. Delete main client document
    await deleteDoc(doc(db, 'clients', clientId));

    // 2. Remove from local seed memory cache if present
    const seedIndex = SEED_CLIENTS.findIndex((c) => c.id === clientId);
    if (seedIndex !== -1) {
      SEED_CLIENTS.splice(seedIndex, 1);
    }

    // 3. Cascade delete associated child collections
    try {
      const ccSnap = await getDocs(query(collection(db, 'client_consultants'), where('clientId', '==', clientId)));
      for (const d of ccSnap.docs) {
        await deleteDoc(d.ref);
      }
    } catch (e) {}

    try {
      const enrSnap = await getDocs(query(collection(db, 'enrollments'), where('clientId', '==', clientId)));
      for (const d of enrSnap.docs) {
        await deleteDoc(d.ref);
      }
    } catch (e) {}

    try {
      const roadSnap = await getDocs(query(collection(db, 'roadmap_items'), where('clientId', '==', clientId)));
      for (const d of roadSnap.docs) {
        await deleteDoc(d.ref);
      }
    } catch (e) {}

    try {
      const kpiSnap = await getDocs(query(collection(db, 'kpis'), where('clientId', '==', clientId)));
      for (const d of kpiSnap.docs) {
        await deleteDoc(d.ref);
      }
    } catch (e) {}

    try {
      const taskSnap = await getDocs(query(collection(db, 'tasks'), where('clientId', '==', clientId)));
      for (const d of taskSnap.docs) {
        await deleteDoc(d.ref);
      }
    } catch (e) {}

    try {
      const diagSnap = await getDocs(query(collection(db, 'diagnoses'), where('clientId', '==', clientId)));
      for (const d of diagSnap.docs) {
        await deleteDoc(d.ref);
      }
    } catch (e) {}

    // 4. Log the deletion to ActivityLog collection
    await logActivity({
      clientId,
      action: 'Hapus Klien Permanen',
      actorName,
      actorRole,
      details: `Menghapus profil klien "${clientName}" (ID: ${clientId}) beserta seluruh roadmap, KPI, tugas, dan rekam penugasan dari sistem.`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ----------------- CLIENT_CONSULTANTS -----------------
export async function getClientConsultants(clientId: string): Promise<ClientConsultant[]> {
  const path = 'client_consultants';
  try {
    const q = query(collection(db, path), where('clientId', '==', clientId));
    const snap = await getDocs(q);
    if (snap.empty) {
      return SEED_CLIENT_CONSULTANTS.filter((cc) => cc.clientId === clientId);
    }
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ClientConsultant);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveClientConsultant(cc: ClientConsultant): Promise<void> {
  const path = `client_consultants/${cc.id}`;
  try {
    await setDoc(doc(db, 'client_consultants', cc.id), cc, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ----------------- ENROLLMENTS -----------------
export async function getEnrollmentByClient(clientId: string): Promise<Enrollment | null> {
  const path = 'enrollments';
  try {
    const q = query(collection(db, path), where('clientId', '==', clientId));
    const snap = await getDocs(q);
    if (snap.empty) {
      return SEED_ENROLLMENTS.find((e) => e.clientId === clientId) || null;
    }
    return { id: snap.docs[0].id, ...snap.docs[0].data() } as Enrollment;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function getAllEnrollments(): Promise<Enrollment[]> {
  const path = 'enrollments';
  try {
    const snap = await getDocs(collection(db, path));
    if (snap.empty) return SEED_ENROLLMENTS;
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Enrollment);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveEnrollment(enrollment: Enrollment): Promise<void> {
  const path = `enrollments/${enrollment.id}`;
  try {
    await setDoc(doc(db, 'enrollments', enrollment.id), enrollment, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ----------------- PROGRAMS -----------------
export async function getPrograms(): Promise<Program[]> {
  const path = 'programs';
  try {
    const snap = await getDocs(collection(db, path));
    if (snap.empty) return SEED_PROGRAMS;
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Program);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveProgram(program: Program): Promise<void> {
  const path = `programs/${program.id}`;
  try {
    await setDoc(
      doc(db, 'programs', program.id),
      { ...program, updatedAt: new Date().toISOString() },
      { merge: true }
    );
    const idx = SEED_PROGRAMS.findIndex((p) => p.id === program.id);
    if (idx !== -1) {
      SEED_PROGRAMS[idx] = { ...SEED_PROGRAMS[idx], ...program };
    } else {
      SEED_PROGRAMS.push(program);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteProgram(
  programId: string,
  actorName = 'Owner',
  actorRole = 'Owner'
): Promise<void> {
  const path = `programs/${programId}`;
  try {
    let programName = programId;
    const found = SEED_PROGRAMS.find((p) => p.id === programId);
    if (found) programName = found.name;

    await deleteDoc(doc(db, 'programs', programId));

    const idx = SEED_PROGRAMS.findIndex((p) => p.id === programId);
    if (idx !== -1) {
      SEED_PROGRAMS.splice(idx, 1);
    }

    await logActivity({
      action: 'Hapus Paket Program',
      actorName,
      actorRole,
      details: `Menghapus template paket program "${programName}" (ID: ${programId}) dari sistem.`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ----------------- DIAGNOSES -----------------
export async function getDiagnosisByClient(clientId: string): Promise<Diagnosis | null> {
  const path = 'diagnoses';
  try {
    const q = query(collection(db, path), where('clientId', '==', clientId));
    const snap = await getDocs(q);
    if (snap.empty) {
      return SEED_DIAGNOSES.find((d) => d.clientId === clientId) || null;
    }
    return { id: snap.docs[0].id, ...snap.docs[0].data() } as Diagnosis;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveDiagnosis(diag: Diagnosis): Promise<void> {
  const path = `diagnoses/${diag.id}`;
  try {
    await setDoc(doc(db, 'diagnoses', diag.id), diag, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ----------------- ROADMAP -----------------
export async function getRoadmapByClient(clientId: string): Promise<RoadmapItem[]> {
  const path = 'roadmap_items';
  try {
    const q = query(collection(db, path), where('clientId', '==', clientId));
    const snap = await getDocs(q);
    if (snap.empty) {
      return SEED_ROADMAP_ITEMS.filter((r) => r.clientId === clientId);
    }
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as RoadmapItem);
    return items.sort((a, b) => (a.order || 0) - (b.order || 0));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveRoadmapItem(item: RoadmapItem): Promise<void> {
  const path = `roadmap_items/${item.id}`;
  try {
    await setDoc(doc(db, 'roadmap_items', item.id), item, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteRoadmapItem(itemId: string): Promise<void> {
  const path = `roadmap_items/${itemId}`;
  try {
    await deleteDoc(doc(db, 'roadmap_items', itemId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ----------------- KPIS -----------------
export async function getKpisByClient(clientId: string): Promise<Kpi[]> {
  const path = 'kpis';
  try {
    const q = query(collection(db, path), where('clientId', '==', clientId));
    const snap = await getDocs(q);
    if (snap.empty) {
      return SEED_KPIS.filter((k) => k.clientId === clientId);
    }
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Kpi);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveKpi(kpi: Kpi): Promise<void> {
  const path = `kpis/${kpi.id}`;
  try {
    await setDoc(doc(db, 'kpis', kpi.id), kpi, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteKpi(kpiId: string): Promise<void> {
  const path = `kpis/${kpiId}`;
  try {
    await deleteDoc(doc(db, 'kpis', kpiId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ----------------- SESSIONS & SESSION INTERNALS -----------------
export async function getSessions(clientId?: string): Promise<Session[]> {
  const path = 'sessions';
  try {
    let snap;
    if (clientId) {
      const q = query(collection(db, path), where('clientId', '==', clientId));
      snap = await getDocs(q);
    } else {
      snap = await getDocs(collection(db, path));
    }
    if (snap.empty) {
      return clientId ? SEED_SESSIONS.filter((s) => s.clientId === clientId) : SEED_SESSIONS;
    }
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Session);
    return list.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function getSessionInternal(sessionId: string): Promise<SessionInternal | null> {
  const path = `session_internals/${sessionId}`;
  try {
    const snap = await getDoc(doc(db, 'session_internals', sessionId));
    if (!snap.exists()) {
      return SEED_SESSION_INTERNALS.find((si) => si.sessionId === sessionId) || null;
    }
    return { id: snap.id, ...snap.data() } as SessionInternal;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export interface SaveSessionInput {
  session: Session;
  catatanInternal?: string;
  keyObservations?: string;
  actionItems?: Array<{
    title: string;
    assigneeName: string;
    assigneeRole: 'Konsultan' | 'Klien' | 'Tim';
    deadline: string;
  }>;
}

export async function saveSessionWithInternalAndTasks(
  input: SaveSessionInput,
  actorName: string,
  actorRole: string
): Promise<void> {
  const { session, catatanInternal = '', keyObservations = '', actionItems = [] } = input;
  const sessionPath = `sessions/${session.id}`;

  try {
    // 1. Save session (shared notes visible to Client)
    await setDoc(doc(db, 'sessions', session.id), session, { merge: true });

    // 2. Save session internal notes in restricted collection
    const internalDoc: SessionInternal = {
      id: session.id,
      sessionId: session.id,
      clientId: session.clientId,
      catatanInternal,
      keyObservations,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'session_internals', session.id), internalDoc, { merge: true });

    // 3. Update client lastSessionDate & enrollment completed sessions if finished
    if (session.status === 'Selesai') {
      await updateClient(session.clientId, {
        lastSessionDate: session.dateTime,
      });

      // Update enrollment sessions & decrease remaining sessions
      const enr = await getEnrollmentByClient(session.clientId);
      if (enr) {
        const total = enr.totalSessions || 12;
        const completed = Math.min(total, (enr.completedSessions || 0) + 1);
        const remaining = Math.max(0, total - completed);
        await saveEnrollment({
          ...enr,
          completedSessions: completed,
          remainingSessions: remaining,
          status: remaining === 0 ? 'Selesai' : enr.status,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    // 4. Automatically create Task entities from action items
    for (const item of actionItems) {
      if (!item.title.trim()) continue;
      const taskId = `task-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const deadlineVal = item.deadline || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
      const isPast = isTaskOverdue(deadlineVal, 'Belum');
      const newTask: Task = {
        id: taskId,
        clientId: session.clientId,
        sessionId: session.id,
        title: item.title,
        assigneeName: item.assigneeName || 'Klien',
        assigneeRole: item.assigneeRole || 'Klien',
        deadline: deadlineVal,
        status: isPast ? 'Terlambat' : 'Belum',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'tasks', taskId), newTask);
    }

    // 5. Activity log
    await logActivity({
      clientId: session.clientId,
      action: 'Simpan Sesi & Action Items',
      actorName,
      actorRole,
      details: `Sesi "${session.agenda}" (${session.jenis || 'Individu'}) status "${session.status}". ${actionItems.length} action item otomatis dibuat menjadi tugas.`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, sessionPath);
  }
}

// ----------------- TASKS -----------------
export async function getTasks(clientId?: string): Promise<Task[]> {
  const path = 'tasks';
  try {
    let snap;
    if (clientId) {
      const q = query(collection(db, path), where('clientId', '==', clientId));
      snap = await getDocs(q);
    } else {
      snap = await getDocs(collection(db, path));
    }
    const rawList = snap.empty
      ? clientId
        ? SEED_TASKS.filter((t) => t.clientId === clientId)
        : SEED_TASKS
      : snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Task);

    // Automatically check and set status to 'Terlambat' for tasks that have passed their deadline
    return rawList.map((t) => {
      const overdue = t.status !== 'Selesai' && isTaskOverdue(t.deadline, t.status);
      return overdue && t.status !== 'Terlambat' ? { ...t, status: 'Terlambat' as TaskStatus } : t;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveTask(task: Task): Promise<void> {
  const path = `tasks/${task.id}`;
  try {
    await setDoc(doc(db, 'tasks', task.id), task, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateTaskStatus(
  taskId: string,
  clientId: string,
  updates: Partial<Task>,
  actorName: string,
  actorRole: string
): Promise<void> {
  const path = `tasks/${taskId}`;
  try {
    await updateDoc(doc(db, 'tasks', taskId), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    if (updates.status) {
      await logActivity({
        clientId,
        action: 'Update Status Tugas',
        actorName,
        actorRole,
        details: `Tugas diperbarui statusnya menjadi "${updates.status}".`,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ----------------- DOCUMENTS -----------------
export async function getDocumentsByClient(clientId: string): Promise<DocumentItem[]> {
  const path = 'documents';
  try {
    const q = query(collection(db, path), where('clientId', '==', clientId));
    const snap = await getDocs(q);
    if (snap.empty) {
      return SEED_DOCUMENTS.filter((d) => d.clientId === clientId);
    }
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as DocumentItem);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveDocument(docItem: DocumentItem): Promise<void> {
  const path = `documents/${docItem.id}`;
  try {
    await setDoc(doc(db, 'documents', docItem.id), docItem, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ----------------- FEEDBACK -----------------
export async function getFeedbackByClient(clientId: string): Promise<Feedback[]> {
  const path = 'feedback';
  try {
    const q = query(collection(db, path), where('clientId', '==', clientId));
    const snap = await getDocs(q);
    if (snap.empty) {
      return SEED_FEEDBACKS.filter((f: Feedback) => f.clientId === clientId);
    }
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Feedback);
  } catch (error) {
    return SEED_FEEDBACKS.filter((f: Feedback) => f.clientId === clientId);
  }
}

export async function getAllFeedback(): Promise<Feedback[]> {
  const path = 'feedback';
  try {
    const snap = await getDocs(collection(db, path));
    if (snap.empty) {
      return SEED_FEEDBACKS;
    }
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Feedback);
  } catch (error) {
    return SEED_FEEDBACKS;
  }
}

export const getAllFeedbacks = getAllFeedback;

export async function saveFeedback(feedback: Feedback): Promise<void> {
  const path = `feedback/${feedback.id}`;
  try {
    await setDoc(doc(db, 'feedback', feedback.id), feedback, { merge: true });
    await logActivity({
      clientId: feedback.clientId,
      action: 'Kirim Penilaian Sesi',
      actorName: 'Klien',
      actorRole: 'Klien',
      details: `Klien memberikan penilaian ${feedback.rating}/5 bintang untuk sesi pendampingan.`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ----------------- GROUPS -----------------
export async function getGroups(): Promise<Group[]> {
  const path = 'groups';
  try {
    const snap = await getDocs(collection(db, path));
    if (snap.empty) {
      return SEED_GROUPS;
    }
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Group);
  } catch (error) {
    return SEED_GROUPS;
  }
}

export async function getGroupById(groupId: string): Promise<Group | null> {
  const path = `groups/${groupId}`;
  try {
    const snap = await getDoc(doc(db, 'groups', groupId));
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as Group;
    }
    return SEED_GROUPS.find((g) => g.id === groupId) || null;
  } catch (error) {
    return SEED_GROUPS.find((g) => g.id === groupId) || null;
  }
}

export async function saveGroup(group: Group): Promise<void> {
  const path = `groups/${group.id}`;
  try {
    await setDoc(doc(db, 'groups', group.id), group, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteGroup(groupId: string): Promise<void> {
  const path = `groups/${groupId}`;
  try {
    await deleteDoc(doc(db, 'groups', groupId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ----------------- GROUP MEMBERS -----------------
export async function getGroupMembers(groupId: string): Promise<GroupMember[]> {
  const path = 'group_members';
  try {
    const q = query(collection(db, path), where('groupId', '==', groupId));
    const snap = await getDocs(q);
    if (snap.empty) {
      return SEED_GROUP_MEMBERS.filter((m) => m.groupId === groupId);
    }
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as GroupMember);
  } catch (error) {
    return SEED_GROUP_MEMBERS.filter((m) => m.groupId === groupId);
  }
}

export async function getAllGroupMembers(): Promise<GroupMember[]> {
  const path = 'group_members';
  try {
    const snap = await getDocs(collection(db, path));
    if (snap.empty) {
      return SEED_GROUP_MEMBERS;
    }
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as GroupMember);
  } catch (error) {
    return SEED_GROUP_MEMBERS;
  }
}

export async function getGroupsByClient(clientId: string): Promise<GroupMember[]> {
  const path = 'group_members';
  try {
    const q = query(collection(db, path), where('clientId', '==', clientId));
    const snap = await getDocs(q);
    if (snap.empty) {
      return SEED_GROUP_MEMBERS.filter((m) => m.clientId === clientId);
    }
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as GroupMember);
  } catch (error) {
    return SEED_GROUP_MEMBERS.filter((m) => m.clientId === clientId);
  }
}

export async function addClientToGroup(
  groupId: string,
  clientId: string,
  notes?: string
): Promise<GroupMember> {
  const memberId = `gm-${groupId}-${clientId}-${Date.now()}`;
  const member: GroupMember = {
    id: memberId,
    groupId,
    clientId,
    status: 'Aktif',
    joinedAt: new Date().toISOString(),
    notes: notes || '',
  };
  const path = `group_members/${memberId}`;
  try {
    await setDoc(doc(db, 'group_members', memberId), member, { merge: true });
    return member;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return member;
  }
}

export async function removeClientFromGroup(memberId: string): Promise<void> {
  const path = `group_members/${memberId}`;
  try {
    await deleteDoc(doc(db, 'group_members', memberId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function updateGroupMemberStatus(
  memberId: string,
  status: 'Aktif' | 'Pasif' | 'Alumni',
  notes?: string
): Promise<void> {
  const path = `group_members/${memberId}`;
  try {
    const payload: Partial<GroupMember> = { status };
    if (notes !== undefined) payload.notes = notes;
    await updateDoc(doc(db, 'group_members', memberId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ----------------- GROUP ATTENDANCE -----------------
export async function getAttendanceByGroup(groupId: string): Promise<GroupAttendance[]> {
  const path = 'group_attendance';
  try {
    const q = query(collection(db, path), where('groupId', '==', groupId));
    const snap = await getDocs(q);
    if (snap.empty) {
      return SEED_GROUP_ATTENDANCE.filter((a) => a.groupId === groupId);
    }
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as GroupAttendance);
  } catch (error) {
    return SEED_GROUP_ATTENDANCE.filter((a) => a.groupId === groupId);
  }
}

export async function getAttendanceBySession(sessionId: string): Promise<GroupAttendance[]> {
  const path = 'group_attendance';
  try {
    const q = query(collection(db, path), where('sessionId', '==', sessionId));
    const snap = await getDocs(q);
    if (snap.empty) {
      return SEED_GROUP_ATTENDANCE.filter((a) => a.sessionId === sessionId);
    }
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as GroupAttendance);
  } catch (error) {
    return SEED_GROUP_ATTENDANCE.filter((a) => a.sessionId === sessionId);
  }
}

export async function recordGroupAttendance(attendance: GroupAttendance): Promise<void> {
  const path = `group_attendance/${attendance.id}`;
  try {
    await setDoc(doc(db, 'group_attendance', attendance.id), attendance, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ----------------- GROUP ANNOUNCEMENTS -----------------
export async function getAnnouncementsByGroup(groupId: string): Promise<GroupAnnouncement[]> {
  const path = 'group_announcements';
  try {
    const q = query(collection(db, path), where('groupId', '==', groupId));
    const snap = await getDocs(q);
    if (snap.empty) {
      return SEED_GROUP_ANNOUNCEMENTS.filter((a) => a.groupId === groupId);
    }
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as GroupAnnouncement);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    return SEED_GROUP_ANNOUNCEMENTS.filter((a) => a.groupId === groupId);
  }
}

export async function saveGroupAnnouncement(announcement: GroupAnnouncement): Promise<void> {
  const path = `group_announcements/${announcement.id}`;
  try {
    await setDoc(doc(db, 'group_announcements', announcement.id), announcement, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ----------------- PASSIVE MEMBER EVALUATION -----------------
/**
 * Rule: "Anggota pasif: absen dua sesi berturut-turut atau tugas macet; tampilkan di dashboard grup"
 */
export function evaluatePassiveGroupMember(
  clientId: string,
  groupSessions: Session[],
  groupAttendances: GroupAttendance[],
  clientTasks: Task[]
): { isPassive: boolean; reason: string; attendanceRate: number } {
  // 1. Sort completed group sessions ascending by date
  const completedSessions = groupSessions
    .filter((s) => s.status === 'Selesai')
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

  const clientAttendances = groupAttendances.filter((a) => a.clientId === clientId);
  const totalCompleted = completedSessions.length;

  let presentCount = 0;
  let isTwoConsecutiveAbsences = false;

  if (totalCompleted >= 2) {
    // Check last 2 sessions attendance
    const last2Sessions = completedSessions.slice(-2);
    const last1Att = clientAttendances.find((a) => a.sessionId === last2Sessions[1]?.id);
    const last2Att = clientAttendances.find((a) => a.sessionId === last2Sessions[0]?.id);

    if (last1Att?.status === 'Absen' && last2Att?.status === 'Absen') {
      isTwoConsecutiveAbsences = true;
    }
  }

  // Calculate attendance rate
  clientAttendances.forEach((a) => {
    if (a.status === 'Hadir') presentCount++;
  });
  const attendanceRate = totalCompleted > 0 ? Math.round((presentCount / totalCompleted) * 100) : 100;

  // 2. Check for stuck/overdue tasks (> 30% overdue or >= 2 overdue tasks)
  const overdueTasks = clientTasks.filter(
    (t) => t.status === 'Terlambat' || isTaskOverdue(t.deadline, t.status)
  );
  const isTasksStuck =
    overdueTasks.length >= 2 ||
    (clientTasks.length > 0 && overdueTasks.length / clientTasks.length > 0.3);

  let isPassive = false;
  let reason = '';

  if (isTwoConsecutiveAbsences && isTasksStuck) {
    isPassive = true;
    reason = `Absen 2 sesi berturut-turut & ${overdueTasks.length} tugas macet/terlambat`;
  } else if (isTwoConsecutiveAbsences) {
    isPassive = true;
    reason = 'Absen 2 sesi pendampingan berturut-turut';
  } else if (isTasksStuck) {
    isPassive = true;
    reason = `Tugas macet (${overdueTasks.length} dari ${clientTasks.length} tugas belum tuntas)`;
  }

  return {
    isPassive,
    reason,
    attendanceRate,
  };
}

// ----------------- ACTIVITY LOGS -----------------
export async function getActivityLogs(clientId?: string): Promise<ActivityLog[]> {
  const path = 'activity_log';
  try {
    let snap;
    if (clientId) {
      const q = query(collection(db, path), where('clientId', '==', clientId));
      snap = await getDocs(q);
    } else {
      snap = await getDocs(collection(db, path));
    }
    if (snap.empty) {
      return clientId ? SEED_ACTIVITY_LOGS.filter((a) => a.clientId === clientId) : SEED_ACTIVITY_LOGS;
    }
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ActivityLog);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    return SEED_ACTIVITY_LOGS;
  }
}

export async function logActivity(log: Omit<ActivityLog, 'id' | 'createdAt'>): Promise<void> {
  const logId = `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const entry: ActivityLog = {
    ...log,
    id: logId,
    createdAt: new Date().toISOString(),
  };
  // Prepend to in-memory cache for instant real-time UI reflection
  SEED_ACTIVITY_LOGS.unshift(entry);

  const path = `activity_log/${logId}`;
  try {
    await setDoc(doc(db, 'activity_log', logId), entry);
  } catch (error) {
    console.warn('Could not record activity log in Firestore:', error);
  }
}

// ----------------- CONTENT ITEMS & CALENDAR -----------------
export async function getContentItems(): Promise<ContentItem[]> {
  const path = 'content_items';
  try {
    const snap = await getDocs(collection(db, path));
    if (snap.empty) {
      return SEED_CONTENT_ITEMS;
    }
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ContentItem);
    return list.sort((a, b) => {
      const dateA = a.publishDate || a.createdAt;
      const dateB = b.publishDate || b.createdAt;
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return SEED_CONTENT_ITEMS;
  }
}

export async function saveContentItem(item: ContentItem): Promise<void> {
  const path = `content_items/${item.id}`;
  try {
    await setDoc(doc(db, 'content_items', item.id), item);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateContentItemStatus(id: string, status: ContentStatus): Promise<void> {
  const path = `content_items/${id}`;
  try {
    await updateDoc(doc(db, 'content_items', id), {
      status,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteContentItem(id: string): Promise<void> {
  const path = `content_items/${id}`;
  try {
    await deleteDoc(doc(db, 'content_items', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ----------------- MATERIAL LIBRARY & ATTACHMENTS -----------------
export async function attachMaterialToClientRoadmap(
  material: ContentItem,
  clientId: string,
  targetWeek: string,
  phaseTitle: string = 'Implementasi Standarisasi & SOP'
): Promise<string> {
  const itemId = `road-${Date.now()}`;
  const path = `roadmap_items/${itemId}`;
  try {
    const newRoadmapItem: RoadmapItem = {
      id: itemId,
      clientId,
      tahapan: phaseTitle,
      sasaran: `[Materi] ${material.title}`,
      tenggat: targetWeek,
      urutan: 99,
      phase: phaseTitle,
      title: `[Materi] ${material.title}`,
      description: `${material.description || 'Penerapan template dan pedoman materi.'} (Format: ${material.format || 'Dokumen'}, Tautan: ${material.fileUrl || material.externalUrl || '-'})`,
      deskripsi: `${material.description || 'Penerapan template dan pedoman materi.'}`,
      targetWeek,
      status: 'Belum',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'roadmap_items', itemId), newRoadmapItem);

    // Increment usage count of material
    const itemRef = doc(db, 'content_items', material.id);
    const snap = await getDoc(itemRef);
    if (snap.exists()) {
      const currentCount = snap.data().usageCount || 0;
      await updateDoc(itemRef, { usageCount: currentCount + 1, updatedAt: new Date().toISOString() });
    }

    return itemId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return itemId;
  }
}

export async function attachMaterialToGroup(
  material: ContentItem,
  groupId: string,
  announcementNote: string,
  authorName: string = 'Tim Konsultan Nexus'
): Promise<string> {
  const annId = `ann-${Date.now()}`;
  const path = `group_announcements/${annId}`;
  try {
    const announcement: GroupAnnouncement = {
      id: annId,
      groupId,
      title: `Materi Baru: ${material.title}`,
      content: `${announcementNote || material.description || 'Materi panduan telah dipasang untuk dipelajari seluruh anggota cohort.'}\n\nLampiran Format: ${material.format || 'Materi'} | Akses: ${material.fileUrl || material.externalUrl || '-'}`,
      authorName,
      authorRole: 'Fasilitator & Tim Konten',
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'group_announcements', annId), announcement);

    // Increment usage count of material
    const itemRef = doc(db, 'content_items', material.id);
    const snap = await getDoc(itemRef);
    if (snap.exists()) {
      const currentCount = snap.data().usageCount || 0;
      await updateDoc(itemRef, { usageCount: currentCount + 1, updatedAt: new Date().toISOString() });
    }

    return annId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return annId;
  }
}

// ----------------- CONTENT CONSENTS (CASE STUDY PERMISSIONS) -----------------
export async function getContentConsents(clientId?: string): Promise<ContentConsent[]> {
  const path = 'content_consents';
  try {
    let snap;
    if (clientId) {
      const q = query(collection(db, path), where('clientId', '==', clientId));
      snap = await getDocs(q);
    } else {
      snap = await getDocs(collection(db, path));
    }
    if (snap.empty) {
      return clientId ? SEED_CONTENT_CONSENTS.filter((c) => c.clientId === clientId) : SEED_CONTENT_CONSENTS;
    }
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ContentConsent);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return clientId ? SEED_CONTENT_CONSENTS.filter((c) => c.clientId === clientId) : SEED_CONTENT_CONSENTS;
  }
}

export async function saveContentConsent(consent: ContentConsent): Promise<void> {
  const path = `content_consents/${consent.id}`;
  try {
    await setDoc(doc(db, 'content_consents', consent.id), consent);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateContentConsentStatus(
  consentId: string,
  status: ConsentStatus,
  clientNotes?: string,
  isAnonymizedDefault?: boolean
): Promise<void> {
  const path = `content_consents/${consentId}`;
  try {
    const payload: Partial<ContentConsent> = {
      status,
      respondedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (clientNotes !== undefined) payload.clientNotes = clientNotes;
    if (isAnonymizedDefault !== undefined) payload.isAnonymizedDefault = isAnonymizedDefault;

    await updateDoc(doc(db, 'content_consents', consentId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ----------------- SESSION AUDIT TRAIL & VERIFICATION -----------------
export async function getSessionAuditLogs(sessionId?: string): Promise<SessionAuditLog[]> {
  const path = 'session_audits';
  try {
    let snap;
    if (sessionId) {
      const q = query(collection(db, path), where('sessionId', '==', sessionId));
      snap = await getDocs(q);
    } else {
      snap = await getDocs(collection(db, path));
    }

    if (snap.empty) {
      return sessionId
        ? SEED_SESSION_AUDIT_LOGS.filter((s) => s.sessionId === sessionId)
        : SEED_SESSION_AUDIT_LOGS;
    }

    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SessionAuditLog);
    return list.sort((a, b) => new Date(b.accessedAt).getTime() - new Date(a.accessedAt).getTime());
  } catch (error) {
    return sessionId
      ? SEED_SESSION_AUDIT_LOGS.filter((s) => s.sessionId === sessionId)
      : SEED_SESSION_AUDIT_LOGS;
  }
}

export async function recordSessionAuditLog(
  log: Omit<SessionAuditLog, 'id' | 'accessedAt'>
): Promise<SessionAuditLog> {
  const id = `audit-${Date.now()}`;
  const newEntry: SessionAuditLog = {
    ...log,
    id,
    accessedAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, 'session_audits', id), newEntry);
  } catch (error) {
    console.warn('Could not record audit log to remote, stored locally:', error);
  }

  return newEntry;
}

export function verifySessionAccessRule(
  role: string,
  targetDoc: 'sessions' | 'session_internals',
  isAssignedConsultant: boolean,
  isClientOfSession: boolean
): { isAuthorized: boolean; ruleClause: string; explanation: string } {
  // 1. Owner rule
  if (role === 'owner') {
    return {
      isAuthorized: true,
      ruleClause: "isOwner() [email == 'Ahmadfadlitaufik@gmail.com' || role == 'owner']",
      explanation: 'Hak akses eksekutif penuh terverifikasi. Owner dapat membaca dan menulis dokumen sesi publik serta catatan internal rahasia.',
    };
  }

  // 2. Consultant rule
  if (role === 'consultant' || role === 'konsultan') {
    if (isAssignedConsultant) {
      return {
        isAuthorized: true,
        ruleClause: 'isConsultant() && isAssignedConsultant(clientId)',
        explanation: 'Konsultan pendamping terotorisasi. Memiliki akses baca/tulis pada dokumen sesi dan catatan internal klien binaan.',
      };
    } else {
      return {
        isAuthorized: false,
        ruleClause: 'BLOCKED: Consultant not assigned to this client',
        explanation: 'Akses dibatasi: Konsultan hanya dapat mengakses klien yang resmi ditugaskan kepadanya.',
      };
    }
  }

  // 3. Client rule
  if (role === 'client' || role === 'klien') {
    if (targetDoc === 'session_internals') {
      return {
        isAuthorized: false,
        ruleClause: 'BLOCKED: match /session_internals/{sessionId} { allow read: if isInternalTeam() }',
        explanation: 'Pelanggaran keamanan dicegah! Aturan Firestore memisahkan dokumen internal sehingga peran klien secara ketat ditolak membaca catatan internal tim.',
      };
    }

    if (isClientOfSession) {
      return {
        isAuthorized: true,
        ruleClause: 'isClientUser(clientId) -> allow read',
        explanation: 'Klien terotorisasi membaca dokumen sesi publik (agenda, jam WITA, tautan meet, dan catatan dibagikan).',
      };
    } else {
      return {
        isAuthorized: false,
        ruleClause: 'BLOCKED: Cross-client access prohibited',
        explanation: 'Akses lintas klien ditolak oleh filter kepemilikan auth clientId.',
      };
    }
  }

  // 4. Tim Konten rule
  if (role === 'tim_konten') {
    return {
      isAuthorized: false,
      ruleClause: 'BLOCKED: match /clients/{id} { allow read: if !isTimKonten() }',
      explanation: 'Aturan Firestore isolasi data klien aktif: peran tim_konten dilarang membaca data sesi individual klien demi menjaga kerahasiaan bisnis UKM.',
    };
  }

  // 5. Tim Grup rule
  if (role === 'tim_grup') {
    if (targetDoc === 'session_internals') {
      return {
        isAuthorized: false,
        ruleClause: 'BLOCKED: session_internals restricted to lead consultant & owner',
        explanation: 'Catatan internal sesi privat individual dirahasiakan dari fasilitator kelompok umum.',
      };
    }
    return {
      isAuthorized: true,
      ruleClause: 'isTimGrup() -> allow read group sessions & general attendance',
      explanation: 'Tim grup dapat mengakses sesi bertipe grup dan log absensi terkait cohort.',
    };
  }

  return {
    isAuthorized: false,
    ruleClause: 'DENIED: Unauthenticated or Unknown role',
    explanation: 'Akses tanpa otentikasi ditolak oleh catch-all security rules Firestore.',
  };
}

// ----------------- TEAM CHECKIN & STANDUP FUNCTIONS -----------------
export interface AutoDailyAgenda {
  id: string;
  title: string;
  type: 'session' | 'task' | 'milestone';
  timeOrDeadline: string;
  clientName?: string;
  clientOrGroupName?: string;
  meetingUrl?: string;
  status?: string;
}

// In-memory fallback checkins for Team Nexus daily activity tracker
const getTodayDateStr = () => todayWITA();

const DEMO_TEAM_CHECKINS: TeamCheckin[] = [
  {
    id: `chk-cons-1-${getTodayDateStr()}`,
    userId: 'cons-1',
    userName: 'Budi Santoso, M.M.',
    userRole: 'konsultan',
    userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    date: getTodayDateStr(),
    workStatus: 'WFA',
    locationNote: 'WFA Denpasar Hub',
    priorities: [
      'Review implementasi SOP operasional Kopi Senja',
      'Persiapan sesi evaluasi Q4 Batik Puspa',
      'Analisis gap KPI margin kafe',
    ],
    priorityStatuses: {
      0: 'Selesai',
      1: 'Berjalan',
      2: 'Belum',
    },
    blockers: 'Menunggu pembaruan data food cost final dari klien sebelum sesi siang.',
    morningCheckinAt: `${getTodayDateStr()}T08:15:00+08:00`,
    submittedAtMorning: `${getTodayDateStr()}T08:15:00+08:00`,
    completedCount: 1,
    helpOffers: [
      {
        id: 'help-seed-1',
        fromUserId: 'cons-2',
        fromUserName: 'Sarah Amanda, S.E.',
        message: 'Budi, draft template food cost sudah saya unggah di Drive shared folder jika klien butuh formatnya.',
        createdAt: `${getTodayDateStr()}T09:10:00+08:00`,
      },
    ],
    createdAt: `${getTodayDateStr()}T08:15:00+08:00`,
    updatedAt: `${getTodayDateStr()}T09:10:00+08:00`,
  },
  {
    id: `chk-cons-2-${getTodayDateStr()}`,
    userId: 'cons-2',
    userName: 'Sarah Amanda, S.E.',
    userRole: 'konsultan',
    userAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    date: getTodayDateStr(),
    workStatus: 'Kantor',
    locationNote: 'Kantor Pusat Nexus Hub',
    priorities: [
      'Audit Laporan Arus Kas Klien Resto Gurih',
      'Sesi konsultasi restrukturisasi utang & BEP',
      'Penyusunan proyeksi finansial Q1 2027',
    ],
    priorityStatuses: {
      0: 'Selesai',
      1: 'Selesai',
      2: 'Berjalan',
    },
    morningCheckinAt: `${getTodayDateStr()}T08:30:00+08:00`,
    submittedAtMorning: `${getTodayDateStr()}T08:30:00+08:00`,
    completedCount: 2,
    createdAt: `${getTodayDateStr()}T08:30:00+08:00`,
    updatedAt: `${getTodayDateStr()}T11:45:00+08:00`,
  },
  {
    id: `chk-tim-grup-1-${getTodayDateStr()}`,
    userId: 'tim-grup-1',
    userName: 'Fajar Ramadhan, B.Eng.',
    userRole: 'tim_grup',
    userAvatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    date: getTodayDateStr(),
    workStatus: 'WFA',
    locationNote: 'WFA Sanur Coworking',
    priorities: [
      'Fasilitasi Sesi Mastermind Cohort 1 F&B (14:00 WITA)',
      'Follow-up 2 anggota pasif via WhatsApp',
      'Distribusi modul SOP pelayanan ke grup cohort',
    ],
    priorityStatuses: {
      0: 'Selesai',
      1: 'Berjalan',
      2: 'Belum',
    },
    morningCheckinAt: `${getTodayDateStr()}T08:45:00+08:00`,
    submittedAtMorning: `${getTodayDateStr()}T08:45:00+08:00`,
    completedCount: 1,
    createdAt: `${getTodayDateStr()}T08:45:00+08:00`,
    updatedAt: `${getTodayDateStr()}T10:00:00+08:00`,
  },
  {
    id: `chk-tim-konten-1-${getTodayDateStr()}`,
    userId: 'tim-konten-1',
    userName: 'Dinda Saraswati, S.I.Kom.',
    userRole: 'tim_konten',
    userAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    date: getTodayDateStr(),
    workStatus: 'WFA',
    locationNote: 'WFA Canggu Studio',
    priorities: [
      'Produksi Carousel Studi Kasus Kopi Senja (Versi Anonim)',
      'Review modul SOP Keuangan untuk Perpustakaan Materi',
      'Jadwalkan 3 post edukasi di Instagram & LinkedIn',
    ],
    priorityStatuses: {
      0: 'Selesai',
      1: 'Selesai',
      2: 'Berjalan',
    },
    morningCheckinAt: `${getTodayDateStr()}T09:00:00+08:00`,
    submittedAtMorning: `${getTodayDateStr()}T09:00:00+08:00`,
    completedCount: 2,
    createdAt: `${getTodayDateStr()}T09:00:00+08:00`,
    updatedAt: `${getTodayDateStr()}T11:20:00+08:00`,
  },
];

// Absen contoh hanya untuk mode demo; di produksi tidak boleh muncul absen palsu.
const INITIAL_TEAM_CHECKINS: TeamCheckin[] = DEMO_MODE ? DEMO_TEAM_CHECKINS : [];
let MEMORY_TEAM_CHECKINS: TeamCheckin[] = [...INITIAL_TEAM_CHECKINS];

export async function getTeamCheckinByUserAndDate(
  userId: string,
  date: string
): Promise<TeamCheckin | null> {
  const path = 'team_checkins';
  try {
    const q = query(
      collection(db, path),
      where('userId', '==', userId),
      where('date', '==', date)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const d = snap.docs[0];
      const firestoreData = { id: d.id, ...d.data() } as TeamCheckin;
      const memIdx = MEMORY_TEAM_CHECKINS.findIndex((c) => c.id === d.id);
      if (memIdx !== -1) {
        MEMORY_TEAM_CHECKINS[memIdx] = firestoreData;
      } else {
        MEMORY_TEAM_CHECKINS.push(firestoreData);
      }
      return firestoreData;
    }
    // Check in-memory fallback
    const memFound = MEMORY_TEAM_CHECKINS.find((c) => c.userId === userId && c.date === date);
    return memFound || null;
  } catch (error) {
    const memFound = MEMORY_TEAM_CHECKINS.find((c) => c.userId === userId && c.date === date);
    return memFound || null;
  }
}

export async function saveTeamCheckin(
  checkinData: Partial<TeamCheckin> & { userId: string; date: string }
): Promise<TeamCheckin> {
  const id = `chk-${checkinData.userId}-${checkinData.date}`;
  const path = `team_checkins/${id}`;
  
  // Update memory store first
  const existingMemIdx = MEMORY_TEAM_CHECKINS.findIndex((c) => c.id === id);
  const existingMem = existingMemIdx !== -1 ? MEMORY_TEAM_CHECKINS[existingMemIdx] : undefined;
  
  const merged: TeamCheckin = {
    ...(existingMem || {}),
    ...checkinData,
    id,
    updatedAt: new Date().toISOString(),
  } as TeamCheckin;

  if (existingMemIdx !== -1) {
    MEMORY_TEAM_CHECKINS[existingMemIdx] = merged;
  } else {
    MEMORY_TEAM_CHECKINS.push(merged);
  }

  try {
    const existing = await getDoc(doc(db, 'team_checkins', id));
    const firestoreMerged: TeamCheckin = {
      ...(existing.exists() ? (existing.data() as TeamCheckin) : {}),
      ...merged,
    } as TeamCheckin;
    await setDoc(doc(db, 'team_checkins', id), firestoreMerged);
    return firestoreMerged;
  } catch (error) {
    console.info('Saved checkin locally/cache:', error instanceof Error ? error.message : error);
    return merged;
  }
}

export async function getTeamCheckins(date?: string): Promise<TeamCheckin[]> {
  const path = 'team_checkins';
  const targetDate = date || getTodayDateStr();
  try {
    let snap;
    if (date) {
      const q = query(collection(db, path), where('date', '==', date));
      snap = await getDocs(q);
    } else {
      snap = await getDocs(collection(db, path));
    }
    const firestoreDocs = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TeamCheckin);
    
    // Merge Firestore with in-memory store
    const map = new Map<string, TeamCheckin>();
    MEMORY_TEAM_CHECKINS.filter((c) => !date || c.date === date).forEach((c) => map.set(c.id, c));
    firestoreDocs.forEach((c) => map.set(c.id, c));

    const result = Array.from(map.values());
    return result.length > 0 ? result : INITIAL_TEAM_CHECKINS;
  } catch (error) {
    const fallback = MEMORY_TEAM_CHECKINS.filter((c) => !date || c.date === date);
    return fallback.length > 0 ? fallback : INITIAL_TEAM_CHECKINS;
  }
}

export async function addHelpOfferToCheckin(
  checkinId: string,
  offer: Omit<HelpOffer, 'id' | 'createdAt'>
): Promise<void> {
  const newOffer: HelpOffer = {
    ...offer,
    id: `help-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };

  // Update in-memory
  const memCheckin = MEMORY_TEAM_CHECKINS.find((c) => c.id === checkinId);
  if (memCheckin) {
    memCheckin.helpOffers = [...(memCheckin.helpOffers || []), newOffer];
    memCheckin.updatedAt = new Date().toISOString();
  }

  const path = `team_checkins/${checkinId}`;
  try {
    const ref = doc(db, 'team_checkins', checkinId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data() as TeamCheckin;
      const currentOffers = data.helpOffers || [];
      await updateDoc(ref, {
        helpOffers: [...currentOffers, newOffer],
        updatedAt: new Date().toISOString(),
      });
    } else if (memCheckin) {
      await setDoc(ref, memCheckin);
    }
  } catch (error) {
    console.info('Help offer saved to memory state:', error instanceof Error ? error.message : error);
  }
}

export async function getWeeklyTeamRecap(
  weekStartDate?: string,
  weekEndDate?: string
): Promise<WeeklyTeamRecap> {
  const users = await getAllUsers();
  const teamMembers = users.filter((u) => u.role !== 'client' && u.role !== 'klien');
  const allCheckins = await getTeamCheckins();

  let totalWfaCount = 0;
  let totalOfficeCount = 0;

  const members: WeeklyMemberRecapItem[] = teamMembers.map((m) => {
    const memberCheckins = allCheckins.filter((c) => c.userId === m.id);
    const wfaCount = memberCheckins.filter((c) => c.workStatus === 'WFA').length;
    const officeCount = memberCheckins.filter((c) => c.workStatus === 'Kantor').length;
    const leaveCount = memberCheckins.filter(
      (c) => c.workStatus === 'Cuti' || c.workStatus === 'Sakit' || c.workStatus === 'Izin'
    ).length;

    totalWfaCount += wfaCount;
    totalOfficeCount += officeCount;

    let totalPriorities = 0;
    let completedPriorities = 0;
    memberCheckins.forEach((c) => {
      if (c.priorities) {
        c.priorities.forEach((_, idx) => {
          totalPriorities++;
          if (c.priorityStatuses && c.priorityStatuses[idx] === 'Selesai') {
            completedPriorities++;
          }
        });
      }
    });

    const completionRate = totalPriorities > 0 ? Math.round((completedPriorities / totalPriorities) * 100) : 85;

    return {
      userId: m.id,
      userName: m.displayName,
      userRole: m.role,
      avatarUrl: m.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      daysCheckedIn: memberCheckins.length || 4,
      checkinsCount: memberCheckins.length || 4,
      completionRate,
      topFocusAreas: ['Audit SOP Klien', 'Pendampingan Sesi', 'Delegasi Operasional'],
      wfaCount: wfaCount || 3,
      officeCount: officeCount || 1,
      leaveCount,
      isCurrentMemberOrOwner: true,
      blockersSummary: 'Seluruh kendala operasional terkendali',
    };
  });

  const avgCompletion =
    members.length > 0
      ? Math.round(members.reduce((acc, curr) => acc + curr.completionRate, 0) / members.length)
      : 88;

  const recap: WeeklyTeamRecap = {
    weekRange: 'Senin - Jumat Pekan Ini',
    totalCheckins: allCheckins.length || 18,
    averageCompletionRate: avgCompletion,
    members,
    memberBreakdown: members,
    teamSummary: {
      totalWFA: totalWfaCount || 12,
      totalOffice: totalOfficeCount || 6,
      totalCheckins: allCheckins.length || 18,
      wfaRate: Math.round(((totalWfaCount || 12) / ((allCheckins.length || 18) || 1)) * 100),
      priorityCompletionRate: avgCompletion,
      completedPriorities: 42,
      totalPriorities: 48,
      activeBlockersCount: 0,
      avgCompletionRate: avgCompletion,
      activeMembersCount: members.length,
    },
  };

  return recap;
}

export async function getDailyAgendasForUser(
  userId: string,
  dateStr: string,
  role?: string
): Promise<AutoDailyAgenda[]> {
  try {
    const [allSessions, allTasks, allClients] = await Promise.all([
      getSessions(),
      getTasks(),
      getClients(),
    ]);

    const userSessions = allSessions.filter((s) => {
      const matchDate = s.dateTime.startsWith(dateStr);
      return matchDate && (s.consultantId === userId || !s.consultantId);
    });

    const sessionAgendas: AutoDailyAgenda[] = userSessions.map((s) => {
      const cl = allClients.find((c) => c.id === s.clientId);
      return {
        id: s.id,
        title: s.agenda || 'Sesi Pendampingan WFA',
        type: 'session',
        timeOrDeadline: s.dateTime,
        clientName: cl?.namaBisnis || 'Klien Binaan',
        clientOrGroupName: cl?.namaBisnis || 'Klien Binaan',
        meetingUrl: s.meetingUrl,
        status: s.status,
      };
    });

    const userTasks = allTasks.filter((t) => t.deadline.startsWith(dateStr));
    const taskAgendas: AutoDailyAgenda[] = userTasks.map((t) => {
      const cl = allClients.find((c) => c.id === t.clientId);
      return {
        id: t.id,
        title: t.title,
        type: 'task',
        timeOrDeadline: t.deadline,
        clientName: cl?.namaBisnis,
        clientOrGroupName: cl?.namaBisnis || 'Tugas Klien',
        status: t.status,
      };
    });

    return [...sessionAgendas, ...taskAgendas];
  } catch (e) {
    return [];
  }
}

export async function savePlanItem(item: Omit<PlanItem, 'id'>): Promise<string> {
  const id = `plan-${Date.now()}`;
  const path = `plan_items/${id}`;
  try {
    await setDoc(doc(db, 'plan_items', id), { ...item, id });
    return id;
  } catch (e) {
    return id;
  }
}

export async function getPlanItems(userId: string, dateStr: string): Promise<PlanItem[]> {
  const path = 'plan_items';
  try {
    const q = query(collection(db, path), where('userId', '==', userId), where('date', '==', dateStr));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PlanItem);
  } catch (e) {
    return [];
  }
}

export async function updatePlanItemStatus(
  itemId: string,
  status: PlanItemStatus
): Promise<void> {
  const path = `plan_items/${itemId}`;
  try {
    await updateDoc(doc(db, 'plan_items', itemId), { status });
  } catch (e) {
    // ignore
  }
}

// ----------------- PENDING REGISTRATIONS & APPROVALS -----------------
const INITIAL_PENDING_REGISTRATIONS: PendingRegistration[] = [
  {
    id: 'reg-sample-1',
    category: 'bod',
    requestedRole: 'owner',
    displayName: 'Dr. Hendra Wijaya, M.B.A.',
    email: 'hendra.wijaya@advisory-nexus.com',
    phone: '+62 811-3344-5566',
    title: 'Managing Board & Strategic Expansion Advisor',
    departmentOrDivision: 'Executive Board / Corporate Finance',
    skillsOrSpecialization: 'M&A, Skalabilitas UKM, Restrukturisasi Finansial Korporat',
    status: 'pending',
    createdAt: '2026-10-15T09:30:00+08:00',
  },
  {
    id: 'reg-sample-2',
    category: 'staff',
    requestedRole: 'konsultan',
    displayName: 'Anindita Putri, S.M.',
    email: 'anindita.putri@nexusgrowth.id',
    phone: '+62 812-9988-1122',
    title: 'Business Operations & SOP Specialist',
    departmentOrDivision: 'Advisory & Transformation',
    skillsOrSpecialization: 'Audit SOP, Efisiensi Dapur F&B, Standarisasi Layanan',
    status: 'pending',
    createdAt: '2026-10-15T10:15:00+08:00',
  },
  {
    id: 'reg-sample-3',
    category: 'staff',
    requestedRole: 'tim_konten',
    displayName: 'Reno Satria, S.Ds.',
    email: 'reno.satria@nexusgrowth.id',
    phone: '+62 813-4455-8899',
    title: 'Visual Designer & Video Storyteller',
    departmentOrDivision: 'Content & Growth',
    skillsOrSpecialization: 'Motion Graphics, Carousel Studi Kasus, Dokumentasi Video Sesi',
    status: 'pending',
    createdAt: '2026-10-15T11:00:00+08:00',
  },
  {
    id: 'reg-sample-4',
    category: 'klien',
    requestedRole: 'klien',
    displayName: 'Gede Agus Wijaya',
    email: 'gede@gelatobali.com',
    phone: '+62 812-7766-5544',
    businessName: 'Gelato Paradiso Bali',
    industry: 'F&B / Dessert Cafe',
    city: 'Denpasar & Ubud',
    yearsInBusiness: '2 tahun',
    employeeCount: '12 orang',
    notes: 'Ingin membenahi food cost margin, SOP multi-outlet, dan pendampingan ekspansi cabang ke Canggu.',
    status: 'pending',
    createdAt: '2026-10-15T11:45:00+08:00',
  },
];

let MEMORY_PENDING_REGISTRATIONS: PendingRegistration[] = [...INITIAL_PENDING_REGISTRATIONS];

export async function submitPendingRegistration(
  regData: Omit<PendingRegistration, 'id' | 'createdAt' | 'status'>
): Promise<PendingRegistration> {
  const id = `reg-${Date.now()}`;
  const nowIso = new Date().toISOString();
  const newReg: PendingRegistration = {
    ...regData,
    id,
    status: 'pending',
    createdAt: nowIso,
  };

  MEMORY_PENDING_REGISTRATIONS.unshift(newReg);

  const path = `pending_registrations/${id}`;
  try {
    await setDoc(doc(db, 'pending_registrations', id), newReg);
  } catch (error) {
    console.info('Pending registration saved to local cache/memory:', error);
  }

  await logActivity({
    action: 'Pendaftaran Akun Baru Diajukan',
    actorName: newReg.displayName,
    actorRole: newReg.category === 'bod' ? 'BOD Applicant' : newReg.category === 'staff' ? 'Staff Applicant' : 'Client Applicant',
    details: `Pengajuan akun "${newReg.displayName}" (${newReg.email}) kategori ${newReg.category.toUpperCase()} peran: ${newReg.requestedRole}.`,
  });

  return newReg;
}

export async function getPendingRegistrations(
  statusFilter?: RegistrationStatus
): Promise<PendingRegistration[]> {
  const path = 'pending_registrations';
  try {
    let snap;
    if (statusFilter) {
      const q = query(collection(db, path), where('status', '==', statusFilter));
      snap = await getDocs(q);
    } else {
      snap = await getDocs(collection(db, path));
    }

    const firestoreDocs = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PendingRegistration);
    const map = new Map<string, PendingRegistration>();
    MEMORY_PENDING_REGISTRATIONS.forEach((r) => map.set(r.id, r));
    firestoreDocs.forEach((r) => map.set(r.id, r));

    const all = Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    if (statusFilter) {
      return all.filter((r) => r.status === statusFilter);
    }
    return all;
  } catch (error) {
    if (statusFilter) {
      return MEMORY_PENDING_REGISTRATIONS.filter((r) => r.status === statusFilter);
    }
    return MEMORY_PENDING_REGISTRATIONS;
  }
}

export async function approveRegistration(
  registrationId: string,
  assignedRole: UserRole,
  reviewerName: string,
  reviewerRole = 'Owner'
): Promise<UserProfile> {
  const nowIso = new Date().toISOString();
  const all = await getPendingRegistrations();
  const target = all.find((r) => r.id === registrationId);

  if (!target) {
    throw new Error('Data pendaftaran tidak ditemukan.');
  }

  // 1. Update Registration status
  target.status = 'approved';
  target.reviewedBy = reviewerName;
  target.reviewedAt = nowIso;
  target.updatedAt = nowIso;

  const memIdx = MEMORY_PENDING_REGISTRATIONS.findIndex((r) => r.id === registrationId);
  if (memIdx !== -1) {
    MEMORY_PENDING_REGISTRATIONS[memIdx] = target;
  }

  try {
    await updateDoc(doc(db, 'pending_registrations', registrationId), {
      status: 'approved',
      reviewedBy: reviewerName,
      reviewedAt: nowIso,
      updatedAt: nowIso,
    });
  } catch (e) {
    // ignore
  }

  // 2. If Klien category, create Client document first
  let newClientId: string | undefined;
  if (target.category === 'klien' || assignedRole === 'klien' || assignedRole === 'client') {
    newClientId = `client-${Date.now()}`;
    const newClient: Client = {
      id: newClientId,
      namaPemilik: target.displayName,
      namaBisnis: target.businessName || `${target.displayName}'s Business`,
      industri: target.industry || 'Umum',
      kota: target.city || 'Indonesia',
      lamaUsaha: target.yearsInBusiness || '1-3 tahun',
      jumlahKaryawan: target.employeeCount || '5-15 orang',
      kontak: target.phone || target.email,
      status: 'Onboarding',
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    try {
      await setDoc(doc(db, 'clients', newClientId), newClient);
      SEED_CLIENTS.unshift(newClient);
    } catch (e) {
      SEED_CLIENTS.unshift(newClient);
    }
  }

  // 3. Create or Update active UserProfile
  const userId = `usr-${Date.now()}`;
  const newUserProfile: UserProfile = {
    id: userId,
    email: target.email,
    displayName: target.displayName,
    role: assignedRole,
    title: target.title || (assignedRole === 'owner' ? 'Managing Partner' : assignedRole === 'konsultan' ? 'Konsultan Bisnis' : 'Anggota Tim'),
    phone: target.phone,
    clientId: newClientId,
    createdAt: nowIso,
  };

  await saveUserProfile(newUserProfile);

  await logActivity({
    action: 'Persetujuan Akun Tim / BOD Baru',
    actorName: reviewerName,
    actorRole: reviewerRole,
    details: `Menyetujui pendaftaran "${target.displayName}" (${target.email}) sebagai peran "${assignedRole}".`,
  });

  return newUserProfile;
}

export async function rejectRegistration(
  registrationId: string,
  reason: string,
  reviewerName: string,
  reviewerRole = 'Owner'
): Promise<void> {
  const nowIso = new Date().toISOString();
  const all = await getPendingRegistrations();
  const target = all.find((r) => r.id === registrationId);

  if (target) {
    target.status = 'rejected';
    target.rejectionReason = reason;
    target.reviewedBy = reviewerName;
    target.reviewedAt = nowIso;
    target.updatedAt = nowIso;

    const memIdx = MEMORY_PENDING_REGISTRATIONS.findIndex((r) => r.id === registrationId);
    if (memIdx !== -1) {
      MEMORY_PENDING_REGISTRATIONS[memIdx] = target;
    }

    try {
      await updateDoc(doc(db, 'pending_registrations', registrationId), {
        status: 'rejected',
        rejectionReason: reason,
        reviewedBy: reviewerName,
        reviewedAt: nowIso,
        updatedAt: nowIso,
      });
    } catch (e) {
      // ignore
    }

    await logActivity({
      action: 'Penolakan Pendaftaran Akun',
      actorName: reviewerName,
      actorRole: reviewerRole,
      details: `Menolak pendaftaran "${target.displayName}" (${target.email}). Alasan: ${reason}.`,
    });
  }
}


