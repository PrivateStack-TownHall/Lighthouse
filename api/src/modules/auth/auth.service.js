import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppError } from '../../common/contract/response.js';

export const ROLES = ['ADMIN', 'STAFF', 'USER'];
const ACCESS_SECONDS = 15 * 60;
const REFRESH_SECONDS = 7 * 24 * 60 * 60;

const toUser = (row) => ({ id: row.id, email: row.email, name: row.name, role: row.role });

export function createAuthService({ store, secret }) {
  const dummyHash = bcrypt.hashSync(randomUUID(), 10); // compared when the email is unknown
  const sign = (user) => jwt.sign({ sub: user.id, role: user.role }, secret, { expiresIn: ACCESS_SECONDS });

  async function login({ email, password }) {
    const row = (await store.read('users')).find((u) => u.email === email);
    // Compare even when the user does not exist, so timing does not reveal valid emails.
    const ok = await bcrypt.compare(password, row?.password_hash ?? dummyHash);
    if (!row || !ok) throw new AppError(401, 'Invalid email or password', 'UNAUTHORIZED');
    const refreshToken = jwt.sign({ sub: row.id, role: row.role, typ: 'refresh' }, secret, { expiresIn: REFRESH_SECONDS });
    return { accessToken: sign(row), refreshToken, expiresIn: ACCESS_SECONDS, user: toUser(row) };
  }

  async function refresh({ refreshToken }) {
    let payload;
    try {
      payload = jwt.verify(refreshToken, secret);
    } catch {
      throw new AppError(401, 'Invalid or expired refresh token', 'UNAUTHORIZED');
    }
    if (payload.typ !== 'refresh') throw new AppError(401, 'Not a refresh token', 'UNAUTHORIZED');
    const row = (await store.read('users')).find((u) => u.id === payload.sub);
    if (!row) throw new AppError(401, 'User no longer exists', 'UNAUTHORIZED');
    return { accessToken: sign(row), expiresIn: ACCESS_SECONDS };
  }

  async function me(id) {
    const row = (await store.read('users')).find((u) => u.id === id);
    if (!row) throw new AppError(404, 'User not found', 'NOT_FOUND');
    return toUser(row);
  }

  /** Used by the seed script. Idempotent: an existing email is left as it is. */
  async function ensureUser({ email, name, role, password }) {
    if (!ROLES.includes(role)) throw new Error(`Unknown role ${role}`);
    const hash = await bcrypt.hash(password, Number(process.env.BCRYPT_COST ?? 10));
    return store.update('users', (rows) => {
      const existing = rows.find((u) => u.email === email.toLowerCase());
      if (existing) return { rows, result: { created: false, user: toUser(existing) } };
      const now = new Date().toISOString();
      const row = { id: randomUUID(), email: email.toLowerCase(), name, role, password_hash: hash, created_at: now, updated_at: now };
      return { rows: [...rows, row], result: { created: true, user: toUser(row) } };
    });
  }

  return { login, refresh, me, ensureUser };
}
