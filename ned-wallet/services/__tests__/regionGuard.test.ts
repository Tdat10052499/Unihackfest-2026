import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appPath, blockedForRegion, isTokenTransferNotice, syncsOnChainActivity, VN_BLOCKED_ROUTES } from '../regionGuard.ts';
import { solActivityAmount } from '../activityAmount.ts';

test('V1: every wallet route is blocked in the Vietnam view and for a wallet with no region yet', () => {
  for (const r of VN_BLOCKED_ROUTES) {
    assert.equal(blockedForRegion(r, 'vn'), true, r);
    assert.equal(blockedForRegion(`${r}/`, 'vn'), true, `${r}/`);
    assert.equal(blockedForRegion(r, null), true, `${r} with no region`);
    assert.equal(blockedForRegion(r, 'intl'), false, `${r} intl`);
  }
  assert.equal(blockedForRegion('/scan-qr/anything', 'vn'), true);
});

test('other routes stay open', () => {
  for (const p of ['/home', '/contracts/abc', '/records', '/settings', '/sender', '/receiver', '/history-old']) assert.equal(blockedForRegion(p, 'vn'), false, p);
});

test('base URL of the Workspace build is stripped', () => {
  assert.equal(appPath('/wallet/send', '/wallet'), '/send');
  assert.equal(appPath('/wallet', '/wallet'), '/');
  assert.equal(appPath('/history/'), '/history');
});

test('D2: the Vietnam view never syncs or keeps on-chain transfer notices, and cannot open their detail', () => {
  assert.equal(syncsOnChainActivity('intl'), true);
  assert.equal(syncsOnChainActivity('vn'), false);
  assert.equal(syncsOnChainActivity(null), false, 'no region yet counts as the Vietnam view');
  assert.equal(blockedForRegion('/notification-detail', 'vn'), true);
  assert.equal(blockedForRegion('/notification-detail', null), true);
  assert.equal(blockedForRegion('/notification-detail', 'intl'), false);
  assert.equal(isTokenTransferNotice({ type: 'RECEIVE_MONEY', txHash: 'sig' }), true);
  assert.equal(isTokenTransferNotice({ type: 'TRANSFER', txHash: 'sig' }), true);
  assert.equal(isTokenTransferNotice({ type: 'CONTRACT', txHash: 'sig' }), false);
  assert.equal(isTokenTransferNotice({ type: 'RECEIVE_MONEY' }), false);
});

test('D2: a SOL balance change reads as SOL, never as dollars', () => {
  assert.equal(solActivityAmount(0.5), '+0.5000 SOL');
  assert.equal(solActivityAmount(-0.0123), '-0.0123 SOL');
  assert.doesNotMatch(solActivityAmount(1), /\$|USDC/);
});

test('Add USDC: blocked in the Vietnam view and for a wallet with no region, open in the international view', () => {
  assert.ok((VN_BLOCKED_ROUTES as readonly string[]).includes('/add-usdc'));
  assert.equal(blockedForRegion('/add-usdc', 'vn'), true);
  assert.equal(blockedForRegion('/add-usdc/', 'vn'), true, 'trailing slash (the guard reads the pathname, never the query)');
  assert.equal(blockedForRegion('/add-usdc', null), true);
  assert.equal(blockedForRegion('/add-usdc', 'intl'), false);
  // Inside the Workspace's wallet extension the path carries the /wallet base
  assert.equal(appPath('/wallet/add-usdc', '/wallet'), '/add-usdc');
  assert.equal(blockedForRegion(appPath('/wallet/add-usdc', '/wallet'), 'vn'), true);
  assert.equal(blockedForRegion(appPath('/wallet/add-usdc', '/wallet'), 'intl'), false);
  // /receive is now a redirect to /add-usdc and stays blocked too
  assert.equal(blockedForRegion('/receive', 'vn'), true);
});
