/**
 * Funded Jobs end-to-end on devnet with ONE Google login (S6 "done when"): this script plays the business with the
 * throwaway key in ned-wallet/.smoke-keys/business.json (the same key as jobs:smoke); the PO plays the freelancer in the
 * Workspace (apply on /jobs/:job, accept in the wallet panel). It calls the same @ned/core actions as the Workspace
 * pages: runPostJob, runSelectJob, runWithdrawJob.
 *
 *   npm run jobs:e2e -- post                 # job A: 1 milestone, 0.05 USDC; prints the link to apply
 *   npm run jobs:e2e -- wait-apply <job>     # waits for an application, prints the applicant
 *   npm run jobs:e2e -- select <job> [wallet]  # create_fund + select_job for the (first) applicant
 *   npm run jobs:e2e -- wait-accept <job>    # waits until the listing is Filled and the contract Funded
 *   npm run jobs:e2e -- withdraw-demo        # job B: post 0.05 USDC, then withdraw it at once (no applicants)
 *
 * Contract keys made by `select` are kept in ned-wallet/.smoke-keys/content-keys.json (gitignored), never printed.
 */
import fs from 'fs';
import path from 'path';
import { Keypair, type Transaction } from '@solana/web3.js';
import type { ActionEnv } from '@ned/core/actions.ts';
import { configureCore, DEFAULT_WORKSPACE_ORIGIN } from '@ned/core/config.ts';
import { runPostJob, runSelectJob, runWithdrawJob } from '@ned/core/jobs/actions.ts';
import type { JobDraft } from '@ned/core/jobs/rules.ts';
import { getJob, listApplicants } from '@ned/core/jobs/queries.ts';
import type { KeyStorage } from '@ned/core/milestone/keys.ts';
import { getChainNow, getFund } from '@ned/core/milestone/queries.ts';

const keysDir = path.join(__dirname, '..', '.smoke-keys');
const DAY = 86_400;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const explorer = (a: string) => `https://explorer.solana.com/address/${a}?cluster=devnet`;
const site = (process.env.JOBS_ORIGIN || DEFAULT_WORKSPACE_ORIGIN).replace(/\/+$/, '');

function rpcUrl(): string {
  try {
    const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
    const value = env.split('\n').find((l) => l.startsWith('EXPO_PUBLIC_HELIUS_DEVNET_URL='))?.split('=').slice(1).join('=').replace(/"/g, '').trim();
    if (value) return value;
  } catch {}
  return 'https://api.devnet.solana.com';
}

function business(): Keypair {
  const file = path.join(keysDir, 'business.json');
  if (!fs.existsSync(file)) throw new Error('Run npm run jobs:smoke first: it creates the throwaway business key.');
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(file, 'utf8'))));
}

/** File-backed key storage (gitignored folder), so the contract key made at select survives between runs */
function fileKeys(): KeyStorage {
  const file = path.join(keysDir, 'content-keys.json');
  const read = (): Record<string, string> => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {});
  return {
    getItem: async (k) => read()[k] ?? null,
    setItem: async (k, v) => {
      const all = read();
      all[k] = v;
      fs.writeFileSync(file, JSON.stringify(all), { mode: 0o600 });
    },
  };
}

function env(kp: Keypair): ActionEnv {
  return {
    signer: {
      walletAddress: kp.publicKey.toBase58(),
      signTransaction: async (tx: Transaction) => {
        tx.partialSign(kp);
        return tx;
      },
    },
    now: () => getChainNow(),
    onStatus: (s) => process.stdout.write(`  · ${s}\n`),
    keys: fileKeys(),
  };
}

function draft(title: string, now: number): JobDraft {
  return {
    title,
    summary: 'End-to-end test of Funded Jobs on devnet: one small milestone.',
    category: 0,
    skills: [0, 3],
    milestones: [{ amountUsdc: '0.05', workSecs: DAY, reviewSecs: DAY }],
    brief: {
      scope: 'Make a simple logo sketch and share a link to it. Devnet test, no real work needed.',
      references: [],
      milestones: [{ name: 'Logo sketch', criteria: ['One sketch shared as a link'] }],
    },
    applyBy: now + 3 * DAY,
    selectBy: now + 3 * DAY,
  };
}

async function main() {
  configureCore({ rpcUrl: rpcUrl() });
  const [cmd, a1, a2] = process.argv.slice(2);
  const kp = business();
  const e = env(kp);
  console.log(`business ${kp.publicKey.toBase58()}`);

  if (cmd === 'post') {
    const r = await runPostJob(e, draft('E2E job · apply here', await getChainNow()), 'intl');
    console.log(`✅ posted ${r.job}\n  apply: ${site}/jobs/${r.job}\n  ${explorer(r.job)}`);
    return;
  }
  if (cmd === 'wait-apply') {
    for (;;) {
      const apps = await listApplicants(a1);
      if (apps.length) {
        apps.forEach((x) => console.log(`✅ applicant ${x.freelancer.toBase58()} · "${x.pitch}"`));
        return;
      }
      process.stdout.write('  waiting for an application…\r');
      await sleep(5_000);
    }
  }
  if (cmd === 'select') {
    const who = a2 ?? (await listApplicants(a1))[0]?.freelancer.toBase58();
    if (!who) throw new Error('No applicant yet.');
    const r = await runSelectJob(e, a1, who);
    console.log(`✅ selected ${who}\n  contract ${r.fund}  ${explorer(r.fund)}\n  key wraps sent: ${r.keySignatures.length}`);
    return;
  }
  if (cmd === 'wait-accept') {
    for (;;) {
      const job = await getJob(a1);
      if (!job) throw new Error('Job not found');
      const fund = job.fund ? await getFund(job.fund) : null;
      if (job.state === 'Filled') {
        console.log(`✅ listing Filled · contract ${job.fund?.toBase58()} is ${fund?.state ?? 'closed'}`);
        return;
      }
      process.stdout.write(`  listing ${job.state} · contract ${fund?.state ?? '-'} · waiting for accept…\r`);
      await sleep(5_000);
    }
  }
  if (cmd === 'withdraw-demo') {
    const r = await runPostJob(e, draft('E2E job · withdraw', await getChainNow()), 'intl');
    console.log(`✅ posted ${r.job}`);
    const w = await runWithdrawJob(e, r.job);
    const job = await getJob(r.job);
    console.log(`✅ withdrawn ${w.signature} · listing ${job?.state}\n  ${explorer(r.job)}`);
    return;
  }
  console.log('Usage: jobs:e2e -- post | wait-apply <job> | select <job> [wallet] | wait-accept <job> | withdraw-demo');
}

main().catch((err) => {
  console.error(`🔴 ${err?.message ?? err}`);
  process.exit(1);
});

