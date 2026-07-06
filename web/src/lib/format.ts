// Human-friendly formatting helpers shared across rider/driver/admin views.

/** Format a scheduled-pickup ISO timestamp, e.g. "Mon, 7 Jul · 9:00 AM". */
export function formatSchedule(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}
