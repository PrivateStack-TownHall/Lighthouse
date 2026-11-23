import { randomUUID } from 'node:crypto';
import { AppError } from '../../common/contract/response.js';
import { buildPagination, parseSort } from '../../common/pagination/pagination.js';
import { slugify } from '../../helpers/index.js';

const SORTABLE = ['name', 'createdAt', 'updatedAt'];
const COLUMN = { name: 'name', createdAt: 'created_at', updatedAt: 'updated_at' };

export const toProject = (row) => ({
  id: row.id, name: row.name, slug: row.slug, config: row.config,
  createdBy: row.created_by, createdAt: row.created_at, updatedAt: row.updated_at,
});

export function createProjectsService({ store }) {
  async function list({ page, limit, sort, q }) {
    const [field, dir] = parseSort(sort, SORTABLE, ['updatedAt', 'DESC']);
    const col = COLUMN[field];
    const term = q?.toLowerCase();
    const rows = (await store.read('projects'))
      .filter((r) => !term || r.name.toLowerCase().includes(term) || r.slug.includes(term))
      .sort((a, b) => (a[col] < b[col] ? -1 : a[col] > b[col] ? 1 : 0) * (dir === 'DESC' ? -1 : 1));
    const items = rows.slice((page - 1) * limit, page * limit).map(toProject);
    return { items, pagination: buildPagination(rows.length, page, limit) };
  }

  async function get(id) {
    const row = (await store.read('projects')).find((r) => r.id === id);
    if (!row) throw new AppError(404, 'Project not found', 'NOT_FOUND');
    return toProject(row);
  }

  function create({ name, config }, user) {
    return store.update('projects', (rows) => {
      const now = new Date().toISOString();
      const row = { id: randomUUID(), name, slug: slugify(name), config, created_by: user?.id ?? null, created_at: now, updated_at: now };
      return { rows: [...rows, row], result: toProject(row) };
    });
  }

  function update(id, patch) {
    return store.update('projects', (rows) => {
      const i = rows.findIndex((r) => r.id === id);
      if (i < 0) throw new AppError(404, 'Project not found', 'NOT_FOUND');
      const row = { ...rows[i], ...(patch.name !== undefined && { name: patch.name, slug: slugify(patch.name) }),
        ...(patch.config !== undefined && { config: patch.config }), updated_at: new Date().toISOString() };
      const next = [...rows]; next[i] = row;
      return { rows: next, result: toProject(row) };
    });
  }

  function remove(id) {
    return store.update('projects', (rows) => {
      if (!rows.some((r) => r.id === id)) throw new AppError(404, 'Project not found', 'NOT_FOUND');
      return { rows: rows.filter((r) => r.id !== id), result: null };
    });
  }

  /** Activity source for /api/activities. */
  const activitySource = {
    collect: async (limit) => (await store.read('projects'))
      .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1)).slice(0, limit)
      .map((r) => ({ id: `project-${r.id}`, type: r.created_at === r.updated_at ? 'PROJECT_CREATED' : 'PROJECT_UPDATED', entity: 'Project',
        title: r.name, description: r.created_at === r.updated_at ? 'Project saved' : 'Project updated', createdAt: r.updated_at })),
  };

  return { list, get, create, update, remove, activitySource };
}
