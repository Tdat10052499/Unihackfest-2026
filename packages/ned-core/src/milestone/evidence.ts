// v1 delivery evidence (SHA-256 of one link). B1 replaced it by content.ts deliveryEvidence (canonical delivery JSON);
// evidenceHash stays only for showing funds submitted before B1. shortHash is shared.
import { sha256 } from '@noble/hashes/sha2.js';

const encoder = new TextEncoder();
const hex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

/** Normalise by trimming only (no lower-casing: URLs can be case-sensitive). */
export function evidenceHash(link: string): Uint8Array {
  return sha256(encoder.encode(link.trim()));
}

export function matchesEvidence(link: string, hash: Uint8Array): boolean {
  const mine = evidenceHash(link);
  return mine.length === hash.length && mine.every((b, i) => b === hash[i]);
}

/** "3f8a1c…09be"; empty string for an all-zero hash (no evidence yet) */
export function shortHash(hash: Uint8Array): string {
  if (hash.every((b) => b === 0)) return '';
  const h = hex(hash);
  return `${h.slice(0, 6)}…${h.slice(-4)}`;
}

export { hex as toHex };
