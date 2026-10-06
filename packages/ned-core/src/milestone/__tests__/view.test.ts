// Labels for every state × role × region (snapshot), plus actions, P1 gating and the other FundView fields.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_PAYOUT_PARTNER } from '../../constants.ts';
import { evidenceHash } from '../evidence.ts';
import { vaultPda } from '../pda.ts';
import { RELEASED_TO_PARTNER, toFundView, type Region, type Role } from '../view.ts';
import { CLIENT, FREELANCER, fund, FUND_ADDRESS, M, STRANGER, T0, USDC } from './fixture.ts';
import { CASES, NAMES, NOW } from './viewCases.ts';

process.env.TZ = 'UTC';
const me = (role: Role) => (role === 'client' ? CLIENT : FREELANCER).toBase58();
const c = me('client');
const f = me('freelancer');

// [fund label, fund tone, milestone 0 label, milestone 0 tone, milestone 0 amount, next action]
const SNAPSHOT: Record<string, [string, string, string, string, string, string | null]> = {
  "created/client/vn": ["Waiting for @vinh to accept","info","Waiting for @vinh to accept","info","≈ 260,000 VND (estimate)",null],
  "created/client/intl": ["Waiting for @vinh to accept","info","Waiting for @vinh to accept","info","10.00 USDC",null],
  "created/freelancer/vn": ["New contract · review and accept","info","New contract · review and accept","info","≈ 260,000 VND (estimate)","accept"],
  "created/freelancer/intl": ["New contract · review and accept","info","New contract · review and accept","info","10.00 USDC","accept"],
  "accepted/client/vn": ["Ready to lock","info","Ready to lock","info","≈ 260,000 VND (estimate)","lock"],
  "accepted/client/intl": ["Ready to lock","info","Ready to lock","info","10.00 USDC","lock"],
  "accepted/freelancer/vn": ["Accepted · waiting for @mia to lock","info","Accepted · waiting for @mia to lock","info","≈ 260,000 VND (estimate)",null],
  "accepted/freelancer/intl": ["Accepted · waiting for @mia to lock","info","Accepted · waiting for @mia to lock","info","10.00 USDC",null],
  "tooLate/client/vn": ["Not enough time left · close and create a new contract","neutral","Not enough time left · close and create a new contract","neutral","≈ 260,000 VND (estimate)","close"],
  "tooLate/client/intl": ["Not enough time left · close and create a new contract","neutral","Not enough time left · close and create a new contract","neutral","10.00 USDC","close"],
  "tooLate/freelancer/vn": ["Not enough time left to accept","neutral","Not enough time left to accept","neutral","≈ 260,000 VND (estimate)",null],
  "tooLate/freelancer/intl": ["Not enough time left to accept","neutral","Not enough time left to accept","neutral","10.00 USDC",null],
  "locked/client/vn": ["Locked · work in progress","accent","Locked · work in progress","accent","≈ 260,000 VND (estimate)",null],
  "locked/client/intl": ["Locked · work in progress","accent","Locked · work in progress","accent","10.00 USDC",null],
  "locked/freelancer/vn": ["Locked · work in progress","accent","Locked · work in progress","accent","≈ 260,000 VND (estimate)","submit"],
  "locked/freelancer/intl": ["Locked · work in progress","accent","Locked · work in progress","accent","10.00 USDC","submit"],
  "submitted/client/vn": ["Submitted · review by 2 Oct, 10:25 · Release opens in 12:01 if not reviewed","warning","Submitted · review by 2 Oct, 10:25 · Release opens in 12:01 if not reviewed","warning","≈ 260,000 VND (estimate)","approve"],
  "submitted/client/intl": ["Submitted · review by 2 Oct, 10:25 · Release opens in 12:01 if not reviewed","warning","Submitted · review by 2 Oct, 10:25 · Release opens in 12:01 if not reviewed","warning","10.00 USDC","approve"],
  "submitted/freelancer/vn": ["Submitted · in review","warning","Submitted · in review","warning","≈ 260,000 VND (estimate)",null],
  "submitted/freelancer/intl": ["Submitted · in review","warning","Submitted · in review","warning","10.00 USDC",null],
  "disputed/client/vn": ["Changes requested · waiting for @vinh","warning","Changes requested · waiting for @vinh","warning","≈ 260,000 VND (estimate)",null],
  "disputed/client/intl": ["Changes requested · waiting for @vinh","warning","Changes requested · waiting for @vinh","warning","10.00 USDC",null],
  "disputed/freelancer/vn": ["Changes requested · send a revised version","warning","Changes requested · send a revised version","warning","≈ 260,000 VND (estimate)",null],
  "disputed/freelancer/intl": ["Changes requested · send a revised version","warning","Changes requested · send a revised version","warning","10.00 USDC",null],
  "released/client/vn": ["Completed","success","Released","success","≈ 260,000 VND (estimate)","close"],
  "released/client/intl": ["Completed","success","Released","success","10.00 USDC","close"],
  "released/freelancer/vn": ["Completed","success","Released","success","≈ 260,000 VND (estimate)",null],
  "released/freelancer/intl": ["Completed","success","Released","success","10.00 USDC",null],
  "releasedPartner/client/vn": ["Completed","success","Released to payout partner · VND transfer simulated in this demo","success","≈ 260,000 VND (estimate)","close"],
  "releasedPartner/client/intl": ["Completed","success","Released","success","10.00 USDC","close"],
  "releasedPartner/freelancer/vn": ["Completed","success","Released to payout partner · VND transfer simulated in this demo","success","≈ 260,000 VND (estimate)",null],
  "releasedPartner/freelancer/intl": ["Completed","success","Released","success","10.00 USDC",null],
  "refunded/client/vn": ["Completed","success","Refunded to you","neutral","≈ 260,000 VND (estimate)","close"],
  "refunded/client/intl": ["Completed","success","Refunded to you","neutral","10.00 USDC","close"],
  "refunded/freelancer/vn": ["Completed","success","Refunded to client","neutral","≈ 260,000 VND (estimate)",null],
  "refunded/freelancer/intl": ["Completed","success","Refunded to client","neutral","10.00 USDC",null],
  "cancelled/client/vn": ["Completed","success","Ended by agreement","neutral","≈ 260,000 VND (estimate)","close"],
  "cancelled/client/intl": ["Completed","success","Ended by agreement","neutral","10.00 USDC","close"],
  "cancelled/freelancer/vn": ["Completed","success","Ended by agreement","neutral","≈ 260,000 VND (estimate)",null],
  "cancelled/freelancer/intl": ["Completed","success","Ended by agreement","neutral","10.00 USDC",null],
};

test('labels and tones for every state × role × region match the snapshot', () => {
  const actual: Record<string, unknown> = {};
  for (const [name, scenario] of Object.entries(CASES)) {
    for (const role of ['client', 'freelancer'] as Role[]) {
      for (const region of ['vn', 'intl'] as Region[]) {
        const v = toFundView(fund(scenario.fund), me(role), region, scenario.now ?? NOW, { names: NAMES });
        actual[`${name}/${role}/${region}`] = [v.statusLabel, v.tone, v.milestones[0].statusLabel, v.milestones[0].tone, v.milestones[0].amountLabel, v.nextAction?.kind ?? null];
      }
    }
  }
  assert.deepEqual(actual, SNAPSHOT);
});

test('the Vietnam release line appears only for a payout-partner release in the Vietnam view', () => {
  const partner = fund(CASES.releasedPartner.fund);
  assert.equal(toFundView(partner, f, 'vn', NOW).milestones[0].statusLabel, RELEASED_TO_PARTNER);
  assert.equal(toFundView(partner, f, 'intl', NOW).milestones[0].statusLabel, 'Released');
  assert.equal(toFundView(fund(CASES.released.fund), f, 'vn', NOW).milestones[0].statusLabel, 'Released');
});

test('fund-level label follows a disputed, then a submitted milestone', () => {
  const mixed = fund({ milestones: [M('Released'), M('Submitted'), M('Disputed')] });
  assert.equal(toFundView(mixed, f, 'intl', NOW).statusLabel, 'Changes requested · send a revised version');
  const noDispute = fund({ milestones: [M('Released'), M('Submitted'), M()] });
  assert.equal(toFundView(noDispute, f, 'intl', NOW).statusLabel, 'Submitted · in review');
});

test('milestone actions follow rules.ts; P1 actions only with p1 on', () => {
  const submitted = fund({ milestones: [M('Submitted')] });
  assert.deepEqual(toFundView(submitted, c, 'intl', NOW, { p1: false }).milestones[0].actions, ['approve']);
  assert.deepEqual(toFundView(submitted, c, 'intl', NOW, { p1: true }).milestones[0].actions, ['approve', 'dispute', 'requestChanges']);
  assert.deepEqual(toFundView(submitted, f, 'intl', T0 + 721, { p1: true }).milestones[0].actions, ['releaseNow']);
  const disputed = fund({ milestones: [M('Disputed')] });
  assert.deepEqual(toFundView(disputed, f, 'intl', NOW, { p1: true }).milestones[0].actions, ['concede', 'sendRevision']);
  assert.deepEqual(toFundView(disputed, c, 'intl', NOW, { p1: true }).milestones[0].actions, ['approve', 'requestChanges']);
  assert.deepEqual(toFundView(disputed, f, 'intl', NOW, { p1: false }).milestones[0].actions, []);
  const pending = fund({ milestones: [M()] });
  assert.deepEqual(toFundView(pending, f, 'intl', T0 + 601).milestones[0].actions, ['refundNow'], 'past submit_by: anyone may refund');
  assert.equal(toFundView(pending, c, 'intl', T0 + 601).nextAction?.kind, 'refundNow');
  assert.equal(toFundView(pending, f, 'intl', T0 + 601).nextAction, undefined, 'the freelancer is not nudged to refund');
  // a stranger sees only "anyone" actions
  assert.deepEqual(toFundView(submitted, STRANGER.toBase58(), 'intl', T0 + 721).milestones[0].actions, ['releaseNow']);
});

test('fund-level actions, next action and needsMyAction', () => {
  const created = fund({ state: 'Created', payoutKind: 'Unset', milestones: [M()] });
  const asFreelancer = toFundView(created, f, 'vn', NOW);
  assert.deepEqual(asFreelancer.actions, ['accept']);
  assert.deepEqual(asFreelancer.nextAction, { kind: 'accept', label: 'Accept and choose where your earnings go' });
  assert.equal(asFreelancer.needsMyAction, true);
  const asClient = toFundView(created, c, 'vn', NOW);
  assert.deepEqual(asClient.actions, ['close']);
  assert.equal(asClient.needsMyAction, false, 'closing an open contract is possible but not a nudge');
  const accepted = toFundView(fund({ state: 'Accepted', milestones: [M(), M()] }), c, 'intl', NOW);
  assert.deepEqual(accepted.nextAction, { kind: 'lock', label: 'Lock 20.00 USDC' });
  const submitted = toFundView(fund({ milestones: [M('Released'), M('Submitted')] }), c, 'intl', NOW);
  assert.deepEqual(submitted.nextAction, { kind: 'approve', milestone: 1, label: 'Approve milestone 2' });
});

test('split proposal (P1): shown to both, accept only for the other party', () => {
  const proposed = fund({ milestones: [M(), M()], cancelProposer: CLIENT, cancelFreelancerAmount: 12n * USDC });
  const asFreelancer = toFundView(proposed, f, 'intl', NOW, { p1: true });
  assert.deepEqual(asFreelancer.split, { proposedByMe: false, toFreelancerUnits: 12n * USDC, toFreelancerLabel: '12.00 USDC', toClientLabel: '8.00 USDC' });
  assert.deepEqual(asFreelancer.actions, ['proposeSplit', 'acceptSplit']);
  assert.equal(asFreelancer.nextAction?.kind, 'acceptSplit');
  const asClient = toFundView(proposed, c, 'intl', NOW, { p1: true });
  assert.equal(asClient.split?.proposedByMe, true);
  assert.deepEqual(asClient.actions, ['proposeSplit']);
  assert.equal(toFundView(proposed, f, 'intl', NOW, { p1: false }).split, undefined);
});

test('amounts, destination, counterparty, countdown, evidence and links', () => {
  const evidence = evidenceHash('https://figma.com/file/abc');
  const funded = fund({
    payoutKind: 'PayoutPartner',
    payoutDestination: DEMO_PAYOUT_PARTNER,
    milestones: [M('Submitted', { evidence }), M()],
  });
  const v = toFundView(funded, f, 'vn', NOW, { names: NAMES });
  assert.equal(v.address, FUND_ADDRESS.toBase58());
  assert.equal(v.title, 'Landing page design');
  assert.equal(v.role, 'freelancer');
  assert.deepEqual(v.counterparty, { wallet: c, username: 'mia' });
  assert.equal(v.totalLabel, '≈ 520,000 VND (estimate)');
  assert.equal(v.lockedLabel, '≈ 520,000 VND (estimate)');
  assert.deepEqual(v.destination, { kind: 'payoutPartner', label: 'VND to a Vietnamese bank account through a payout partner (simulated)', simulated: true });
  assert.equal(v.state, 'funded');
  assert.equal(v.tooLate, false);
  assert.deepEqual(v.milestones[0].countdown, { to: T0 + 721, label: 'Release opens in 12:01 if not reviewed' });
  assert.deepEqual(v.milestones[1].countdown, { to: T0 + 600, label: 'submit within 10:00' });
  assert.match(v.milestones[0].evidence ?? '', /^[0-9a-f]{6}…[0-9a-f]{4}$/);
  assert.equal(v.milestones[1].evidence, undefined);
  assert.equal(v.explorerUrl, `https://explorer.solana.com/address/${FUND_ADDRESS.toBase58()}?cluster=devnet`);
  assert.equal(v.vaultExplorerUrl, `https://explorer.solana.com/address/${vaultPda(FUND_ADDRESS).toBase58()}?cluster=devnet`);

  const own = toFundView(fund({ milestones: [M()] }), c, 'intl', NOW);
  assert.deepEqual(own.destination, { kind: 'ownWallet', label: 'USDC to the freelancer’s own wallet', simulated: false });
  assert.deepEqual(own.counterparty, { wallet: f }, 'no username without a name map');
  assert.match(own.statusLabel, /^Locked/);
  assert.equal(toFundView(fund({ state: 'Created', payoutKind: 'Unset', milestones: [M()] }), c, 'intl', NOW).destination, null);
  assert.equal(toFundView(fund({ state: 'Accepted', milestones: [M()] }), c, 'intl', NOW).lockedLabel, '0.00 USDC');
});

test('U4: a submitted milestone past its review time reads the same for both sides, and both get Release now', () => {
  const f = fund({ milestones: [M('Submitted', { submittedAt: T0 + 10 })] });
  const after = T0 + 721; // reviewBy = T0 + 720
  const client = toFundView(f, CLIENT.toBase58(), 'intl', after, { names: NAMES });
  const freelancer = toFundView(f, FREELANCER.toBase58(), 'vn', after, { names: NAMES });
  assert.equal(client.milestones[0].statusLabel, 'Review time over · ready to release');
  assert.equal(freelancer.milestones[0].statusLabel, 'Review time over · ready to release');
  assert.equal(client.milestones[0].tone, 'success');
  assert.equal(client.milestones[0].countdown, undefined, 'no countdown at 0:00');
  assert.deepEqual(client.nextAction, {
    kind: 'releaseNow',
    milestone: 0,
    label: 'Release now',
    detail: 'You didn\'t review by 2 Oct, 10:25. This milestone can now be released to @vinh. Anyone can do this, including you.',
  });
  assert.deepEqual(freelancer.nextAction, { kind: 'releaseNow', milestone: 0, label: 'Release now', detail: 'Review time is over. Release your earnings now.' });
  // Before the review deadline the label is unchanged
  assert.equal(toFundView(f, FREELANCER.toBase58(), 'vn', T0 + 700).milestones[0].statusLabel, 'Submitted · in review');
});

test('a pending milestone past its submission deadline reads "Submission deadline passed" on both sides (U4)', () => {
  const f = fund({ milestones: [M('Pending')] });
  const ms = toFundView(f, CLIENT.toBase58(), 'intl', T0 + 601).milestones[0];
  assert.equal(ms.statusLabel, 'Submission deadline passed · can be refunded to you');
  assert.equal(toFundView(f, FREELANCER.toBase58(), 'intl', T0 + 601).milestones[0].statusLabel, 'Submission deadline passed · can be refunded to the client');
  assert.equal(toFundView(f, CLIENT.toBase58(), 'intl', T0 + 601).nextAction?.label, 'Refund now');
  assert.equal(ms.tone, 'warning');
  assert.ok(ms.actions.includes('refundNow'));
});
