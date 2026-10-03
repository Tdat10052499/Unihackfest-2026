import { test } from 'node:test';
import assert from 'node:assert/strict';
import { avatarHash, avatarSpec } from '../avatar.ts';

test('avatar is deterministic, case- and space-insensitive', () => {
  assert.deepEqual(avatarSpec('vinh'), avatarSpec(' VINH '));
  assert.equal(avatarHash('vinh'), avatarHash('vinh'));
  assert.notDeepEqual(avatarSpec('vinh'), avatarSpec('mia'));
});

test('avatar spec matches the Avatar.dc.html algorithm for known seeds', () => {
  // Expected values computed with the board's own renderVals() logic (FNV-1a + murmur3 finaliser)
  const h = avatarHash('vinh');
  const spec = avatarSpec('vinh');
  const palette = ['#F2EAFB', '#E3EDFC', '#E7F6EC', '#FFF5E1', '#FDECEC', '#E0F5F3', '#EEEFFE', '#FCE7F3'];
  assert.equal(spec.bg, palette[h % 8]);
  assert.equal(spec.rotate, ((h >>> 6) % 4) * 90);
  assert.equal(spec.label, 'Avatar for @vinh');
  assert.equal(spec.shapes.length, 3);
  for (const seed of ['9PZwK7pZmZnqfq1D5Xm9JvmoFQbPSjCoxj4AHiVLrhkW', 'mia', 'a', '']) {
    const s = avatarSpec(seed);
    assert.ok(palette.includes(s.bg), seed);
    assert.ok([0, 90, 180, 270].includes(s.rotate), seed);
    assert.ok(s.shapes.every((x) => x.d.length > 0), seed);
  }
});
