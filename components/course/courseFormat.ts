// Small pure formatting helpers shared by the course detail page (server) and
// its CourseContent list (client). Display only — no data access.

/** `3720` -> `"1h 2m"`; `540` -> `"9m"`; `0`/nullish -> `"0m"`. */
export function formatHms(totalSeconds: number | null | undefined): string {
  const secs = Math.max(0, Math.round(totalSeconds ?? 0))
  const hours = Math.floor(secs / 3600)
  const minutes = Math.round((secs % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

/** `350` -> `"5:50"`; `65` -> `"1:05"`. Used for individual lesson lengths. */
export function formatClock(seconds: number | null | undefined): string {
  const secs = Math.max(0, Math.round(seconds ?? 0))
  const minutes = Math.floor(secs / 60)
  const rem = secs % 60
  return `${minutes}:${String(rem).padStart(2, '0')}`
}

/** `18240` -> `"18.2k"`; `2100` -> `"2.1k"`; `940` -> `"940"`. */
export function formatCount(count: number | null | undefined): string {
  const n = Math.max(0, Math.round(count ?? 0))
  if (n < 1000) return String(n)
  const thousands = n / 1000
  return `${thousands.toFixed(thousands < 10 ? 1 : 0)}k`
}

/** `"intermediate"` -> `"Intermediate"`. */
export function capitalize(value: string | null | undefined): string {
  if (!value) return ''
  return value.charAt(0).toUpperCase() + value.slice(1)
}
