import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateDelivery } from '@ned/core/milestone/content.ts';
import { needsComputerForFinals, SUBMIT_ON_COMPUTER, workspaceSubmitUrl } from '../submitOnComputer.ts';

test('F-1: a phone delivery with a Drive link and no final-file list points to the Workspace', () => {
  const problems = validateDelivery({ links: ['https://drive.google.com/file/d/abc/view'], files: [], note: '' });
  assert.equal(needsComputerForFinals(problems), true);
  assert.equal(SUBMIT_ON_COMPUTER, 'Submit from the Workspace on a computer to list your final files.');
  assert.equal(workspaceSubmitUrl('https://unihackfest-2026.vercel.app/', 'Fund111', 1), 'https://unihackfest-2026.vercel.app/contract/Fund111/submit?i=1');
  assert.equal(workspaceSubmitUrl('', 'F', 0), 'https://unihackfest-2026.vercel.app/contract/F/submit?i=0', 'default origin');
  assert.equal(needsComputerForFinals([{ field: 'links' }]), false);
});
