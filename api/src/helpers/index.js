/** Small pure functions. No I/O, no framework imports, no business rules (those belong in modules/). */

/** "Budi Santoso" -> "Budi S." ; one word stays as is. Used for public/unauthenticated output. */
export function maskName(fullName) {
  const parts = String(fullName ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1][0].toUpperCase()}.`;
}

/** "john@example.com" -> "j***@example.com". Prefer not to expose emails at all. */
export function maskEmail(email) {
  const [local, domain] = String(email ?? '').split('@');
  if (!local || !domain) return '';
  return `${local[0]}***@${domain}`;
}

/** "Kopi Susu Gula Aren!" -> "kopi-susu-gula-aren" */
export function slugify(text) {
  return String(text ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Always UTC ISO 8601, e.g. 2026-11-22T14:00:00.000Z. Throws on an invalid date. */
export function toIsoUtc(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) throw new RangeError('Invalid date');
  return d.toISOString();
}
