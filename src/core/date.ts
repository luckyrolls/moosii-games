/** Local calendar date as YYYY-MM-DD (uses the device's time zone, not UTC). */
export function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${String(y).padStart(4, '0')}-${m}-${d}`;
}
