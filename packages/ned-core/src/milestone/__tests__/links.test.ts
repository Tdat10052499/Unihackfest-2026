import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isFixedVersion, linkLabel, looksUnversioned } from '../links.ts';

test('fixed versions: Figma version-id, Git commit / tree / blob with a sha', () => {
  for (const l of [
    'https://www.figma.com/design/Lp7Qx/landing?version-id=2214',
    'https://github.com/vinh-ng/landing/tree/3f9a1c2',
    'https://github.com/vinh-ng/landing/blob/3f9a1c2d/README.md',
    'https://gitlab.com/a/b/-/commit/0123456789abcdef0123456789abcdef01234567',
  ]) {
    assert.equal(looksUnversioned(l), false, l);
    assert.equal(isFixedVersion(l), true, l);
  }
  for (const l of ['https://www.figma.com/design/Lp7Qx/landing', 'https://github.com/vinh-ng/landing', 'https://github.com/vinh-ng/landing/tree/main']) {
    assert.equal(looksUnversioned(l), true, l);
    assert.equal(isFixedVersion(l), false, l);
  }
  assert.equal(looksUnversioned('https://drive.example.com/file'), false);
  assert.equal(isFixedVersion('https://drive.example.com/file'), false);
});

test('labels', () => {
  assert.equal(linkLabel('https://www.figma.com/design/Lp7Qx/landing?version-id=2214'), 'Figma · version 2214');
  assert.equal(linkLabel('https://github.com/vinh-ng/landing/tree/3f9a1c2d9e'), 'GitHub · commit 3f9a1c2');
  assert.equal(linkLabel('https://github.com/vinh-ng/landing'), 'GitHub');
  assert.equal(linkLabel('https://drive.example.com/x'), 'drive.example.com');
  assert.equal(linkLabel('not a url'), 'not a url');
});
