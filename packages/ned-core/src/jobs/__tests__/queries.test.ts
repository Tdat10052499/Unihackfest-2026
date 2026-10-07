import { test } from 'node:test';
import assert from 'node:assert/strict';
import bs58 from 'bs58';
import { PublicKey } from '@solana/web3.js';
import { IDL_PROGRAM_ID } from '../../constants.ts';
import { JOB_APPLICATION_DISCRIMINATOR, JOB_LISTING_DISCRIMINATOR } from '../decode.ts';
import { getApplication, getJob, jobForFund, listApplicants, listMyApplications, listMyJobs, listOpenJobs } from '../queries.ts';
import { applicationBytes, BUSINESS, FREELANCER, FUND_ADDRESS, jobBytes, JOB_ADDRESS, T0 } from './fixture.ts';

const LISTING = [{ dataSize: 576 }, { memcmp: { offset: 0, bytes: bs58.encode(JOB_LISTING_DISCRIMINATOR) } }];
const APPLICATION = [{ dataSize: 364 }, { memcmp: { offset: 0, bytes: bs58.encode(JOB_APPLICATION_DISCRIMINATOR) } }];

function mock(accounts: { pubkey: PublicKey; account: { data: Uint8Array } }[]) {
  const calls: { programId: string; filters: unknown[] }[] = [];
  return {
    calls,
    conn: {
      getProgramAccounts: async (programId: PublicKey, config: any) => {
        calls.push({ programId: programId.toBase58(), filters: config.filters });
        return accounts;
      },
    } as never,
  };
}

test('listOpenJobs: discriminator, state Open at 9, and category at 42 when given; newest first; bad accounts skipped', async () => {
  const older = { pubkey: PublicKey.unique(), account: { data: jobBytes({ createdAt: T0 }) } };
  const newer = { pubkey: PublicKey.unique(), account: { data: jobBytes({ createdAt: T0 + 10 }) } };
  const junk = { pubkey: PublicKey.unique(), account: { data: new Uint8Array(576) } };
  const { calls, conn } = mock([older, newer, junk]);
  const all = await listOpenJobs({}, conn);
  await listOpenJobs({ category: 3 }, conn);
  assert.deepEqual(all.map((j) => j.address.toBase58()), [newer.pubkey.toBase58(), older.pubkey.toBase58()]);
  assert.equal(calls[0].programId, IDL_PROGRAM_ID.toBase58());
  assert.deepEqual(calls[0].filters, [...LISTING, { memcmp: { offset: 9, bytes: bs58.encode([0]) } }]);
  assert.deepEqual(calls[1].filters, [...LISTING, { memcmp: { offset: 9, bytes: bs58.encode([0]) } }, { memcmp: { offset: 42, bytes: bs58.encode([3]) } }]);
});

test('listMyJobs filters the business at 10', async () => {
  const { calls, conn } = mock([]);
  await listMyJobs(BUSINESS, conn);
  assert.deepEqual(calls[0].filters, [...LISTING, { memcmp: { offset: 10, bytes: BUSINESS.toBase58() } }]);
});

test('jobForFund filters the fund at 508 and returns the listing or null', async () => {
  const { calls, conn } = mock([{ pubkey: JOB_ADDRESS, account: { data: jobBytes({ state: 'Selected', fund: FUND_ADDRESS }) } }]);
  const found = await jobForFund(FUND_ADDRESS, conn);
  assert.ok(found?.address.equals(JOB_ADDRESS));
  assert.deepEqual(calls[0].filters, [...LISTING, { memcmp: { offset: 508, bytes: FUND_ADDRESS.toBase58() } }]);
  assert.equal(await jobForFund(FUND_ADDRESS, mock([]).conn), null);
});

test('listApplicants filters the job at 9; listMyApplications the freelancer at 41', async () => {
  const { calls, conn } = mock([{ pubkey: PublicKey.unique(), account: { data: applicationBytes() } }]);
  const apps = await listApplicants(JOB_ADDRESS.toBase58(), conn);
  await listMyApplications(FREELANCER, conn);
  assert.equal(apps.length, 1);
  assert.equal(apps[0].pitch, 'I design logos for cafés.');
  assert.deepEqual(calls[0].filters, [...APPLICATION, { memcmp: { offset: 9, bytes: JOB_ADDRESS.toBase58() } }]);
  assert.deepEqual(calls[1].filters, [...APPLICATION, { memcmp: { offset: 41, bytes: FREELANCER.toBase58() } }]);
});

test('getJob and getApplication return null for a missing or foreign account', async () => {
  const conn = (info: unknown) => ({ getAccountInfo: async () => info }) as never;
  assert.equal(await getJob(JOB_ADDRESS, conn(null)), null);
  assert.equal(await getJob(JOB_ADDRESS, conn({ owner: PublicKey.default, data: jobBytes() })), null);
  assert.equal((await getJob(JOB_ADDRESS.toBase58(), conn({ owner: IDL_PROGRAM_ID, data: jobBytes() })))?.state, 'Open');
  assert.equal(await getApplication(JOB_ADDRESS, FREELANCER, conn(null)), null);
  assert.ok((await getApplication(JOB_ADDRESS, FREELANCER, conn({ owner: IDL_PROGRAM_ID, data: applicationBytes() })))?.freelancer.equals(FREELANCER));
});

test('listOpenJobs fundedOnly adds unfunded == 0 at 544; off by default', async () => {
  const { calls, conn } = mock([]);
  await listOpenJobs({ fundedOnly: true }, conn);
  await listOpenJobs({ category: 2, fundedOnly: true }, conn);
  await listOpenJobs({ fundedOnly: false }, conn);
  const state = { memcmp: { offset: 9, bytes: bs58.encode([0]) } };
  const funded = { memcmp: { offset: 544, bytes: bs58.encode([0]) } };
  assert.deepEqual(calls[0].filters, [...LISTING, state, funded]);
  assert.deepEqual(calls[1].filters, [...LISTING, state, { memcmp: { offset: 42, bytes: bs58.encode([2]) } }, funded]);
  assert.deepEqual(calls[2].filters, [...LISTING, state]);
});
