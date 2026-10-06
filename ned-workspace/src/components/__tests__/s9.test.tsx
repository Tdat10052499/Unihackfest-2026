import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { ReactNode } from 'react';
import { AuthContext, type AuthContextValue } from '../../auth/AuthProvider.tsx';
import { CONSENT_NEEDED, CONSENT_STORAGE_KEY, hasConsent } from '../../hooks/consent.ts';
import { EMPTY_TEXT } from '../../lib/noticeStore.ts';
import { TITLE_HINT } from '../../pages/NewContract.tsx';
import { ConsentGate } from '../ConsentGate.tsx';
import { LEGAL_LINKS, LegalLinks } from '../LegalLinks.tsx';
import { BellView } from '../NotificationBell.tsx';
import { useWalletPanel, WalletPanelProvider } from '../WalletPanelContext.tsx';

const WALLET = '9PZwK7pZmZnqfq1D5Xm9JvmoFQbPSjCoxj4AHiVLrhkW';
const auth = (wallet: string | null): AuthContextValue =>
  ({
    status: wallet ? 'ready' : 'signed-out',
    walletAddress: wallet,
    email: null,
    error: null,
    login: async () => {},
    logout: async () => {},
    signTransaction: async (t: never) => t,
    signMessage: async () => new Uint8Array(),
  }) as unknown as AuthContextValue;
const wrap = (ui: ReactNode, wallet: string | null = WALLET) =>
  render(
    <AuthContext.Provider value={auth(wallet)}>
      <WalletPanelProvider>
        <MemoryRouter>{ui}</MemoryRouter>
      </WalletPanelProvider>
    </AuthContext.Provider>
  );
const consent = (record: object | null) =>
  record ? localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ state: { consents: { [WALLET]: record } }, version: 0 })) : localStorage.removeItem(CONSENT_STORAGE_KEY);

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(cleanup);

describe('P4 consent', () => {
  it('reads the phone app record: valid, withdrawn, old version', () => {
    expect(hasConsent(WALLET)).toBe(false);
    consent({ acceptedAt: 1, scope: ['email'], version: 1 });
    expect(hasConsent(WALLET)).toBe(true);
    consent({ acceptedAt: 1, scope: ['email'], version: 1, withdrawnAt: 2 });
    expect(hasConsent(WALLET)).toBe(false);
    consent({ acceptedAt: 1, scope: ['email'], version: 0 });
    expect(hasConsent(WALLET)).toBe(false);
  });

  it('confirm() is blocked and the wallet opens at /consent until consent is given', async () => {
    let api: ReturnType<typeof useWalletPanel> | null = null;
    function Probe() {
      api = useWalletPanel();
      return <span>{api.pendingPath ?? 'none'}</span>;
    }
    wrap(<Probe />);
    let ok: boolean | null = null;
    await act(async () => {
      ok = await api!.confirm({ title: 'Create contract', rows: [], confirmLabel: 'Create' });
    });
    expect(ok).toBe(false);
    expect(screen.getByText('/consent')).toBeTruthy();
    consent({ acceptedAt: 1, scope: ['email'], version: 1 });
    let promise: Promise<boolean> | null = null;
    act(() => {
      promise = api!.confirm({ title: 'Create contract', rows: [], confirmLabel: 'Create' });
    });
    expect(api!.request?.title).toBe('Create contract');
    act(() => api!.answer(true));
    expect(await promise!).toBe(true);
  });

  it('the gate shows a banner and opens the consent screen once; gone after consent', () => {
    wrap(<ConsentGate />);
    expect(screen.getByTestId('consent-gate').textContent).toContain(CONSENT_NEEDED);
    expect(sessionStorage.getItem(`ned.consentAsked.${WALLET}`)).toBe('1');
    cleanup();
    consent({ acceptedAt: 1, scope: ['email'], version: 1 });
    wrap(<ConsentGate />);
    expect(screen.queryByTestId('consent-gate')).toBeNull();
    cleanup();
    wrap(<ConsentGate />, null);
    expect(screen.queryByTestId('consent-gate')).toBeNull();
  });
});

describe('U3 bell', () => {
  const now = Math.floor(Date.now() / 1000);
  const items = [
    { id: 'a', title: 'Milestone 1 submitted · review by 7 Oct, 04:00', message: '@vinh submitted work for “Logo refresh”.', at: now - 60, href: '/contract/F', seen: false },
    { id: 'b', title: 'Locked · @vinh can start', message: '20.00 USDC for “Logo refresh” is locked in the program vault.', at: now - 3 * 86_400, href: '/contract/F', seen: true },
  ];

  it('badge, Today and Earlier, opening marks seen, Escape closes', () => {
    const onOpen = vi.fn();
    wrap(<BellView items={items} unread={1} now={now} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole('button', { name: 'Notifications, 1 new' }));
    expect(onOpen).toHaveBeenCalledOnce();
    const panel = screen.getByRole('dialog', { name: 'Notifications' });
    expect(panel.textContent).toContain('Today');
    expect(panel.textContent).toContain('Earlier');
    expect(screen.getAllByTestId('notice')[0].getAttribute('href')).toBe('/contract/F');
    expect(screen.getAllByLabelText('New')).toHaveLength(1);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('empty state', () => {
    wrap(<BellView items={[]} unread={0} now={now} onOpen={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    expect(screen.getByText(EMPTY_TEXT)).toBeTruthy();
  });
});

describe('P3 and F5', () => {
  it('Terms, Privacy and Disclosures links; the public-title hint', () => {
    wrap(<LegalLinks />);
    expect(screen.getAllByRole('link').map((a) => [a.textContent, a.getAttribute('href')])).toEqual(LEGAL_LINKS.map((l) => [l.label, l.href]));
    expect(TITLE_HINT).toBe("Public on Solana. Don't put names or personal details here.");
  });
});
