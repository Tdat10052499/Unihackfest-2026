import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JOB_CATEGORIES } from '../../jobs/taxonomy.ts';
import { BUSINESS_COPY, COUNTRY_COPY, GATE_COPY, ROLE_COPY, SETTINGS_COPY, WEB_COPY } from '../copy.ts';
import { TEAM_SIZES } from '../types.ts';

// Section 0 rule 4 of the D30 prompts (design §6)
const BANNED =
  /\bpay(ment|s|ing)?\b|escrow|intermediar|trung gian|guarantee|\bsafe\b|protected|verified|trusted|employer|employee|salary/i;

/** Every string in a copy object, with format functions called on sample values */
function strings(v: unknown): string[] {
  if (typeof v === 'string') return [v];
  if (typeof v === 'function') return [String((v as (...a: unknown[]) => unknown)('Sample', 2, 'Sample'))];
  if (Array.isArray(v)) return v.flatMap(strings);
  if (v && typeof v === 'object') return Object.values(v).flatMap(strings);
  return [];
}

const ALL = { ROLE_COPY, COUNTRY_COPY, BUSINESS_COPY, SETTINGS_COPY, WEB_COPY, GATE_COPY };

test('no banned word in any account copy', () => {
  for (const [group, copy] of Object.entries(ALL)) {
    const list = strings(copy);
    assert.ok(list.length > 0, group);
    for (const s of list) assert.doesNotMatch(s, BANNED, `${group}: ${s}`);
  }
});

test('placeholders are filled by the format functions', () => {
  assert.equal(COUNTRY_COPY.noResult('Atlantis'), 'No country matches "Atlantis".');
  assert.equal(SETTINGS_COPY.businessValue('Lumen'), 'Lumen · self-declared');
  assert.equal(SETTINGS_COPY.agreementValue(1, '8 Oct 2026'), 'Version 1 · 8 Oct 2026');
  assert.equal(SETTINGS_COPY.sheet.change.primary('Vietnam'), 'Change to Vietnam');
  assert.match(SETTINGS_COPY.sheet.blocked.body(2, 1), /^You have 2 open client contracts and 1 open job listings\./);
  for (const s of strings(ALL)) assert.doesNotMatch(s, /\{\w+\}/, s);
});

test('option lists match the deck and their sources', () => {
  assert.equal(BUSINESS_COPY.size.options.join(' · '), 'Just me · 2–10 · 11–50 · 51–200 · 200+');
  assert.deepEqual(BUSINESS_COPY.size.options, TEAM_SIZES.map((s) => s.label));
  assert.equal(
    BUSINESS_COPY.industry.options.join(' · '),
    'Design · Development · Writing & Translation · Marketing · Video & Animation · Data & AI · Admin & Support · Other',
  );
  assert.equal(BUSINESS_COPY.industry.options.length, JOB_CATEGORIES.length);
});

test('the business badge never says verified', () => {
  assert.equal(BUSINESS_COPY.badge, 'Business · self-declared');
});
