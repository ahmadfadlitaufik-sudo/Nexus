export type UserRole =
  | 'owner'
  | 'konsultan'
  | 'klien'
  | 'tim_grup'
  | 'tim_konten'
  | 'staf_operasional'
  | 'consultant'
  | 'client';

export type ClientStatus = 'Prospek' | 'Onboarding' | 'Aktif' | 'Selesai' | 'Berhenti';

export type ProgramType = 'Fundamental' | 'Mentoring';

export type TaskStatus = 'Belum' | 'Berjalan' | 'Selesai' | 'Terlambat';

export type TaskAssigneeRole = 'Konsultan' | 'Klien' | 'Tim';

export type SessionStatus = 'Terjadwal' | 'Selesai' | 'Dibatalkan';

export type RoadmapStatus = 'Belum' | 'Berjalan' | 'Selesai';

export type AccountStatus = 'pending' | 'approved' | 'rejected' | 'active';

export type RegistrationCategory = 'bod' | 'staff' | 'client' | 'klien';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  status?: AccountStatus;
  registrationCategory?: RegistrationCategory;
  clientId?: string;
  phone?: string;
  title?: string;
  avatarUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  // Registration and approval details
  companyName?: string;
  city?: string;
  industry?: string;
  teamSize?: string;
  programInterest?: string;
  notes?: string;
  portfolioUrl?: string;
  rejectionReason?: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface Client {
  id: string;
  namaPemilik: string;
  namaBisnis: string;
  industri: string;
  kota: string;
  lamaUsaha: string;
  jumlahKaryawan: string;
  kontak: string;
  status: ClientStatus;
  programId?: string;
  primaryConsultantId?: string;
  consultantIds?: string[]; // Penugasan satu atau lebih konsultan
  logoUrl?: string;
  createdAt: string;
  updatedAt: string;
  // Computed / joined fields
  lastSessionDate?: string;
  tasksOverdueRatio?: number;
  isAtRisk?: boolean;
  riskReason?: string;
}

export interface ClientConsultant {
  id: string;
  clientId: string;
  consultantId: string;
  role?: string; // 'Lead Consultant' | 'Co-Consultant'
  assignedAt: string;
}

export interface ProgramMilestoneTemplate {
  phase: string;
  title: string;
  description: string;
  targetWeek: string;
  order: number;
}

export interface Program {
  id: string;
  name: string;
  type: ProgramType;
  description: string;
  durationWeeks: number;
  totalSessions: number;
  price: number;
  features?: string[];
  milestoneTemplates?: ProgramMilestoneTemplate[]; // Tahapan template tiap program disimpan sebagai data di koleksi programs & dapat diedit Owner!
  createdAt: string;
  updatedAt?: string;
}

export interface Enrollment {
  id: string;
  clientId: string;
  programId: string;
  startDate: string;
  endDate: string;
  durationWeeks: number;
  totalSessions: number;
  completedSessions: number;
  remainingSessions: number;
  status: 'Aktif' | 'Selesai' | 'Tertunda';
  createdAt: string;
  updatedAt?: string;
}

export interface DiagnosisArea {
  score: number; // 1 to 5
  notes: string;
}

export interface Diagnosis {
  id: string;
  clientId: string;
  // 5 Area Diagnosis
  keuangan: DiagnosisArea;
  pemasaran: DiagnosisArea;
  operasional: DiagnosisArea;
  sdm: DiagnosisArea;
  produk: DiagnosisArea;
  overallNotes?: string;
  businessStage?: string;
  growthScore?: number; // Calculated or average 0-100 / 1-5
  updatedAt: string;
}

export interface RoadmapItem {
  id: string;
  clientId: string;
  tahapan: string; // nama tahapan / fase (misal: 'Fase 1: Diagnostik & Arus Kas')
  sasaran: string; // sasaran spesifik (misal: 'Audit Food Cost & Pemisahan Rekening Bisnis')
  tenggat: string; // tenggat waktu / target week (misal: 'Minggu 1-3' atau '2026-10-24')
  status: RoadmapStatus; // 'Belum' | 'Berjalan' | 'Selesai'
  urutan: number; // urutan pengerjaan (1, 2, 3...)
  deskripsi?: string;
  driveUrl?: string; // Tautan Google Drive folder atau file deliverable
  googleDriveUrl?: string; // alias untuk kemudahan integrasi
  // Legacy/alias fields for backwards compatibility
  phase?: string;
  title?: string;
  targetWeek?: string;
  order?: number;
  description?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Kpi {
  id: string;
  clientId: string;
  nama: string; // nama KPI (misal: 'Gross Profit Margin Kafe')
  nilaiAwal: number; // nilai awal (misal: 42)
  target: number; // target (misal: 65)
  nilaiSaatIni: number; // nilai saat ini (misal: 58)
  satuan: string; // satuan (misal: '%', 'Rp', 'Cabang', 'Porsi/Hari', 'Hari')
  tanggalPembaruan: string; // tanggal pembaruan (YYYY-MM-DD atau ISO)
  kategori?: string;
  // Legacy/alias fields for backwards compatibility
  title?: string;
  baselineValue?: number;
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  period?: string;
  updatedAt?: string;
}

export type AttendanceStatus = 'Hadir' | 'Izin' | 'Absen';

export interface Group {
  id: string;
  name: string;
  description: string;
  programId?: string;
  facilitatorId: string; // Consultant / tim_grup primary
  facilitatorIds?: string[];
  status: 'Aktif' | 'Persiapan' | 'Selesai';
  schedule?: string; // e.g. 'Setiap Selasa, 10:00 WITA'
  meetingUrl?: string;
  totalSessions?: number;
  completedSessions?: number;
  createdAt: string;
  updatedAt: string;
}

export interface GroupMember {
  id: string;
  groupId: string;
  clientId: string;
  status: 'Aktif' | 'Pasif' | 'Alumni';
  joinedAt: string;
  notes?: string;
  // Dynamic computed fields
  attendanceRate?: number;
  isPassive?: boolean;
  passiveReason?: string;
}

export interface GroupAttendance {
  id: string;
  groupId: string;
  sessionId: string;
  clientId: string;
  status: AttendanceStatus;
  notes?: string;
  recordedAt: string;
  recordedBy?: string;
}

export interface GroupAnnouncement {
  id: string;
  groupId: string;
  title: string;
  content: string;
  authorName: string;
  authorRole: string;
  createdAt: string;
}

export interface Session {
  id: string;
  clientId: string;
  consultantId: string;
  programId?: string;
  groupId?: string; // Links to groups collection if group session
  group_id?: string; // alias for compatibility
  dateTime: string; // ISO string in WITA (UTC+8)
  durationMinutes: number;
  meetingUrl: string;
  agenda: string;
  jenis?: 'Individu' | 'Grup'; // default 'Individu'
  status: SessionStatus;
  catatanDibagikan: string; // Visible to Client & group members
  createdAt: string;
  updatedAt: string;
}

export interface SessionInternal {
  id: string; // same as sessionId
  sessionId: string;
  clientId: string;
  catatanInternal: string; // STRICTLY internal, forbidden to Client
  keyObservations: string;
  actionItemsRaw?: string;
  updatedAt: string;
}

export interface SessionAuditLog {
  id: string;
  sessionId: string;
  clientId?: string;
  userId: string;
  userName: string;
  userRole: UserRole | string;
  targetCollection: 'sessions' | 'session_internals';
  accessType: 'READ_PUBLIC' | 'READ_INTERNAL' | 'WRITE_UPDATE' | 'UNAUTHORIZED_ATTEMPT';
  accessedAt: string; // ISO date
  isAuthorized: boolean;
  securityRuleMatched: string; // e.g. "isOwner()", "isConsultant()", "DENIED: isClientUser cannot read session_internals", "DENIED: isTimKonten cannot read clients/sessions"
  details: string;
  clientIp?: string;
}

export interface Task {
  id: string;
  clientId: string;
  sessionId?: string;
  title: string;
  assigneeName: string;
  assigneeRole: TaskAssigneeRole;
  deadline: string; // ISO or YYYY-MM-DD
  status: TaskStatus;
  proofUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentItem {
  id: string;
  clientId: string;
  title: string;
  fileUrl: string;
  category: string;
  uploadedBy: string;
  createdAt: string;
}

export interface Feedback {
  id: string;
  clientId: string;
  sessionId?: string;
  rating: number; // 1-5
  comments: string;
  createdAt: string;
}

export type ContentType = 'materi_program' | 'konten_pemasaran';
export type ContentStatus = 'Ide' | 'Produksi' | 'Review' | 'Terjadwal' | 'Terbit';
export type ContentChannel =
  | 'Instagram'
  | 'LinkedIn'
  | 'YouTube'
  | 'TikTok'
  | 'Newsletter'
  | 'Website'
  | 'Portal Internal'
  | 'Lainnya';

export type MaterialFormat =
  | 'PDF / E-Book'
  | 'Template SOP'
  | 'Video Panduan'
  | 'Worksheet'
  | 'Slide Deck'
  | 'Checklist'
  | 'Framework';

export type ConsentStatus = 'Menunggu' | 'Disetujui_Anonim' | 'Disetujui_Terbuka' | 'Ditolak';

export interface ContentItem {
  id: string;
  title: string;
  type: ContentType; // 'materi_program' | 'konten_pemasaran'
  status: ContentStatus; // 'Ide' | 'Produksi' | 'Review' | 'Terjadwal' | 'Terbit'
  channel: ContentChannel | string;
  publishDate?: string; // YYYY-MM-DD or ISO
  authorId: string; // PIC / Penanggung jawab ID
  authorName: string; // PIC Nama
  description?: string;
  category?: string; // 'Finance', 'SOP Operasional', 'Marketing Funnel', 'Leadership', etc.
  tags?: string[];
  fileUrl?: string; // Lampiran file materi
  externalUrl?: string; // Link canva/notion/drive/youtube
  format?: MaterialFormat | string;
  isLibraryMaterial?: boolean; // Apakah masuk ke Perpustakaan Materi
  usageCount?: number; // Berapa kali dipasang ke roadmap/grup
  createdAt: string;
  updatedAt: string;
}

export interface ContentConsent {
  id: string;
  clientId: string;
  clientName?: string;
  businessName?: string;
  anonymizedName?: string; // e.g. "Brand F&B Terkemuka di Denpasar" (bawaan / default)
  anonymizedOwnerName?: string; // e.g. "Founder Made (Inisial M.A.)"
  industry?: string;
  city?: string;
  caseStudyTitle: string; // e.g. "Kenaikan Omzet 140% & Reduksi Food Waste Pasca SOP"
  caseStudySummary: string;
  keyMetricsAchievement?: string; // e.g. "+140% Omzet, -12% HPP"
  status: ConsentStatus; // default: 'Disetujui_Anonim' atau 'Menunggu'
  requestedBy: string;
  requestedAt: string;
  respondedAt?: string;
  clientNotes?: string;
  isAnonymizedDefault: boolean; // default true
  allowedChannels?: string[]; // e.g. ['Instagram', 'LinkedIn', 'Website']
  contentItemId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  clientId?: string;
  action: string;
  actorName: string;
  actorRole: string;
  details: string;
  createdAt: string;
}

// ----------------- TEAM DAILY CHECKIN & STANDUP TYPES -----------------
export type WorkStatus = 'WFA' | 'Kantor' | 'Cuti' | 'Sakit' | 'Izin';
export type PlanItemStatus = 'Belum' | 'Berjalan' | 'Selesai' | 'Tertunda' | 'Dibatalkan' | 'Pindah ke besok';

export interface HelpOffer {
  id: string;
  helperId?: string;
  helperName?: string;
  helperAvatar?: string;
  fromUserId?: string;
  fromUserName?: string;
  message: string;
  offeredAt?: string;
  createdAt?: string;
}

export interface TeamCheckin {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  userAvatar?: string;
  date: string; // YYYY-MM-DD
  workStatus: WorkStatus;
  locationNote?: string;
  priorities: string[]; // 1-3 items
  priorityStatuses?: Record<string | number, PlanItemStatus>;
  blockers?: string;
  eveningNotes?: string;
  checkoutNotes?: string;
  morningCheckinAt?: string;
  eveningCheckoutAt?: string;
  submittedAtMorning?: string;
  submittedAtEvening?: string;
  completedCount?: number;
  helpOffers?: HelpOffer[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PlanItem {
  id: string;
  userId: string;
  date: string;
  title: string;
  status: PlanItemStatus;
  sourceType?: 'manual' | 'session' | 'task';
  sourceId?: string;
  createdAt?: string;
}

export interface WeeklyMemberRecapItem {
  userId: string;
  userName: string;
  userRole: string;
  avatarUrl?: string;
  daysCheckedIn: number;
  checkinsCount?: number;
  completionRate: number; // percentage 0-100
  topFocusAreas: string[];
  wfaCount: number;
  officeCount: number;
  leaveCount: number;
  isCurrentMemberOrOwner?: boolean;
  blockersSummary?: string;
}

export interface WeeklyTeamRecap {
  weekRange: string;
  totalCheckins: number;
  averageCompletionRate: number;
  members: WeeklyMemberRecapItem[];
  memberBreakdown: WeeklyMemberRecapItem[];
  teamSummary: {
    totalWFA?: number;
    totalOffice?: number;
    totalCheckins?: number;
    wfaRate?: number;
    priorityCompletionRate?: number;
    completedPriorities?: number;
    totalPriorities?: number;
    activeBlockersCount?: number;
    avgCompletionRate?: number;
    activeMembersCount?: number;
  };
}

// ----------------- REGISTRATION & APPROVAL TYPES -----------------
export type RegistrationStatus = 'pending' | 'approved' | 'rejected';

export interface PendingRegistration {
  id: string;
  category: RegistrationCategory;
  requestedRole: UserRole | string;
  displayName: string;
  email: string;
  password?: string;
  phone?: string;
  title?: string;
  departmentOrDivision?: string;
  skillsOrSpecialization?: string;
  // Khusus Klien
  businessName?: string;
  industry?: string;
  city?: string;
  yearsInBusiness?: string;
  employeeCount?: string;
  notes?: string;
  status: RegistrationStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt?: string;
}
