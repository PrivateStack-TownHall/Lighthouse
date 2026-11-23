// node scripts/db.js setup | seed | reset
// The JSON database lives in the folder named by DATABASE_URL (file:../database).
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from '../src/common/config/env.js';
import { createJsonStore, databaseDirFromUrl } from '../src/database/json-store.js';
import { createAuthService } from '../src/modules/auth/auth.service.js';

const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const env = loadEnv();
const store = createJsonStore(databaseDirFromUrl(env.DATABASE_URL, apiRoot));
const COLLECTIONS = ['users', 'projects', 'generations'];
const cmd = process.argv[2];

async function setup() {
  for (const c of COLLECTIONS) if ((await store.read(c)).length === 0) await store.write(c, []);
  console.log(`Database ready in ${store.dir}`);
}

async function seed() {
  const email = process.env.ADMIN_EMAIL; const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 8) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD (min 8 characters) in .env to seed the admin.');
    process.exit(1);
  }
  const auth = createAuthService({ store, secret: env.JWT_SECRET });
  const res = await auth.ensureUser({ email, password, name: process.env.ADMIN_NAME ?? 'Administrator', role: 'ADMIN' });
  console.log(res.created ? `Admin created: ${res.user.email}` : `Admin already exists: ${res.user.email}`);
}

async function reset() {
  for (const c of COLLECTIONS) await store.write(c, []);
  console.log('Database emptied');
  await seed();
}

const run = { setup, seed, reset }[cmd];
if (!run) { console.error('Usage: node scripts/db.js setup | seed | reset'); process.exit(1); }
await run();
