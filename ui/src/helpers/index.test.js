import { expect, test } from 'vitest';
import { formatIdr, initials, slugify, stableStringify, timeAgo } from './index.js';

test('helpers', () => {
  expect(formatIdr(1250000)).toBe('Rp 1.250.000');
  expect(slugify('Kopi Susu Gula Aren!')).toBe('kopi-susu-gula-aren');
  expect(initials('Vincent G.')).toBe('VG');
  expect(stableStringify({ b: 1, a: [2, { d: 1, c: 2 }] })).toBe('{"a":[2,{"c":2,"d":1}],"b":1}');
  expect(timeAgo('2026-11-23T10:00:00Z', Date.parse('2026-11-23T10:05:00Z'))).toBe('5 min ago');
});
