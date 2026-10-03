// Landing build (build-plan C5): copies src/ to dist/, fills the URLs and inlines the QR code of <landing>/m as SVG.
// LANDING_ORIGIN wins; on Vercel the project's production domain (VERCEL_PROJECT_PRODUCTION_URL) is the default, so
// the printed QR always points at this site's own /m redirect (site/vercel.json), which survives a host change.
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import QRCode from 'qrcode';

const strip = (u) => u.replace(/\/+$/, '');
const landing = strip(
  process.env.LANDING_ORIGIN ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:4174')
);
const workspace = strip(process.env.WORKSPACE_URL || 'https://unihackfest-2026.vercel.app');
const demo = `${landing}/m`;

const qr = await QRCode.toString(demo, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#111116', light: '#F4F4F6' } });

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await cp('src', 'dist', { recursive: true });
const html = (await readFile('src/index.html', 'utf8'))
  .replaceAll('{{WORKSPACE_URL}}', workspace)
  .replaceAll('{{DEMO_URL_SHORT}}', demo.replace(/^https?:\/\//, ''))
  .replace('{{QR_SVG}}', qr.replace('<svg ', '<svg aria-hidden="true" focusable="false" '));
if (/\{\{[A-Z_]+\}\}/.test(html)) throw new Error('An unfilled placeholder is left in index.html');
await writeFile('dist/index.html', html);
console.log(`landing built: QR → ${demo} · Workspace → ${workspace}`);
