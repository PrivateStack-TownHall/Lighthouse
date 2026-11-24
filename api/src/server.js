import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { loadEnv } from './common/config/env.js';
import { createJsonStore, databaseDirFromUrl } from './database/json-store.js';
import { createApp } from './app.js';

const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const env = loadEnv();
// App option (not part of the kit env): AUTH_REQUIRED=true puts the generator and projects behind the auth contract.
const authRequired = z.enum(['true', 'false']).default('false').parse(process.env.AUTH_REQUIRED) === 'true';
const store = createJsonStore(databaseDirFromUrl(env.DATABASE_URL, apiRoot));
const { app } = await createApp({ env, store, kitRoot: resolve(apiRoot, 'kit'), exportDir: resolve(apiRoot, '../docs/generated-results'), authRequired });

app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Lighthouse API on http://localhost:${env.PORT}/api (docs: /api/docs, database: ${store.dir}, auth ${authRequired ? 'required' : 'off'})`);
});
