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

export function fallbackTimeLabel(): string {
  const now = new Date();
  const hours = `${now.getHours()}`.padStart(2, "0");
  const minutes = `${now.getMinutes()}`.padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function formatTimeLabel(raw: string): string {
  const date = parseTime(raw);
  if (!date) {
    return raw || fallbackTimeLabel();
  }

  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${hours}:${minutes}`;
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
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMessageDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
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

  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${month}-${day} ${timeLabel}`;
}
