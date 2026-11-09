export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date in Indonesian locale and WITA (UTC+8) timezone
 */
export function formatWITA(dateInput?: string | number | Date | null, includeTime = true): string {
  if (!dateInput) return '-';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '-';

  const dateOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Makassar', // WITA timezone (UTC+8)
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  };

  if (includeTime) {
    const timeOptions: Intl.DateTimeFormatOptions = {
      ...dateOptions,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    };
    const formatted = new Intl.DateTimeFormat('id-ID', timeOptions).format(date);
    return `${formatted} WITA`;
  }

  return new Intl.DateTimeFormat('id-ID', dateOptions).format(date);
}

export function formatDateIndo(dateInput?: string | number | Date | null): string {
  if (!dateInput) return '-';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/**
 * Calculates days difference between target date and today in WITA
 */
export function getDaysDiff(targetDateString: string): number {
  const target = new Date(targetDateString);
  const now = new Date();
  const diffTime = now.getTime() - target.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Determines whether a task is overdue
 */
export function isTaskOverdue(deadline: string, status: string): boolean {
  if (status === 'Selesai' || !deadline) return false;
  // Terlambat jika tenggat (tanggal) sudah lewat menurut kalender WITA.
  const deadlineDay = /^\d{4}-\d{2}-\d{2}$/.test(deadline.slice(0, 10)) && deadline.length <= 10
    ? deadline
    : dateWITA(deadline);
  return deadlineDay < todayWITA();
}

/**
 * Evaluate if a client is at risk:
 * Rule: tidak ada sesi 14 hari ATAU lebih dari 30% tugas terlambat
 */
export function evaluateClientRisk(
  lastSessionDate?: string,
  tasks: Array<{ status: string; deadline: string }> = []
): { isAtRisk: boolean; reason?: string } {
  // Check session inactivity
  let sessionRisk = false;
  if (!lastSessionDate) {
    sessionRisk = true;
  } else {
    const daysSinceLastSession = getDaysDiff(lastSessionDate);
    if (daysSinceLastSession >= 14) {
      sessionRisk = true;
    }
  }

  // Check task overdue ratio
  let overdueRatio = 0;
  let taskRisk = false;
  if (tasks.length > 0) {
    const overdueCount = tasks.filter(
      (t) => t.status === 'Terlambat' || isTaskOverdue(t.deadline, t.status)
    ).length;
    overdueRatio = overdueCount / tasks.length;
    if (overdueRatio > 0.3) {
      taskRisk = true;
    }
  }

  if (sessionRisk && taskRisk) {
    return {
      isAtRisk: true,
      reason: `Tidak ada sesi ≥ 14 hari & ${(overdueRatio * 100).toFixed(0)}% tugas terlambat`,
    };
  }
  if (sessionRisk) {
    return {
      isAtRisk: true,
      reason: lastSessionDate
        ? `Tidak ada sesi sejak ${getDaysDiff(lastSessionDate)} hari lalu (≥ 14 hari)`
        : 'Belum pernah ada sesi pendampingan',
    };
  }
  if (taskRisk) {
    return {
      isAtRisk: true,
      reason: `${(overdueRatio * 100).toFixed(0)}% tugas tim/klien terlambat (> 30%)`,
    };
  }

  return { isAtRisk: false };
}

/** Tanggal hari ini (YYYY-MM-DD) menurut zona WITA (Asia/Makassar), bukan UTC. */
export function todayWITA(): string {
  return dateWITA(new Date());
}

/** Tanggal (YYYY-MM-DD) dari sebuah waktu, menurut zona WITA. */
export function dateWITA(input: string | number | Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Makassar',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(input));
}

/** Jam:menit (HH.mm) menurut zona WITA. */
export function timeWITA(input?: string | null): string {
  if (!input) return '-';
  const d = new Date(input);
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Makassar',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

/** Geser tanggal YYYY-MM-DD sebanyak n hari. */
export function shiftDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/**
 * Penilaian risiko klien yang dipakai di semua halaman:
 * - hanya klien berstatus Aktif / Onboarding yang dinilai;
 * - klien baru (< 14 hari) tanpa sesi & tanpa tugas terlambat belum dianggap berisiko.
 */
export function assessClientRisk(
  client: { status?: string; createdAt?: string },
  lastSessionDate: string | undefined,
  tasks: Array<{ status: string; deadline: string }> = []
): { isAtRisk: boolean; reason?: string } {
  if (client.status !== 'Aktif' && client.status !== 'Onboarding') return { isAtRisk: false };
  const ageDays = client.createdAt ? (Date.now() - new Date(client.createdAt).getTime()) / 86400000 : Infinity;
  const anyOverdue = tasks.some((t) => t.status === 'Terlambat' || isTaskOverdue(t.deadline, t.status));
  if (!lastSessionDate && ageDays < 14 && !anyOverdue) return { isAtRisk: false };
  return evaluateClientRisk(lastSessionDate, tasks);
}
