// Delivery files and checks for /submit and /review (W4). Files never leave the computer: each one is read here and
// only its SHA-256 (crypto.subtle) goes into the delivery. Pure apart from reading the File, so it is tested in Node.
import { LIMITS } from '@ned/core/milestone/content.ts';

export const MAX_FILE_BYTES = 200 * 1024 * 1024;
/** Files above this show a progress bar while they are read */
export const PROGRESS_FROM_BYTES = 20 * 1024 * 1024;
const CHUNK = 8 * 1024 * 1024;

export interface FileFingerprint {
  name: string;
  size: number;
  /** 64 hex characters */
  sha256: string;
}

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

/** "3f9a…c21e" (the boards' short form of a file fingerprint) */
export const shortSha = (sha256: string) => `${sha256.slice(0, 4)}…${sha256.slice(-4)}`;

/** "4.2 MB", "820 KB", "12 B" */
export function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

/** Why a file cannot be added, or null */
export function fileProblem(file: { name: string; size: number }, already: FileFingerprint[]): string | null {
  if (file.size > MAX_FILE_BYTES) return `${file.name} is larger than 200 MB. Share it as a link instead.`;
  if ([...file.name].length > LIMITS.fileNameChars) return `The name of ${file.name.slice(0, 40)}… is too long.`;
  if (already.length >= LIMITS.files) return `Add up to ${LIMITS.files} files.`;
  return null;
}

/** SHA-256 of a file, read in 8 MB slices so big files can show progress (0–1); nothing is uploaded */
export async function hashFile(file: Blob & { name?: string }, onProgress?: (share: number) => void): Promise<string> {
  const bytes = new Uint8Array(file.size);
  for (let at = 0; at < file.size; at += CHUNK) {
    bytes.set(new Uint8Array(await file.slice(at, at + CHUNK).arrayBuffer()), at);
    onProgress?.(Math.min(1, (at + CHUNK) / file.size));
  }
  onProgress?.(1);
  return hex(await crypto.subtle.digest('SHA-256', bytes));
}

export type FileCheck = { kind: 'same'; index: number } | { kind: 'different'; index: number } | { kind: 'unknown' };

/**
 * A file dropped on the review page against the files listed in the delivery: same fingerprint → "Same file ✓" on
 * that row; same name but another fingerprint → "Different file" on that row; otherwise it is not in the delivery.
 */
export function checkFile(dropped: { name: string; sha256: string }, listed: FileFingerprint[]): FileCheck {
  const same = listed.findIndex((f) => f.sha256.toLowerCase() === dropped.sha256.toLowerCase());
  if (same >= 0) return { kind: 'same', index: same };
  const byName = listed.findIndex((f) => f.name === dropped.name);
  if (byName >= 0) return { kind: 'different', index: byName };
  return { kind: 'unknown' };
}
