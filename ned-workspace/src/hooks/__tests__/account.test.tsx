// D30 R6: the Workspace reads the phone app's @ned_account_v1 and follows its storage events (as hooks/consent.ts).
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { accountNeedsSetup, readAccount, useAccount, useOwnBusinessLabel } from '../account.ts';
import { PROFILES, resetAccountRoles, seedAccount, setAccountRoles, WALLET } from '../../test/account.ts';

function Probe() {
  const a = useAccount(WALLET);
  const label = useOwnBusinessLabel(WALLET);
  return (
    <div data-testid="probe">
      {JSON.stringify({ setup: a.needsSetup, create: a.capabilities.createContract, apply: a.capabilities.apply, region: a.capabilities.region, label })}
    </div>
  );
}
const state = () => JSON.parse(screen.getByTestId('probe').textContent ?? '{}');

beforeEach(() => {
  localStorage.clear();
  setAccountRoles(true);
});
afterEach(() => {
  cleanup();
  resetAccountRoles();
});

describe('hooks/account', () => {
  it('reads the profile and the current agreement the wallet wrote', () => {
    expect(readAccount(WALLET)).toEqual({ profile: null, agreement: null });
    expect(accountNeedsSetup(WALLET)).toBe(true);
    seedAccount(PROFILES.business);
    expect(readAccount(WALLET).profile?.business?.name).toBe('Lumen Studio');
    expect(readAccount(WALLET).agreement?.consentVersion).toBe(3);
    expect(accountNeedsSetup(WALLET)).toBe(false);
    expect(accountNeedsSetup(WALLET, false)).toBe(false); // never with the flag off
  });

  it('a storage event from the wallet panel updates the page', () => {
    render(<Probe />);
    expect(state()).toEqual({ setup: true, create: false, apply: true, region: 'vn', label: null });
    seedAccount(PROFILES.business);
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: '@ned_account_v1' }));
    });
    expect(state()).toEqual({ setup: false, create: true, apply: false, region: 'intl', label: 'Lumen Studio · Business · self-declared' });
  });

  it('flag off: today\'s region rule and no prompt, whatever is stored', () => {
    setAccountRoles(false);
    seedAccount(PROFILES.freelancer);
    render(<Probe />);
    expect(state()).toEqual({ setup: false, create: true, apply: true, region: 'intl', label: null });
  });
});
