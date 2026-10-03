import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { checkFile, fileProblem, formatSize, hashFile, MAX_FILE_BYTES, shortSha } from '../delivery.ts';

test('hashFile = SHA-256 of the bytes, read in slices with progress', async () => {
  const data = new Uint8Array(9 * 1024 * 1024 + 5).map((_, i) => i % 251);
  const seen: number[] = [];
  const sha = await hashFile(new Blob([data]), (p) => seen.push(p));
  assert.equal(sha, createHash('sha256').update(data).digest('hex'));
  assert.equal(seen.at(-1), 1);
  assert.ok(seen.length >= 2);
  assert.equal(await hashFile(new Blob([])), createHash('sha256').digest('hex'));
});

test('limits: 200 MB, 10 files, name length', () => {
  assert.match(fileProblem({ name: 'big.mov', size: MAX_FILE_BYTES + 1 }, [])!, /larger than 200 MB/);
  assert.equal(fileProblem({ name: 'ok.png', size: MAX_FILE_BYTES }, []), null);
  const ten = Array.from({ length: 10 }, (_, i) => ({ name: `${i}`, size: 1, sha256: 'a'.repeat(64) }));
  assert.match(fileProblem({ name: 'x', size: 1 }, ten)!, /up to 10 files/);
  assert.ok(fileProblem({ name: 'n'.repeat(201), size: 1 }, []));
});

test('checkFile: same fingerprint, same name with another fingerprint, or not listed', () => {
  const listed = [
    { name: 'landing-v1.fig', size: 10, sha256: 'a'.repeat(64) },
    { name: 'export.png', size: 10, sha256: 'b'.repeat(64) },
  ];
  assert.deepEqual(checkFile({ name: 'renamed.fig', sha256: 'A'.repeat(64) }, listed), { kind: 'same', index: 0 });
  assert.deepEqual(checkFile({ name: 'export.png', sha256: 'c'.repeat(64) }, listed), { kind: 'different', index: 1 });
  assert.deepEqual(checkFile({ name: 'other.txt', sha256: 'c'.repeat(64) }, listed), { kind: 'unknown' });
  assert.equal(shortSha('3f9a' + '0'.repeat(56) + 'c21e'), '3f9a…c21e');
  assert.equal(formatSize(4.2 * 1024 * 1024), '4.2 MB');
});
