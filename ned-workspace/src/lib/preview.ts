// Preview check and watermark tool (delivery-review-updates U6). Everything runs on this computer: the file is read
// here and never uploaded. N.E.D does not try to detect any watermark; it adds its own and checks for that marker:
// a PNG tEXt chunk "NED-Preview" = "v1 <fund>" or a JPEG COM segment "NED-Preview: v1 <fund>".
// The byte-level parts are pure (tested in Node); addWatermark needs a browser canvas.

export const SOURCE_EXTENSIONS = ['.svg', '.ai', '.eps', '.psd', '.fig', '.sketch', '.pdf'] as const;
/** A preview larger than this (long side, px) could be used as the final */
export const PREVIEW_MAX_LONG_SIDE = 1600;
/** Add watermark shrinks to this long side */
export const PREVIEW_LONG_SIDE = 1200;
export const MARKER_KEYWORD = 'NED-Preview';

export const MESSAGES = {
  source: 'This looks like a source file. Share a watermarked PNG or JPG preview instead, and keep the source for after release.',
  size: 'This preview is large enough to use as the final. Make a smaller preview (up to 1200 px).',
  watermark: 'No N.E.D watermark found. Add one before you share this preview.',
  unreadable: 'This file is not a PNG or JPG image N.E.D can read. Share a PNG or JPG preview.',
  driveFolder: 'This is a folder link. A folder can hold your final files; link the preview file itself.',
  unknownHost: "Make sure this link opens without signing in and doesn't allow editing.",
} as const;

export const OVERRIDE_LABEL = 'I added my own watermark and kept the resolution low.';

export const markerText = (fund: string) => `v1 ${fund}`;

// ---- formats and sizes ----

export function isSourceFormat(name: string): boolean {
  const n = name.toLowerCase();
  return SOURCE_EXTENSIONS.some((ext) => n.endsWith(ext));
}

const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
export const isPng = (b: Uint8Array) => b.length >= 8 && PNG_SIG.every((x, i) => b[i] === x);
export const isJpeg = (b: Uint8Array) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;

const u32 = (b: Uint8Array, at: number) => ((b[at] << 24) | (b[at + 1] << 16) | (b[at + 2] << 8) | b[at + 3]) >>> 0;
const u16 = (b: Uint8Array, at: number) => (b[at] << 8) | b[at + 1];

/** Width and height from the PNG IHDR or the JPEG SOF segment; null for anything else */
export function imageSize(b: Uint8Array): { width: number; height: number } | null {
  if (isPng(b) && b.length >= 24) return { width: u32(b, 16), height: u32(b, 20) };
  if (isJpeg(b)) {
    for (const seg of jpegSegments(b)) {
      // SOF0–SOF15 except DHT (C4), JPG (C8) and DAC (CC)
      if (seg.marker >= 0xc0 && seg.marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(seg.marker)) {
        return { height: u16(b, seg.at + 5), width: u16(b, seg.at + 7) };
      }
    }
  }
  return null;
}

// ---- PNG tEXt ----

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const x of bytes) c = CRC_TABLE[(c ^ x) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const latin1 = (s: string) => Uint8Array.from([...s].map((ch) => ch.charCodeAt(0) & 0xff));
const fromLatin1 = (b: Uint8Array) => String.fromCharCode(...b);

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out.set(latin1(type), 4);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

function* pngChunks(b: Uint8Array): Generator<{ type: string; at: number; length: number }> {
  for (let at = 8; at + 12 <= b.length; ) {
    const length = u32(b, at);
    const type = fromLatin1(b.subarray(at + 4, at + 8));
    yield { type, at, length };
    if (type === 'IEND') return;
    at += 12 + length;
  }
}

/** The fund named by the N.E.D marker of a PNG, or null */
export function readPngMarker(b: Uint8Array): string | null {
  if (!isPng(b)) return null;
  for (const c of pngChunks(b)) {
    if (c.type !== 'tEXt') continue;
    const data = b.subarray(c.at + 8, c.at + 8 + c.length);
    const zero = data.indexOf(0);
    if (zero < 0 || fromLatin1(data.subarray(0, zero)) !== MARKER_KEYWORD) continue;
    const m = /^v1 (\S+)$/.exec(fromLatin1(data.subarray(zero + 1)));
    if (m) return m[1];
  }
  return null;
}

/** A copy of the PNG with the marker tEXt chunk right after IHDR (an older N.E.D marker is dropped) */
export function writePngMarker(b: Uint8Array, fund: string): Uint8Array {
  if (!isPng(b)) throw new Error('Not a PNG');
  const parts: Uint8Array[] = [b.subarray(0, 8)];
  for (const c of pngChunks(b)) {
    const chunk = b.subarray(c.at, c.at + 12 + c.length);
    const data = b.subarray(c.at + 8, c.at + 8 + c.length);
    const ours = c.type === 'tEXt' && fromLatin1(data.subarray(0, Math.max(0, data.indexOf(0)))) === MARKER_KEYWORD;
    if (!ours) parts.push(chunk);
    if (c.type === 'IHDR') parts.push(pngChunk('tEXt', latin1(`${MARKER_KEYWORD}\0${markerText(fund)}`)));
  }
  return concat(parts);
}

// ---- JPEG COM ----

function* jpegSegments(b: Uint8Array): Generator<{ marker: number; at: number; length: number }> {
  for (let at = 2; at + 4 <= b.length; ) {
    if (b[at] !== 0xff) return;
    const marker = b[at + 1];
    if (marker === 0xd9 || marker === 0xda) return; // EOI / start of scan: no more headers
    const length = u16(b, at + 2);
    yield { marker, at, length };
    at += 2 + length;
  }
}

export function readJpegMarker(b: Uint8Array): string | null {
  if (!isJpeg(b)) return null;
  for (const s of jpegSegments(b)) {
    if (s.marker !== 0xfe) continue;
    const m = /^NED-Preview: v1 (\S+)$/.exec(fromLatin1(b.subarray(s.at + 4, s.at + 2 + s.length)));
    if (m) return m[1];
  }
  return null;
}

export function writeJpegMarker(b: Uint8Array, fund: string): Uint8Array {
  if (!isJpeg(b)) throw new Error('Not a JPEG');
  const text = latin1(`${MARKER_KEYWORD}: ${markerText(fund)}`);
  const com = new Uint8Array(4 + text.length);
  com.set([0xff, 0xfe, (text.length + 2) >> 8, (text.length + 2) & 0xff]);
  com.set(text, 4);
  return concat([b.subarray(0, 2), com, b.subarray(2)]);
}

/** The fund named by any N.E.D marker in a PNG or JPEG */
export const readMarker = (b: Uint8Array) => readPngMarker(b) ?? readJpegMarker(b);

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

// ---- the three design checks ----

export type PreviewProblem = 'source' | 'size' | 'watermark' | 'unreadable';
export interface PreviewCheck {
  problems: PreviewProblem[];
  size: { width: number; height: number } | null;
  /** The marker names this contract */
  marked: boolean;
}

/** U6: source format, resolution, and the N.E.D marker for this contract */
export function checkPreview(name: string, bytes: Uint8Array, fund: string): PreviewCheck {
  if (isSourceFormat(name)) return { problems: ['source'], size: null, marked: false };
  const size = imageSize(bytes);
  if (!size) return { problems: ['unreadable'], size: null, marked: false };
  const problems: PreviewProblem[] = [];
  if (Math.max(size.width, size.height) > PREVIEW_MAX_LONG_SIDE) problems.push('size');
  const marked = readMarker(bytes) === fund;
  if (!marked) problems.push('watermark');
  return { problems, size, marked };
}

/** "logo final.PNG" → "logo final-preview.png" */
export const previewName = (name: string) => `${name.replace(/\.[^.]+$/, '')}-preview.png`;

// ---- link checks (no network calls) ----

const KNOWN_HOSTS = [
  'drive.google.com',
  'docs.google.com',
  'figma.com',
  'youtube.com',
  'youtu.be',
  'loom.com',
  'github.com',
  'gitlab.com',
  'vercel.app',
  'netlify.app',
  'pages.dev',
  'github.io',
];

/** The U6 message for a link, or null. Non-https links are refused earlier by the existing rule */
export function linkWarning(link: string): { tone: 'warning' | 'info'; message: string } | null {
  let url: URL;
  try {
    url = new URL(link.trim());
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  if (host === 'drive.google.com' && url.pathname.includes('/drive/folders/')) return { tone: 'warning', message: MESSAGES.driveFolder };
  if (KNOWN_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return null;
  return { tone: 'info', message: MESSAGES.unknownHost };
}

// ---- Add watermark (browser only) ----

/**
 * The image shrunk so its long side is 1200 px (never enlarged), the text "PREVIEW · {title} · not for use" tiled
 * diagonally at 18 % opacity, a corner badge "N.E.D preview", saved as PNG with the marker for this contract.
 */
export async function addWatermark(file: Blob, title: string, fund: string): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, PREVIEW_LONG_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available in this browser.');
  ctx.drawImage(bitmap, 0, 0, width, height);

  const text = `PREVIEW · ${title} · not for use`;
  const font = Math.max(16, Math.round(Math.max(width, height) / 32));
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#111116';
  ctx.font = `700 ${font}px Inter, system-ui, sans-serif`;
  ctx.translate(width / 2, height / 2);
  ctx.rotate(-Math.PI / 6);
  const step = ctx.measureText(text).width + font * 2;
  const reach = Math.hypot(width, height);
  for (let y = -reach; y <= reach; y += font * 4) {
    const offset = (Math.round(y / (font * 4)) % 2) * (step / 2);
    for (let x = -reach - offset; x <= reach; x += step) ctx.fillText(text, x, y);
  }
  ctx.restore();

  const badge = 'N.E.D preview';
  const bf = Math.max(12, Math.round(font * 0.7));
  ctx.font = `700 ${bf}px Inter, system-ui, sans-serif`;
  const bw = ctx.measureText(badge).width + bf * 1.6;
  const bh = bf * 2;
  const pad = Math.round(bf * 0.8);
  ctx.fillStyle = 'rgba(123, 47, 190, 0.92)';
  ctx.beginPath();
  ctx.roundRect(width - bw - pad, height - bh - pad, bw, bh, bh / 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.fillText(badge, width - bw - pad + bf * 0.8, height - pad - bh / 2);

  const png = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not make the preview.'))), 'image/png'));
  const marked = writePngMarker(new Uint8Array(await png.arrayBuffer()), fund);
  return new Blob([marked as BlobPart], { type: 'image/png' });
}
