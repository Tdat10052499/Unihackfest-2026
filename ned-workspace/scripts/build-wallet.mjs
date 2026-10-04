// Builds the mobile app (ned-wallet) for the web with base URL /wallet into dist/wallet, so the Workspace serves it
// on its own origin for the wallet extension (workspace-plan W6, decision D23). On Vercel the EXPO_PUBLIC_* values
// come from the Workspace's VITE_* variables (same Dynamic environment, same RPC); locally ned-wallet/.env is used.
// GitHub Pages (`npm run deploy` in ned-wallet) is not affected.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const wallet = resolve(here, '../../ned-wallet');
const out = resolve(here, '../dist/wallet');
const env = { ...process.env, EXPO_BASE_URL: '/wallet', CI: '1' };
const map = {
  VITE_DYNAMIC_ENVIRONMENT_ID: 'EXPO_PUBLIC_DYNAMIC_ENVIRONMENT_ID',
  VITE_HELIUS_DEVNET_URL: 'EXPO_PUBLIC_HELIUS_DEVNET_URL',
  VITE_PROGRAM_ID: 'EXPO_PUBLIC_ANCHOR_PROGRAM_ID',
  VITE_MOBILE_ORIGIN: 'EXPO_PUBLIC_MOBILE_ORIGIN',
  VITE_WORKSPACE_ORIGIN: 'EXPO_PUBLIC_WORKSPACE_ORIGIN',
};
for (const [from, to] of Object.entries(map)) if (process.env[from] && !process.env[to]) env[to] = process.env[from];
// Never ship the dev tools inside the Workspace
delete env.EXPO_PUBLIC_DEV_TOOLS;

if (!existsSync(resolve(here, '../dist/index.html'))) throw new Error('Build the Workspace first (vite build writes dist/)');
const started = Date.now();
const r = spawnSync('npx', ['expo', 'export', '--platform', 'web', '--output-dir', out], { cwd: wallet, env, stdio: 'inherit' });
if (r.status !== 0) process.exit(r.status ?? 1);
console.log(`wallet extension build: dist/wallet in ${Math.round((Date.now() - started) / 1000)} s`);
