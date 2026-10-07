import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Keypair, PublicKey } from '@solana/web3.js';
import { USDC_DEVNET_MINT } from '../../constants.ts';
import { decodeJobApplication, decodeJobListing } from '../decode.ts';
import { jobAppPda, jobPda, jobVaultPda } from '../pda.ts';
import { IDL_PROGRAM_ID } from '../../constants.ts';
import { application, applicationBytes, BRIEF_HASH, BUSINESS, FREELANCER, FUND_ADDRESS, job, jobBytes, JOB_ADDRESS, T0, USDC } from './fixture.ts';

test('decodeJobListing reads every field of the 576-byte layout', () => {
  const j = job({
    state: 'Selected',
    category: 5,
    skills: (1n << 63n) | 2n,
    jobId: 0x0102030405060708n,
    milestones: [
      { amount: 3n * USDC, workSecs: 700, reviewSecs: 130 },
      { amount: 4n * USDC, workSecs: 800, reviewSecs: 140 },
    ],
    selected: FREELANCER,
    selectedAt: T0 + 400,
    fund: FUND_ADDRESS,
    applicationCount: 513,
  });
  assert.equal(j.version, 1);
  assert.equal(j.state, 'Selected');
  assert.ok(j.business.equals(BUSINESS));
  assert.equal(j.category, 5);
  assert.equal(j.skills, (1n << 63n) | 2n);
  assert.ok(j.mint.equals(USDC_DEVNET_MINT));
  assert.equal(j.jobId, 0x0102030405060708n);
  assert.equal(j.createdAt, T0);
  assert.equal(j.applyBy, T0 + 3 * 86_400);
  assert.equal(j.selectBy, T0 + 5 * 86_400);
  assert.equal(j.total, 7n * USDC);
  assert.equal(j.milestoneCount, 2);
  assert.deepEqual(j.milestones, [
    { index: 0, amount: 3n * USDC, workSecs: 700, reviewSecs: 130 },
    { index: 1, amount: 4n * USDC, workSecs: 800, reviewSecs: 140 },
  ]);
  assert.equal(j.title, 'Logo for a café');
  assert.equal(j.summary, 'A simple logo and two colour variants.');
  assert.deepEqual(j.briefHash, BRIEF_HASH);
  assert.ok(j.selected?.equals(FREELANCER));
  assert.equal(j.selectedAt, T0 + 400);
  assert.ok(j.fund?.equals(FUND_ADDRESS));
  assert.equal(j.applicationCount, 513);
  assert.equal(j.bump, 254);
  assert.equal(j.vaultBump, 253);
});

test('an open listing has no selected wallet and no fund', () => {
  const j = job();
  assert.equal(j.selected, null);
  assert.equal(j.fund, null);
  assert.equal(j.milestones.length, 1);
});

test('decodeJobListing refuses another size or discriminator', () => {
  assert.throws(() => decodeJobListing(JOB_ADDRESS, new Uint8Array(575)), /576/);
  const wrong = jobBytes();
  wrong[0] ^= 0xff;
  assert.throws(() => decodeJobListing(JOB_ADDRESS, wrong));
});

test('decodeJobApplication reads the 364-byte layout and only pitch_len bytes of the pitch', () => {
  const a = application({ pitch: 'Xin chào, I design logos.' });
  assert.ok(a.job.equals(JOB_ADDRESS));
  assert.ok(a.freelancer.equals(FREELANCER));
  assert.equal(a.createdAt, T0 + 60);
  assert.equal(a.pitch, 'Xin chào, I design logos.');
  assert.equal(a.bump, 252);
  const full = application({ pitch: 'p'.repeat(280) });
  assert.equal(full.pitch.length, 280);
  assert.throws(() => decodeJobApplication(JOB_ADDRESS, applicationBytes().subarray(0, 363)), /364/);
});

test('job PDAs use the program seeds', () => {
  const business = Keypair.generate().publicKey;
  const j = jobPda(business, 7n);
  const le = Buffer.alloc(8);
  le.writeBigUInt64LE(7n);
  assert.ok(j.equals(PublicKey.findProgramAddressSync([Buffer.from('job'), business.toBuffer(), le], IDL_PROGRAM_ID)[0]));
  assert.ok(jobVaultPda(j).equals(PublicKey.findProgramAddressSync([Buffer.from('job_vault'), j.toBuffer()], IDL_PROGRAM_ID)[0]));
  assert.ok(jobAppPda(j, FREELANCER).equals(PublicKey.findProgramAddressSync([Buffer.from('job_app'), j.toBuffer(), FREELANCER.toBuffer()], IDL_PROGRAM_ID)[0]));
});

test('v1.4 unfunded at 544: a v1.3 listing (byte 0) is funded, a post_job_open listing (byte 1) is not', () => {
  const v13 = jobBytes();
  assert.equal(v13[544], 0);
  assert.equal(decodeJobListing(JOB_ADDRESS, v13).unfunded, false);
  const open = jobBytes({ unfunded: true });
  assert.equal(open[544], 1);
  assert.equal(decodeJobListing(JOB_ADDRESS, open).unfunded, true);
});
