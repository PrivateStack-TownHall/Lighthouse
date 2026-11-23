import { mkdir, readFile, writeFile, rename, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * JSON file database: one file per collection in `database/` (e.g. database/projects.json).
 * Rows are stored with snake_case keys (FR-011); services map them to camelCase.
 * Writes are atomic (temp file + rename) and serialized per collection.
 */
export function createJsonStore(dir) {
  const root = resolve(dir);
  const queues = new Map();
  const file = (collection) => join(root, `${collection}.json`);

  async function read(collection) {
    try {
      const rows = JSON.parse(await readFile(file(collection), 'utf8'));
      return Array.isArray(rows) ? rows : [];
    } catch (e) {
      if (e.code === 'ENOENT') return [];
      throw e;
    }
  }

  async function write(collection, rows) {
    await mkdir(root, { recursive: true });
    const tmp = `${file(collection)}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tmp, `${JSON.stringify(rows, null, 2)}\n`);
    await rename(tmp, file(collection));
  }

  /** fn(rows) -> { rows, result }. Runs after every earlier update of the same collection. */
  function update(collection, fn) {
    const previous = queues.get(collection) ?? Promise.resolve();
    const next = previous.then(async () => {
      const { rows, result } = await fn(await read(collection));
      await write(collection, rows);
      return result;
    });
    queues.set(collection, next.catch(() => {}));
    return next;
  }

  async function ping() {
    await mkdir(root, { recursive: true });
    await access(root, constants.R_OK | constants.W_OK);
  }

  return { dir: root, read, write, update, ping };
}

/** DATABASE_URL=file:../database -> absolute directory, relative to `base` (the api folder). */
export function databaseDirFromUrl(url, base) {
  if (!url.startsWith('file:')) throw new Error('DATABASE_URL must be file:<folder> (JSON database)');
  return resolve(base, url.slice('file:'.length));
}
