/** Shared presentation helpers for admin + customer surfaces. */

export function formatCurrency(value: number | null | undefined) {
  const amount = Number.isFinite(Number(value)) ? Number(value) : 0;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export function formatDateRange(start: string | Date | null | undefined, end: string | Date | null | undefined) {
  if (!start) return "—";
  const startText = formatDate(start);
  if (!end) return startText;
  const endDate = new Date(end);
  const startDate = new Date(start);
  if (startDate.toDateString() === endDate.toDateString()) return startText;
  return `${startText} – ${formatDate(end)}`;
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

export function humanise(value: string | null | undefined) {
  if (!value) return "—";
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

/** Inclusive trip length in days and the number of nights between the travel dates. */
export function tripDuration(start: string | Date | null | undefined, end: string | Date | null | undefined) {
  if (!start) return { days: 0, nights: 0 };
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : startDate;
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return { days: 0, nights: 0 };
  const nights = Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000));
  return { days: nights + 1, nights };
}

/** "4 Days · 3 Nights" style label used across trip cards and detail pages. */
export function formatDuration(start: string | Date | null | undefined, end: string | Date | null | undefined) {
  const { days, nights } = tripDuration(start, end);
  if (!days) return "—";
  return nights > 0 ? `${days} Days · ${nights} Nights` : `${days} Day`;
}
