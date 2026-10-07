// U6 preview checks on small fixture images built here (PNG with zlib, a minimal JPEG header).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jpeg, png } from './images.ts';
import {
  checkPreview,
  crc32,
  imageSize,
  isSourceFormat,
  linkWarning,
  MESSAGES,
  previewName,
  readJpegMarker,
  readMarker,
  readPngMarker,
  writeJpegMarker,
  writePngMarker,
} from '../preview.ts';

const FUND = 'BvTzebz2UdPhPRAuyFynEQQXWM8yDZMCZxc5aH192E9Y';

test('source formats are refused by name', () => {
  for (const n of ['logo.svg', 'Logo.AI', 'a.eps', 'b.psd', 'c.fig', 'd.sketch', 'brand.pdf']) assert.equal(isSourceFormat(n), true, n);
  for (const n of ['logo.png', 'logo.jpg', 'svg-notes.txt']) assert.equal(isSourceFormat(n), false, n);
  assert.deepEqual(checkPreview('logo.svg', new Uint8Array(), FUND).problems, ['source']);
});

test('image size from PNG IHDR and JPEG SOF', () => {
  assert.deepEqual(imageSize(png(40, 30)), { width: 40, height: 30 });
  assert.deepEqual(imageSize(jpeg(2400, 1600)), { width: 2400, height: 1600 });
  assert.equal(imageSize(new Uint8Array([1, 2, 3])), null);
});

test('PNG tEXt marker: write, read, replace; the PNG stays valid (CRC checked)', () => {
  const plain = png(20, 10);
  assert.equal(readPngMarker(plain), null);
  const marked = writePngMarker(plain, FUND);
  assert.equal(readPngMarker(marked), FUND);
  assert.equal(readMarker(marked), FUND);
  assert.deepEqual(imageSize(marked), { width: 20, height: 10 });
  // every chunk CRC is right
  const b = Buffer.from(marked);
  for (let at = 8; at < b.length; ) {
    const len = b.readUInt32BE(at);
    assert.equal(b.readUInt32BE(at + 8 + len), crc32(b.subarray(at + 4, at + 8 + len)));
    at += 12 + len;
  }
  const other = 'O'.repeat(FUND.length);
  const again = writePngMarker(marked, other);
  assert.equal(readPngMarker(again), other);
  assert.equal(again.length, marked.length, 'the old marker is replaced, not added');
});

test('JPEG COM marker: write and read', () => {
  const plain = jpeg(800, 600);
  assert.equal(readJpegMarker(plain), null);
  const marked = writeJpegMarker(plain, FUND);
  assert.equal(readJpegMarker(marked), FUND);
  assert.deepEqual(imageSize(marked), { width: 800, height: 600 });
});

test('the three design checks with the exact U6 messages', () => {
  assert.deepEqual(checkPreview('big.png', png(2000, 1200), FUND).problems, ['size', 'watermark']);
  assert.deepEqual(checkPreview('small.png', png(1200, 800), FUND).problems, ['watermark']);
  assert.deepEqual(checkPreview('ok.png', writePngMarker(png(1200, 800), FUND), FUND), { problems: [], size: { width: 1200, height: 800 }, marked: true });
  assert.deepEqual(checkPreview('other.png', writePngMarker(png(100, 100), 'AnotherFund'), FUND).problems, ['watermark'], 'a marker for another contract does not count');
  assert.deepEqual(checkPreview('ok.jpg', writeJpegMarker(jpeg(900, 600), FUND), FUND).problems, []);
  assert.deepEqual(checkPreview('notes.txt', new TextEncoder().encode('hello'), FUND).problems, ['unreadable']);
  assert.equal(MESSAGES.size, 'This preview is large enough to use as the final. Make a smaller preview (up to 1200 px).');
  assert.equal(previewName('logo final.PNG'), 'logo final-preview.png');
});

test('link checks: Drive folder, unknown host, known hosts; no network', () => {
  assert.equal(linkWarning('https://drive.google.com/drive/folders/abc')?.message, MESSAGES.driveFolder);
  assert.equal(linkWarning('https://drive.google.com/file/d/abc/view'), null);
  for (const ok of ['https://docs.google.com/document/d/x', 'https://www.figma.com/file/x', 'https://youtu.be/x', 'https://www.loom.com/share/x', 'https://demo.vercel.app']) assert.equal(linkWarning(ok), null, ok);
  assert.deepEqual(linkWarning('https://example.com/portfolio'), { tone: 'info', message: MESSAGES.unknownHost });
});
