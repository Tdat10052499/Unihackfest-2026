/**
 * Read-only chain state for the D1 end-to-end runs (build-plan D1): no keypair, no transaction.
 *
 *   npm run milestone:status -- <fund address>     # one contract: state, parties, milestones, vault, notes
 *   npm run milestone:status -- <wallet address>   # every open contract of that wallet, plus its SOL and USDC
 *
 * Never prints a contract key: notes are only counted, not decrypted.
 */
/* eslint-disable import/first */
import { config } from 'dotenv';
config({ path: '.env', quiet: true });
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { DEMO_PAYOUT_PARTNER } from '../constants/chain';
import { connection } from '../services/chain/connection';
import { fetchUsdcUnits } from '../services/chain/balance';
import type { FundAccount } from '../services/milestone/decode';
import { shortHash } from '../services/milestone/evidence';
import { formatUsdc } from '../services/milestone/format';
import { fetchNotes, NOTE_KIND_BRIEF, NOTE_KIND_DELIVERY } from '../services/milestone/notes';
import { vaultPda } from '../services/milestone/pda';
import { fetchDeviceKeys } from '@ned/core/milestone/devicekeys.ts';
import { getChainNow, getFund, listFunds } from '../services/milestone/queries';

const short = (a: string | PublicKey) => `${String(a).slice(0, 4)}…${String(a).slice(-4)}`;
const when = (t: number) => (t ? new Date(t * 1000).toISOString().replace('T', ' ').slice(0, 19) + ' UTC' : '—');

async function vaultUnits(fund: PublicKey): Promise<bigint> {
  const info = await connection.getTokenAccountBalance(vaultPda(fund), 'confirmed').catch(() => null);
  return BigInt(info?.value.amount ?? '0');
}

async function showFund(f: FundAccount, now: number) {
  const address = f.address.toBase58();
  const notes = await fetchNotes(f.address, connection).catch(() => []);
  const briefParts = notes.filter((n) => n.kind === NOTE_KIND_BRIEF).length;
  const deliveryParts = notes.filter((n) => n.kind === NOTE_KIND_DELIVERY).length;
  const dest = f.payoutKind === 'PayoutPartner' ? `payout partner${f.payoutDestination.equals(DEMO_PAYOUT_PARTNER) ? ' (DEMO_PAYOUT_PARTNER)' : ` ${short(f.payoutDestination)}`}` : f.payoutKind === 'OwnWallet' ? `own wallet ${short(f.payoutDestination)}` : 'not chosen yet';
  console.log(`\nContract ${address}  "${f.title}"`);
  console.log(`  state ${f.state} · client ${short(f.client)} · freelancer ${short(f.freelancer)} · destination ${dest}`);
  console.log(`  total ${formatUsdc(f.total)} · released ${formatUsdc(f.released)} · refunded ${formatUsdc(f.refunded)} · vault ${formatUsdc(await vaultUnits(f.address))}`);
  const keyParts = notes.filter((n) => n.kind === 2).length;
  console.log(`  brief fingerprint ${shortHash(f.briefHash)} · brief note parts ${briefParts} · delivery note parts ${deliveryParts} · key note parts ${keyParts} · created ${when(f.createdAt)}`);
  for (const m of f.milestones) {
    const late = m.submittedAt > m.submitBy ? ' LATE' : '';
    const flag = m.status === 'Pending' && now > m.submitBy ? ' (deadline passed: refund possible)' : m.status === 'Submitted' && now > m.reviewBy ? ' (review over: anyone can release)' : '';
    console.log(
      `  · milestone ${m.index + 1}: ${m.status}${flag} · ${formatUsdc(m.amount)} · submit by ${when(m.submitBy)} · review by ${when(m.reviewBy)}` +
        (m.submittedAt ? ` · submitted ${when(m.submittedAt)}${late} · evidence ${shortHash(m.evidence)}` : '')
    );
  }
  console.log(`  explorer https://explorer.solana.com/address/${address}?cluster=devnet`);
}

async function main() {
  const arg = process.argv[2];
  if (!arg) throw new Error('Usage: npm run milestone:status -- <fund or wallet address>');
  const key = new PublicKey(arg);
  const now = await getChainNow();
  console.log(`chain time ${when(now)}`);
  const fund = await getFund(key, connection);
  if (fund) return showFund(fund, now);
  // Not a wallet key (a PDA, e.g. a closed contract): say so instead of failing on the USDC account lookup
  if (!PublicKey.isOnCurve(key.toBytes())) {
    const sigs = await connection.getSignaturesForAddress(key, { limit: 1 }, 'confirmed');
    console.log(sigs.length ? `Contract ${arg} is closed (account gone; last transaction ${sigs[0].signature.slice(0, 12)}…).` : `No account and no history at ${arg}.`);
    return;
  }
  const [lamports, usdc] = await Promise.all([connection.getBalance(key, 'confirmed'), fetchUsdcUnits(connection, key)]);
  const devices = (await fetchDeviceKeys([key], connection)).get(arg)?.length ?? 0;
  console.log(`Wallet ${arg}: ${(lamports / LAMPORTS_PER_SOL).toFixed(4)} SOL · ${formatUsdc(usdc)} · registered devices ${devices}`);
  const funds = [...(await listFunds(key, 'client', connection)), ...(await listFunds(key, 'freelancer', connection))];
  if (!funds.length) console.log('No open contracts (closed contracts are not listed).');
  for (const f of funds) await showFund(f, now);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
