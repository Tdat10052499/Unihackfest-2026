// R3: both CSP blocks of vercel.json allow exactly the preview frame origins of @ned/core (and https images, which load
// only after "Load preview"); nothing broader than those origins in frame-src.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PREVIEW_FRAME_HOSTS } from '@ned/core/milestone/embed.ts';

const config = JSON.parse(readFileSync(new URL('../../../vercel.json', import.meta.url), 'utf8')) as { headers: { source: string; headers: { key: string; value: string }[] }[] };
const policies = config.headers.flatMap((h) => h.headers.filter((x) => x.key === 'Content-Security-Policy').map((x) => ({ source: h.source, value: x.value })));
const directive = (policy: string, name: string) => policy.split(';').map((d) => d.trim()).find((d) => d.startsWith(`${name} `))?.split(/\s+/).slice(1) ?? [];

test('both CSP blocks are enforced (Workspace and /wallet)', () => {
  assert.equal(policies.length, 2);
});

test('frame-src: self, Dynamic and exactly the PREVIEW_FRAME_HOSTS origins', () => {
  for (const p of policies) {
    const frame = directive(p.value, 'frame-src');
    assert.deepEqual(frame, ["'self'", 'https://*.dynamicauth.com', ...PREVIEW_FRAME_HOSTS], p.source);
    assert.ok(!frame.includes('https:') && !frame.includes('*'), p.source);
  }
});

test('img-src allows https images for direct image previews', () => {
  for (const p of policies) assert.ok(directive(p.value, 'img-src').includes('https:'), p.source);
});
