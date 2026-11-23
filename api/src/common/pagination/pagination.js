import { z } from 'zod';

export const MAX_LIMIT = 100;

/** ?page=1&limit=20&sort=-createdAt&q=term */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(20),
  sort: z.string().regex(/^-?[A-Za-z_][A-Za-z0-9_.]*$/, 'Invalid sort field').default('-createdAt'),
  q: z.string().trim().max(100).optional(),
});

export const toOffsetLimit = ({ page, limit }) => ({ offset: (page - 1) * limit, limit });

export const buildPagination = (total, page, limit) => ({
  page,
  limit,
  total,
  totalPages: Math.max(1, Math.ceil(total / limit)),
});

/** Whitelist sortable fields per endpoint. Returns Sequelize-style [field, 'ASC'|'DESC']. */
export function parseSort(sort, allowed, fallback = ['createdAt', 'DESC']) {
  const direction = sort.startsWith('-') ? 'DESC' : 'ASC';
  const field = sort.replace(/^-/, '');
  return allowed.includes(field) ? [field, direction] : fallback;
}
