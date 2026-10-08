// D30 R6: role gates in the Workspace and N.E.D Jobs (roles-and-agreement-build.md §4), FEATURES.accountRoles on;
// the flag-off cases keep today's behaviour.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Keypair, PublicKey } from '@solana/web3.js';
import type { ReactNode } from 'react';
import type { AccountProfile } from '@ned/core/account/types.ts';
import { GATE_COPY } from '@ned/core/account/copy.ts';
import { AuthContext } from '../../auth/AuthProvider.tsx';
import { WalletPanelProvider, useWalletPanel } from '../WalletPanelContext.tsx';
import { RoleGateNotice } from '../RoleGate.tsx';
import { NewContract } from '../../pages/NewContract.tsx';
import { PostJob } from '../../jobs/pages/PostJob.tsx';
import { ApplicantsView } from '../../jobs/pages/Applicants.tsx';
import { JobDetailView } from '../../jobs/pages/JobDetail.tsx';
import { listing, T0 } from '../../jobs/__tests__/fixture.ts';
import { authFor, PROFILES, resetAccountRoles, seedAccount, setAccountRoles, WALLET } from '../../test/account.ts';

let opened: string | null = null;
function PanelSpy() {
  opened = useWalletPanel().pendingPath;
  return null;
}
const wrap = (ui: ReactNode, path = '/') =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, enabled: false } } })}>
      <AuthContext.Provider value={authFor(WALLET)}>
        <WalletPanelProvider>
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route path="*" element={<>{ui}<RoleGateNotice /><PanelSpy /></>} />
            </Routes>
          </MemoryRouter>
        </WalletPanelProvider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
const as = (p: AccountProfile) => seedAccount(p);

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

describe('/new (NewContract) opened by URL', () => {
  it('freelancer outside Vietnam: the WebRoleGate card with Open settings (wallet panel at /settings)', () => {
    as(PROFILES.freelancer);
    wrap(<NewContract />, '/new');
    const card = screen.getByTestId('role-gate-card');
    expect(within(card).getByRole('heading').textContent).toBe(GATE_COPY.createTitle);
    expect(card.textContent).toContain(GATE_COPY.clientNeeded);
    fireEvent.click(within(card).getByRole('button', { name: GATE_COPY.openSettings }));
    expect(opened).toBe('/settings');
    expect(within(card).getByRole('link', { name: GATE_COPY.findWork }).getAttribute('href')).toBe('/jobs/find');
  });

  it('Vietnam resident: the Vietnam line, no Open settings, no amount', () => {
    as(PROFILES.vn);
    wrap(<NewContract />, '/new');
    const card = screen.getByTestId('role-gate-card');
    expect(card.textContent).toContain(GATE_COPY.clientNeededVN);
    expect(within(card).queryByRole('button', { name: GATE_COPY.openSettings })).toBeNull();
    expect(card.textContent).not.toMatch(/\d+(\.\d+)?\s*(USDC|SOL)/);
  });

  it('client, business: no gate card', () => {
    for (const p of [PROFILES.client, PROFILES.business]) {
      as(p);
      wrap(<NewContract />, '/new');
      expect(screen.queryByTestId('role-gate-card')).toBeNull();
      cleanup();
    }
  });

  it('flag off: today (the Vietnam view shows "New contracts come from your clients")', () => {
    setAccountRoles(false);
    as(PROFILES.vn);
    wrap(<NewContract />, '/new');
    expect(screen.queryByTestId('role-gate-card')).toBeNull();
    expect(screen.getByRole('heading', { name: 'New contracts come from your clients' })).toBeTruthy();
  });
});

describe('/jobs/new (PostJob) opened by URL', () => {
  it('freelancer: the gate card with Open settings; Vietnam: the Vietnam line only', () => {
    as(PROFILES.freelancer);
    wrap(<PostJob />, '/jobs/new');
    expect(screen.getByTestId('role-gate-card').textContent).toContain(GATE_COPY.clientNeeded);
    expect(screen.getByRole('button', { name: GATE_COPY.openSettings })).toBeTruthy();
    cleanup();
    as(PROFILES.vn);
    wrap(<PostJob />, '/jobs/new');
    expect(screen.getByTestId('role-gate-card').textContent).toContain(GATE_COPY.clientNeededVN);
    expect(screen.queryByRole('button', { name: GATE_COPY.openSettings })).toBeNull();
  });

  it('client and business: the form, no gate card', () => {
    for (const p of [PROFILES.client, PROFILES.business]) {
      as(p);
      wrap(<PostJob />, '/jobs/new');
      expect(screen.queryByTestId('role-gate-card')).toBeNull();
      expect(screen.getByLabelText('Title')).toBeTruthy();
      cleanup();
    }
  });
});

describe('Applicants: Select needs the poster wallet and the client role', () => {
  const freelancer = Keypair.generate().publicKey;
  const job = listing({ business: new PublicKey(WALLET), applicationCount: 1 });
  const apps = [{ address: Keypair.generate().publicKey, version: 1, job: job.address, freelancer, createdAt: T0, pitch: 'I can do it.', bump: 255 }];
  const view = () => wrap(<ApplicantsView job={job} applications={apps} names={{}} records={{}} briefOk now={T0} me={WALLET} balance={0n} />);

  it('a poster without the client role sees the GATE_COPY refusal instead of the select sheet', () => {
    as(PROFILES.freelancer);
    view();
    fireEvent.click(within(screen.getByTestId('applicant')).getByRole('button', { name: 'Select' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    const gate = screen.getByTestId('role-gate');
    expect(gate.textContent).toContain(GATE_COPY.clientNeeded);
    fireEvent.click(within(gate).getByRole('button', { name: GATE_COPY.openSettings }));
    expect(opened).toBe('/settings');
  });

  it('a business poster gets the select sheet', () => {
    as(PROFILES.business);
    view();
    fireEvent.click(within(screen.getByTestId('applicant')).getByRole('button', { name: 'Select' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.queryByTestId('role-gate')).toBeNull();
  });
});

describe('JobDetail ApplyCard', () => {
  const job = listing({ title: 'Logo refresh' });
  const detail = (canApply: boolean, vn = false) =>
    wrap(<JobDetailView job={job} brief={null} application={null} businessName="@orbit" now={T0} vn={vn} me={WALLET} canApply={canApply} />, `/jobs/${job.address.toBase58()}`);

  it('freelancer and Vietnam resident: the pitch form', () => {
    detail(true);
    expect(screen.getByLabelText('Your pitch')).toBeTruthy();
    cleanup();
    detail(true, true);
    expect(screen.getByLabelText('Your pitch')).toBeTruthy();
  });

  it('client-only and business accounts: "Also work" first (wallet panel at /settings), no pitch form', () => {
    detail(false);
    const box = screen.getByTestId('apply-also-work');
    expect(box.textContent).toContain(GATE_COPY.freelancerNeeded);
    expect(screen.queryByLabelText('Your pitch')).toBeNull();
    fireEvent.click(within(box).getByRole('button', { name: GATE_COPY.alsoWork }));
    expect(opened).toBe('/settings');
  });
});

describe('consent v3 before any signing action', () => {
  it('without the agreement, confirm() is blocked and the wallet panel opens at /role', async () => {
    let api: ReturnType<typeof useWalletPanel> | null = null;
    function Probe() {
      api = useWalletPanel();
      return null;
    }
    wrap(<Probe />);
    let ok: boolean | null = null;
    await act(async () => {
      ok = await api!.confirm({ title: 'Create contract', rows: [], confirmLabel: 'Create' });
    });
    expect(ok).toBe(false);
    expect(opened).toBe('/role');
    as(PROFILES.client);
    act(() => void api!.confirm({ title: 'Create contract', rows: [], confirmLabel: 'Create' }));
    expect(api!.request?.title).toBe('Create contract');
  });
});
