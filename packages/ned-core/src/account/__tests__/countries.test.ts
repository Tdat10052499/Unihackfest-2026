import { test } from 'node:test';
import assert from 'node:assert/strict';
import { foldText } from '../../jobs/search.ts';
import { ALL_COUNTRIES, COUNTRIES, countryName, isCountry, SANCTIONED, searchCountries } from '../countries.ts';
import * as core from '../../index.ts';

test('every ISO 3166-1 alpha-2 code once, upper case, with a name', () => {
  assert.equal(ALL_COUNTRIES.length, 249);
  assert.equal(new Set(ALL_COUNTRIES.map((c) => c.code)).size, ALL_COUNTRIES.length);
  for (const c of ALL_COUNTRIES) {
    assert.match(c.code, /^[A-Z]{2}$/);
    assert.ok(c.name.length > 1);
    assert.doesNotMatch(c.name, /&|’|St\. /, c.name);
  }
});

test('sorted by name, accents folded', () => {
  const names = ALL_COUNTRIES.map((c) => foldText(c.name));
  assert.deepEqual(names, [...names].sort());
});

test('Vietnam is in the list; isCountry and countryName', () => {
  assert.ok(isCountry('VN'));
  assert.equal(countryName('VN'), 'Vietnam');
  assert.equal(countryName('SG'), 'Singapore');
  assert.equal(isCountry('vn'), false, 'codes are upper case');
  assert.equal(isCountry('XX'), false);
  assert.equal(countryName('XX'), undefined);
});

test('search: "viet", "VIET" and "vn" find Vietnam; accents ignored; empty query returns all', () => {
  for (const q of ['viet', 'VIET', 'vn', ' Vn ', 'việt']) {
    assert.ok(searchCountries(q).some((c) => c.code === 'VN'), q);
  }
  assert.ok(searchCountries('cote').some((c) => c.code === 'CI'));
  assert.ok(searchCountries('aland').some((c) => c.code === 'AX'));
  assert.ok(searchCountries('korea').some((c) => c.code === 'KR'), 'matches a word inside the name');
  assert.deepEqual(searchCountries('zzzz'), []);
  assert.equal(searchCountries('').length, COUNTRIES.length);
});

test('SANCTIONED is filtered from search and COUNTRIES (empty in the pilot)', () => {
  assert.deepEqual([...SANCTIONED], []);
  assert.equal(COUNTRIES.length, ALL_COUNTRIES.length);
  const hidden = searchCountries('', ['RU']);
  assert.ok(!hidden.some((c) => c.code === 'RU'));
  assert.equal(hidden.length, ALL_COUNTRIES.length - 1);
  assert.deepEqual(searchCountries('russia', ['RU']), []);
});

test('exported from @ned/core', () => {
  assert.equal(core.COUNTRIES, COUNTRIES);
  assert.equal(typeof core.searchCountries, 'function');
});
