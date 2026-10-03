// The avatar must match docs/02-thiet-ke/canvas-v2/Avatar.dc.html exactly. The vectors below were produced by running
// the board's own renderVals() code (3 Oct 2026) on the demo wallets and two names; they are not computed by the port.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { avatarSpec } from '../index.ts';

const BOARD = [
  { seed: "BT9czjT3y8MZvGT5HSB8c7uXZriXJj13BBiGDQCtRT7B", bg: "#F2EAFB", rotate: 180, shapes: [{ d: "M0 0H22A22 22 0 0 1 0 22Z", fill: "#7B2FBE", stroke: "none", strokeWidth: 0 }, { d: "M40 40H18A22 22 0 0 1 40 18Z", fill: "#B45309" }, { d: "M16.5 20a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0 -7 0Z", fill: "#FFFFFF", fillOpacity: 0.95 }] },
  { seed: "EcpCrZB6HAV8VBRcfmR6DZqwitFpxfkUnEXfqAYPrA4y", bg: "#E0F5F3", rotate: 90, shapes: [{ d: "M9 9h11v11h-11z", fill: "#0F766E", stroke: "none", strokeWidth: 0 }, { d: "M20 20h11v11h-11z", fill: "#B45309" }, { d: "M21 14.5a4.5 4.5 0 1 0 9 0a4.5 4.5 0 1 0 -9 0Z", fill: "#0F766E", fillOpacity: 0.45 }] },
  { seed: "FA2qzovJShkNNNnMz3nXmYXvBzenRTgU2oko7RBBhbyp", bg: "#EEEFFE", rotate: 90, shapes: [{ d: "M8 20a12 12 0 1 0 24 0a12 12 0 1 0 -24 0Z", fill: "none", stroke: "#4F46E5", strokeWidth: 5 }, { d: "M15.5 20a4.5 4.5 0 1 0 9 0a4.5 4.5 0 1 0 -9 0Z", fill: "#1D4ED8" }, { d: "M30 8a3 3 0 1 0 6 0a3 3 0 1 0 -6 0Z", fill: "#4F46E5", fillOpacity: 0.6 }] },
  { seed: "vinh", bg: "#FCE7F3", rotate: 270, shapes: [{ d: "M0 0H22A22 22 0 0 1 0 22Z", fill: "#BE185D", stroke: "none", strokeWidth: 0 }, { d: "M40 40H18A22 22 0 0 1 40 18Z", fill: "#1D4ED8" }, { d: "M16.5 20a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0 -7 0Z", fill: "#FFFFFF", fillOpacity: 0.95 }] },
  { seed: "mia", bg: "#F2EAFB", rotate: 180, shapes: [{ d: "M8 20a12 12 0 1 0 24 0a12 12 0 1 0 -24 0Z", fill: "none", stroke: "#7B2FBE", strokeWidth: 5 }, { d: "M15.5 20a4.5 4.5 0 1 0 9 0a4.5 4.5 0 1 0 -9 0Z", fill: "#4F46E5" }, { d: "M30 8a3 3 0 1 0 6 0a3 3 0 1 0 -6 0Z", fill: "#7B2FBE", fillOpacity: 0.6 }] },
];

test('avatar equals the Avatar board output for the demo wallets and sample names', () => {
  for (const want of BOARD) {
    const got = avatarSpec(want.seed);
    assert.equal(got.bg, want.bg, want.seed);
    assert.equal(got.rotate, want.rotate, want.seed);
    assert.equal(got.shapes[0].d, want.shapes[0].d, want.seed);
    assert.equal(got.shapes[0].fill, want.shapes[0].fill, want.seed);
    assert.equal(got.shapes[0].stroke, want.shapes[0].stroke, want.seed);
    assert.equal(got.shapes[0].strokeWidth, want.shapes[0].strokeWidth, want.seed);
    assert.equal(got.shapes[1].d, want.shapes[1].d, want.seed);
    assert.equal(got.shapes[1].fill, want.shapes[1].fill, want.seed);
    assert.equal(got.shapes[2].d, want.shapes[2].d, want.seed);
    assert.equal(got.shapes[2].fill, want.shapes[2].fill, want.seed);
    assert.equal(got.shapes[2].fillOpacity, want.shapes[2].fillOpacity, want.seed);
  }
});

test('the seed is trimmed and lower-cased like the board; different wallets get different avatars', () => {
  assert.deepEqual(avatarSpec('  VINH '), avatarSpec('vinh'));
  assert.notDeepEqual(avatarSpec(BOARD[0].seed), avatarSpec(BOARD[1].seed));
});
