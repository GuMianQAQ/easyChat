function parseTime(raw: string): Date | null {
  if (!raw.trim()) {
    return null;
  }

  const date = new Date(raw.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatNumber(value: number): string {
  return `${value}`.padStart(2, "0");
}

function formatMonthDay(date: Date): string {
  return `${formatNumber(date.getMonth() + 1)}/${formatNumber(date.getDate())}`;
}

function formatFullDate(date: Date): string {
  return `${date.getFullYear()}/${formatMonthDay(date)}`;
}

function formatClock(date: Date): string {
  return `${formatNumber(date.getHours())}:${formatNumber(date.getMinutes())}`;
}

export function fallbackTimeLabel(): string {
  return formatClock(new Date());
}

export function formatTimeLabel(raw: string): string {
  const date = parseTime(raw);
  if (!date) {
    return raw || fallbackTimeLabel();
  }

  return formatClock(date);
}

export function formatConversationTime(raw: string): string {
  const date = parseTime(raw);
  if (!date) {
    return raw || fallbackTimeLabel();
  }

  const now = new Date();
  const today = startOfDay(now);
  const targetDay = startOfDay(date);
  const diffDays = Math.round(
    (today.getTime() - targetDay.getTime()) / (24 * 60 * 60 * 1000),
  );

  if (diffDays === 0) {
    return formatClock(date);
  }
  if (diffDays === 1) {
    return `昨天 ${formatClock(date)}`;
  }
  if (diffDays === 2) {
    return `前天 ${formatClock(date)}`;
  }

  const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - (dayOfWeek - 1));
  const weekdayLabels = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

  if (targetDay >= startOfWeek) {
    return weekdayLabels[date.getDay()];
  }

  if (date.getFullYear() === now.getFullYear()) {
    return formatMonthDay(date);
  }

  return formatFullDate(date);
}

export function shouldShowTimeDivider(previousRaw: string, currentRaw: string): boolean {
  if (!previousRaw) {
    return true;
  }

  const previous = parseTime(previousRaw);
  const current = parseTime(currentRaw);
  if (!previous || !current) {
    return false;
  }

  return current.getTime() - previous.getTime() > 5 * 60 * 1000;
}

export function formatDividerTime(raw: string): string {
  const date = parseTime(raw);
  if (!date) {
    return raw || fallbackTimeLabel();
  }

  const now = new Date();
  const startOfToday = startOfDay(now);
  const startOfMessageDay = startOfDay(date);
  const diffDays = Math.round(
    (startOfToday.getTime() - startOfMessageDay.getTime()) / (24 * 60 * 60 * 1000),
  );

  const timeLabel = formatTimeLabel(raw);
  if (diffDays === 0) {
    return `今天 ${timeLabel}`;
  }
  if (diffDays === 1) {
    return `昨天 ${timeLabel}`;
  }

  const month = formatNumber(date.getMonth() + 1);
  const day = formatNumber(date.getDate());
  return `${month}-${day} ${timeLabel}`;
}
