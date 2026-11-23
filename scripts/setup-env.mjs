// Creates api/.env and ui/.env from the examples, once, with a random JWT_SECRET.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

for (const app of ['api', 'ui']) {
  const target = `${app}/.env`;
  if (existsSync(target)) { console.log(`${target} exists, left as it is`); continue; }
  let text = readFileSync(`${app}/.env.example`, 'utf8');
  if (app === 'api') text = text.replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${randomBytes(32).toString('hex')}`);
  writeFileSync(target, text);
  console.log(`${target} created`);
}
