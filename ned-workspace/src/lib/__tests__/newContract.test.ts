import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Keypair } from '@solana/web3.js';
import { briefHash } from '@ned/core/milestone/content.ts';
import { addCriterion, addReference, brief, draft, fromLocalInput, newMilestone, problems, toLocalInput, type ContractForm } from '../newContract.ts';

const NOW = Math.floor(new Date('2026-10-04T09:00:00').getTime() / 1000);
const ME = Keypair.generate().publicKey.toBase58();
const VINH = Keypair.generate().publicKey.toBase58();

function form(over: Partial<ContractForm> = {}): ContractForm {
  const a = newMilestone(1, 0, NOW);
  const b = newMilestone(2, 1, NOW);
  return {
    freelancer: VINH,
    title: 'Landing page design',
    scope: 'A one-page landing site.',
    references: ['https://drive.example.com/brand-guide-v3.pdf'],
    milestones: [
      { ...a, name: 'Wireframes', amount: '10', criteria: ['Desktop and mobile layouts'] },
      { ...b, name: 'Build', amount: '10', reviewSeconds: 60, criteria: ['Page live on a test link'] },
    ],
    ...over,
  };
}

test('datetime-local round trip in the device time zone; new milestones are due weekly at 18:00', () => {
  assert.equal(fromLocalInput(toLocalInput(NOW)), NOW - (NOW % 60));
  assert.ok(Number.isNaN(fromLocalInput('')));
  assert.match(newMilestone(1, 0, NOW).submitBy, /^2026-10-11T18:00$/);
  assert.match(newMilestone(2, 1, NOW).submitBy, /^2026-10-18T18:00$/);
});

test('a complete form has no problems and gives the create_fund draft and the brief', () => {
  const f = form();
  assert.deepEqual(problems(f, NOW, ME), []);
  const d = draft(f)!;
  assert.equal(d.milestones[1].reviewSeconds, 60);
  assert.equal(d.milestones[0].submitBy, fromLocalInput(f.milestones[0].submitBy));
  assert.deepEqual(brief(f).milestones[0], { name: 'Wireframes', criteria: ['Desktop and mobile layouts'] });
  assert.equal(briefHash(d.title, d.brief).length, 32);
});

test('the same checks as the phone: freelancer, self, title bytes, amount, deadline, scope, names, limits', () => {
  const fields = (f: ContractForm, wallet = ME) => problems(f, NOW, wallet).map((p) => p.field);
  assert.deepEqual(fields(form({ freelancer: null })), ['freelancer']);
  assert.deepEqual(fields(form(), VINH), ['freelancer'], 'cannot contract with yourself');
  assert.deepEqual(fields(form({ title: 'é'.repeat(17) })), ['title'], '34 bytes');
  const ms = form().milestones;
  assert.deepEqual(fields(form({ milestones: [{ ...ms[0], amount: '0' }, ms[1]] })), ['milestones.0.amountUsdc']);
  assert.deepEqual(fields(form({ milestones: [{ ...ms[0], submitBy: toLocalInput(NOW + 30) }, ms[1]] })), ['milestones.0.submitBy']);
  assert.deepEqual(fields(form({ milestones: [{ ...ms[0], submitBy: '' }, ms[1]] })), ['milestones.0.submitBy']);
  assert.deepEqual(fields(form({ scope: ' ' })), ['scope']);
  assert.deepEqual(fields(form({ milestones: [ms[0], { ...ms[1], name: '' }] })), ['milestones.1.name']);
  assert.deepEqual(fields(form({ milestones: [{ ...ms[0], amount: '600' }, { ...ms[1], amount: '600' }] })), ['total']);
});

test('reference and "Done when" inputs keep the B1 limits', () => {
  assert.deepEqual(addReference([], ' https://x.example/a '), { list: ['https://x.example/a'] });
  assert.ok('error' in addReference([], 'drive.example.com/a'));
  assert.ok('error' in addReference(['https://a', 'https://b', 'https://c', 'https://d', 'https://e'], 'https://f'));
  assert.ok('error' in addReference(['https://a'], 'https://a'));
  assert.deepEqual(addCriterion(['a'], ' Works on mobile '), { list: ['a', 'Works on mobile'] });
  assert.ok('error' in addCriterion([], '   '));
  assert.ok('error' in addCriterion(['a'], 'a'), 'no duplicates (each point is one row)');
  assert.ok('error' in addCriterion(['1', '2', '3', '4', '5', '6'], '7'));
  assert.ok('error' in addCriterion([], 'x'.repeat(201)));
});
