import { test } from 'node:test';
import assert from 'node:assert/strict';
import bs58 from 'bs58';
import { PublicKey } from '@solana/web3.js';
import { PROGRAM_ID } from '../../../constants/chain.ts';
import { FUND_DISCRIMINATOR } from '../decode.ts';
import { getChainNow, getFund, listFunds } from '../queries.ts';
import { CLIENT, FREELANCER, fundBytes, FUND_ADDRESS, M, T0 } from './fixture.ts';

test('listFunds filters by size 708, discriminator at 0 and the wallet at 12 (client) or 44 (freelancer)', async () => {
  const calls: any[] = [];
  const older = fundBytes({ milestones: [M()] });
  const conn = {
    getProgramAccounts: async (programId: PublicKey, config: any) => {
      calls.push([programId.toBase58(), config]);
      return [
        { pubkey: FUND_ADDRESS, account: { data: older } },
        { pubkey: PublicKey.default, account: { data: new Uint8Array(708) } }, // not a SharedFund: skipped
      ];
    },
  };
  const asClient = await listFunds(CLIENT, 'client', conn as never);
  await listFunds(FREELANCER.toBase58(), 'freelancer', conn as never);
  assert.equal(asClient.length, 1);
  assert.ok(asClient[0].address.equals(FUND_ADDRESS));
  assert.equal(calls[0][0], PROGRAM_ID.toBase58());
  assert.deepEqual(calls[0][1].filters, [
    { dataSize: 708 },
    { memcmp: { offset: 0, bytes: bs58.encode(FUND_DISCRIMINATOR) } },
    { memcmp: { offset: 12, bytes: CLIENT.toBase58() } },
  ]);
  assert.deepEqual(calls[1][1].filters[2], { memcmp: { offset: 44, bytes: FREELANCER.toBase58() } });
});

test('getFund returns null for a missing or foreign account', async () => {
  const data = fundBytes({ milestones: [M()] });
  const conn = (info: unknown) => ({ getAccountInfo: async () => info });
  assert.equal(await getFund(FUND_ADDRESS, conn(null) as never), null);
  assert.equal(await getFund(FUND_ADDRESS, conn({ owner: PublicKey.default, data }) as never), null);
  assert.equal((await getFund(FUND_ADDRESS.toBase58(), conn({ owner: PROGRAM_ID, data }) as never))?.milestoneCount, 1);
});

test('getChainNow uses the latest slot block time, else the device clock', async () => {
  assert.equal(await getChainNow({ getSlot: async () => 7, getBlockTime: async (s: number) => (s === 7 ? T0 : null) } as never), T0);
  const now = Math.floor(Date.now() / 1000);
  const fallback = await getChainNow({ getSlot: async () => 7, getBlockTime: async () => null } as never);
  assert.ok(Math.abs(fallback - now) <= 1);
});
