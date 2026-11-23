// Starts the API (3102) and the UI (5102) together; Ctrl+C stops both.
import { spawn } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const procs = [['api', ['--prefix', 'api', 'run', 'dev']], ['ui', ['--prefix', 'ui', 'run', 'dev']]].map(([name, args]) => {
  const p = spawn(npm, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' });
  const tag = (chunk) => chunk.toString().split('\n').filter(Boolean).map((l) => `[${name}] ${l}`).join('\n');
  p.stdout.on('data', (d) => console.log(tag(d)));
  p.stderr.on('data', (d) => console.error(tag(d)));
  p.on('exit', (code) => { console.log(`[${name}] exited with ${code}`); procs.forEach((x) => x.kill()); process.exit(code ?? 0); });
  return p;
});
process.on('SIGINT', () => procs.forEach((p) => p.kill('SIGINT')));
