// D30 R6: AccountPrompt (board WebAccountPrompt) replaces RegionPrompt with FEATURES.accountRoles on.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { WEB_COPY } from '@ned/core/account/copy.ts';
import { AuthContext } from '../../auth/AuthProvider.tsx';
import { AccountPrompt } from '../AccountPrompt.tsx';
import { useWalletPanel, WalletPanelProvider } from '../WalletPanelContext.tsx';
import { authFor, PROFILES, resetAccountRoles, seedAccount, setAccountRoles, WALLET } from '../../test/account.ts';

let opened: string | null = null;
function PanelSpy() {
  opened = useWalletPanel().pendingPath;
  return null;
}
const wrap = (wallet: string | null = WALLET) =>
  render(
    <AuthContext.Provider value={authFor(wallet)}>
      <WalletPanelProvider>
        <MemoryRouter>
          <AccountPrompt />
          <PanelSpy />
        </MemoryRouter>
      </WalletPanelProvider>
    </AuthContext.Provider>
  );

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  opened = null;
  setAccountRoles(true);
});
afterEach(() => {
  cleanup();
  resetAccountRoles();
});

describe('AccountPrompt', () => {
  it('shows for a wallet with no account: title, body, three steps; Open in wallet opens /role', () => {
    wrap();
    const dialog = screen.getByRole('dialog', { name: WEB_COPY.prompt.title });
    expect(dialog.textContent).toContain(WEB_COPY.prompt.body);
    expect(screen.getAllByRole('listitem').map((li) => li.textContent?.replace(/^\d/, ''))).toEqual([...WEB_COPY.prompt.steps]);
    fireEvent.click(screen.getByRole('button', { name: WEB_COPY.prompt.primary }));
    expect(opened).toBe('/role');
  });

  it('Later closes it for the session and leaves the note with the same action', () => {
    wrap();
    fireEvent.click(screen.getByRole('button', { name: WEB_COPY.prompt.later }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByTestId('account-later').textContent).toContain(WEB_COPY.prompt.laterNote);
    cleanup();
    wrap();
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: WEB_COPY.prompt.primary }));
    expect(opened).toBe('/role');
  });

  it('a wallet from before D30 (money view saved, no profile) gets the update copy and /role?update=1', () => {
    localStorage.setItem('@ned_region_v1', JSON.stringify({ state: { regions: { [WALLET]: 'intl' } }, version: 0 }));
    wrap();
    const dialog = screen.getByRole('dialog', { name: WEB_COPY.prompt.title });
    expect(dialog.textContent).toContain(WEB_COPY.prompt.update);
    expect(dialog.textContent).not.toContain(WEB_COPY.prompt.body);
    fireEvent.click(screen.getByRole('button', { name: WEB_COPY.prompt.primary }));
    expect(opened).toBe('/role?update=1');
  });

  it('hidden once the account is set up, when signed out, and with the flag off', () => {
    seedAccount(PROFILES.freelancer);
    wrap();
    expect(screen.queryByTestId('account-prompt')).toBeNull();
    cleanup();
    localStorage.clear();
    wrap(null);
    expect(screen.queryByTestId('account-prompt')).toBeNull();
    cleanup();
    setAccountRoles(false);
    wrap();
    expect(screen.queryByTestId('account-prompt')).toBeNull();
  });
});
