// Generated user avatar, ported from docs/02-thiet-ke/canvas-v2/Avatar.dc.html (same numbers, same output).
// Seed = the wallet address in the apps (never the username, so the avatar never changes). FNV-1a 32-bit hash +
// murmur3 finaliser → palette, pattern, rotation and accent. Same seed = same avatar on every device.

export interface AvatarShape {
  d: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  fillOpacity: number;
}

export interface AvatarSpec {
  /** Accessible label, "Avatar for @seed" */
  label: string;
  /** Background colour of the 40 × 40 viewBox */
  bg: string;
  /** Rotation of the shape group around the centre, in degrees */
  rotate: number;
  shapes: [AvatarShape, AvatarShape, AvatarShape];
}

const PALETTE: [string, string][] = [
  ['#F2EAFB', '#7B2FBE'], ['#E3EDFC', '#1D4ED8'], ['#E7F6EC', '#127A3A'], ['#FFF5E1', '#B45309'],
  ['#FDECEC', '#C2410C'], ['#E0F5F3', '#0F766E'], ['#EEEFFE', '#4F46E5'], ['#FCE7F3', '#BE185D'],
];

export function avatarHash(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

const circle = (cx: number, cy: number, r: number) =>
  `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;

type Partial3 = { p1: string; f1: string; s1?: string; w1?: number; p2: string; f2: string; p3: string; f3: string; o3: number };

export function avatarSpec(rawSeed: string): AvatarSpec {
  const seed = String(rawSeed).trim().toLowerCase();
  const h = avatarHash(seed);
  const ci = h % 8;
  const pi = (h >>> 3) % 6;
  const rotate = ((h >>> 6) % 4) * 90;
  let ai = (h >>> 8) % 7;
  if (ai >= ci) ai += 1;
  const [bg, fg] = PALETTE[ci];
  const ac = PALETTE[ai][1];
  const patterns: Partial3[] = [
    // sun and moon
    { p1: circle(26, 15, 10), f1: fg, p2: circle(12, 29, 5.5), f2: ac, p3: circle(31, 31, 2.5), f3: '#FFFFFF', o3: 0.9 },
    // hill and sun
    { p1: 'M-2 42L-2 27Q20 11 42 27L42 42Z', f1: fg, p2: circle(28, 12, 5), f2: ac, p3: 'M-2 42L-2 34Q20 24 42 34L42 42Z', f3: '#FFFFFF', o3: 0.35 },
    // two quarters
    { p1: 'M0 0H22A22 22 0 0 1 0 22Z', f1: fg, p2: 'M40 40H18A22 22 0 0 1 40 18Z', f2: ac, p3: circle(20, 20, 3.5), f3: '#FFFFFF', o3: 0.95 },
    // ring and dot
    { p1: circle(20, 20, 12), f1: 'none', s1: fg, w1: 5, p2: circle(20, 20, 4.5), f2: ac, p3: circle(33, 8, 3), f3: fg, o3: 0.6 },
    // half and bead
    { p1: 'M0 22H40V40H0Z', f1: fg, p2: circle(20, 22, 8), f2: ac, p3: circle(20, 22, 3), f3: '#FFFFFF', o3: 0.9 },
    // blocks
    { p1: 'M9 9h11v11h-11z', f1: fg, p2: 'M20 20h11v11h-11z', f2: ac, p3: circle(25.5, 14.5, 4.5), f3: fg, o3: 0.45 },
  ];
  const s = patterns[pi];
  return {
    label: `Avatar for @${seed}`,
    bg,
    rotate,
    shapes: [
      { d: s.p1, fill: s.f1, stroke: s.s1 ?? 'none', strokeWidth: s.w1 ?? 0, fillOpacity: 1 },
      { d: s.p2, fill: s.f2, stroke: 'none', strokeWidth: 0, fillOpacity: 1 },
      { d: s.p3, fill: s.f3, stroke: 'none', strokeWidth: 0, fillOpacity: s.o3 },
    ],
  };
}
