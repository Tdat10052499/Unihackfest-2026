import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appPath, blockedForRegion, VN_BLOCKED_ROUTES } from '../regionGuard.ts';

test('V1: every wallet route is blocked in the Vietnam view and for a wallet with no region yet', () => {
  for (const r of VN_BLOCKED_ROUTES) {
    assert.equal(blockedForRegion(r, 'vn'), true, r);
    assert.equal(blockedForRegion(`${r}/`, 'vn'), true, `${r}/`);
    assert.equal(blockedForRegion(r, null), true, `${r} with no region`);
    assert.equal(blockedForRegion(r, 'intl'), false, `${r} intl`);
  }
  assert.equal(blockedForRegion('/scan-qr/anything', 'vn'), true);
  assert.equal(blockedForRegion('/xstocks/AAPLx', 'vn'), true);
});

test('other routes stay open', () => {
  for (const p of ['/home', '/contracts/abc', '/records', '/settings', '/sender', '/receiver', '/history-old']) assert.equal(blockedForRegion(p, 'vn'), false, p);
});

test('base URL of the Workspace build is stripped', () => {
  assert.equal(appPath('/wallet/send', '/wallet'), '/send');
  assert.equal(appPath('/wallet', '/wallet'), '/');
  assert.equal(appPath('/history/'), '/history');
});
