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
  if (status === 'Selesai') return false;
  const deadlineDate = new Date(deadline);
  const now = new Date();
  // set to end of deadline day
  deadlineDate.setHours(23, 59, 59, 999);
  return now.getTime() > deadlineDate.getTime();
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
