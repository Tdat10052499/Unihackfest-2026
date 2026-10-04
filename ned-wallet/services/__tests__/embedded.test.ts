import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isAppPath, ROOT_PATHS } from '../embedded.ts';

test('only plain same-origin app paths are accepted from the parent', () => {
  for (const ok of ['/', '/settings', '/contracts/Dfo52wkPZ8Gt7vKGGby9g4eMTQYr1vs3qjPPSv49JBfR', '/contracts/F/review']) assert.equal(isAppPath(ok), true, ok);
  for (const bad of ['//evil.example', 'https://evil.example', 'javascript:alert(1)', '/a b', '', null, 42]) assert.equal(isAppPath(bad), false, String(bad));
  assert.ok(ROOT_PATHS.has('/contracts') && !ROOT_PATHS.has('/contracts/x'));
});
