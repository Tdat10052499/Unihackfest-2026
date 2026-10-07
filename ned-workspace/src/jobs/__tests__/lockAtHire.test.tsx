// v1.4 lock at hire (D29, prompt V6): chips, Funded only, Overview stats, job detail, the Select sheet, the flag off
// (v1.3 UI) and the Vietnam view (no USDC or SOL).
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Keypair } from '@solana/web3.js';
import type { ReactNode } from 'react';
import type { JobApplicationAccount } from '@ned/core/jobs/decode.ts';
import { AuthProvider } from '../../auth/AuthProvider.tsx';
import { WalletPanelProvider } from '../../components/WalletPanelContext.tsx';
import { JobCard, JobRow } from '../components/JobCard.tsx';
import { overviewStats } from '../overview.ts';
import { ApplicantsView } from '../pages/Applicants.tsx';
import { FindView, type FindViewProps } from '../pages/Find.tsx';
import { JobDetailView, LOCKS_WHEN_HIRED_HINT } from '../pages/JobDetail.tsx';
import { HERO, HERO_V13, OverviewView, type OverviewViewProps } from '../pages/Overview.tsx';
import { listing, T0, USDC } from './fixture.ts';

afterEach(cleanup);

const wrap = (ui: ReactNode) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider>
        <WalletPanelProvider>
          <MemoryRouter>{ui}</MemoryRouter>
        </WalletPanelProvider>
      </AuthProvider>
    </QueryClientProvider>
  );

const funded = listing({ title: 'Funded logo', total: 20n * USDC, createdAt: T0 });
const open = listing({ title: 'Open landing page', total: 30n * USDC, createdAt: T0 + 60, unfunded: true });

describe('chips and labels follow the listing kind', () => {
  it('card: Locked (funded) or Locks when hired (unfunded), and the aria-label', () => {
    wrap(
      <>
        <JobCard job={funded} vn={false} now={T0} />
        <JobCard job={open} vn={false} now={T0} />
      </>
    );
    const [a, b] = screen.getAllByTestId('job-card');
    expect(a.textContent).toContain('Locked');
    expect(a.getAttribute('aria-label')).toBe('Funded logo, 20.00 USDC, budget locked');
    expect(b.textContent).toContain('Locks when hired');
    expect(b.textContent).not.toContain('Locked');
    expect(b.getAttribute('aria-label')).toBe('Open landing page, 30.00 USDC, locks when hired');
  });

  it('Vietnam view: "Estimate · locks when hired", ≈ VND, no USDC or SOL', () => {
    wrap(
      <>
        <JobCard job={open} vn now={T0} />
        <JobRow job={open} vn now={T0} />
        <JobRow job={funded} vn now={T0} />
      </>
    );
    const [card] = screen.getAllByTestId('job-card');
    const [row, row2] = screen.getAllByTestId('job-row');
    expect(card.textContent).toContain('Locks when hired');
    expect(row.textContent).toContain('Estimate · locks when hired');
    expect(row2.textContent).toContain('Estimate · budget locked');
    for (const el of [card, row, row2]) {
      expect(el.textContent).not.toMatch(/USDC|SOL/);
      expect(el.getAttribute('aria-label')).not.toMatch(/USDC|SOL/);
    }
  });
});

describe('job detail', () => {
  const brief = { status: 'ok' as const, brief: { v: 1, title: 'Open landing page', scope: 'One page.', references: [], milestones: [{ name: 'Page', criteria: ['Responsive'] }] } };
  it('unfunded: the chip and the hint; Apply stays available', () => {
    wrap(<JobDetailView job={open} brief={brief} application={null} records={[]} businessName="@orbit_cafe" now={T0} vn={false} me={Keypair.generate().publicKey.toBase58()} />);
    expect(screen.getAllByText('Locks when hired').length).toBeGreaterThan(0);
    expect(screen.getByText(LOCKS_WHEN_HIRED_HINT)).toBeTruthy();
    expect(LOCKS_WHEN_HIRED_HINT).toBe('The budget is locked when the business selects someone, before you accept.');
    expect(screen.getByRole('button', { name: /^Apply/ })).toBeTruthy();
  });
  it('funded: Budget locked, no hint', () => {
    wrap(<JobDetailView job={funded} brief={brief} application={null} records={[]} businessName="@orbit_cafe" now={T0} vn={false} me={null} />);
    expect(screen.getAllByText('Budget locked').length).toBeGreaterThan(0);
    expect(screen.queryByText(LOCKS_WHEN_HIRED_HINT)).toBeNull();
  });
});

let where = '';
function Spy() {
  where = useLocation().search;
  return null;
}
const findBase: FindViewProps = { open: [funded, open], openLoading: false, openError: false, onRetry: () => {}, applications: [], listings: [], signedIn: true, vn: false, me: null, names: {}, now: T0 };
const find = (url: string, over: Partial<FindViewProps> = {}) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/jobs/find" element={<><FindView {...findBase} {...over} /><Spy /></>} />
      </Routes>
    </MemoryRouter>
  );
const cardTitles = () => screen.queryAllByTestId('job-card').map((c) => c.querySelector('h3')?.textContent);

describe('Find jobs: Funded only', () => {
  it('the switch writes funded=1, hides unfunded listings and shows a removable chip; off by default', () => {
    find('/jobs/find');
    // Same day: the funded one first, although the unfunded one is newer
    expect(cardTitles()).toEqual(['Funded logo', 'Open landing page']);
    expect(screen.getByTestId('find-summary').textContent).toBe('2 open jobs · 20.00 USDC locked on Solana');
    fireEvent.click(screen.getByRole('button', { name: /^Filters/ }));
    const sheet = screen.getByRole('dialog', { name: 'Filters' });
    fireEvent.click(within(sheet).getByRole('switch', { name: /Funded only/ }));
    expect(where).toBe('?funded=1');
    expect(cardTitles()).toEqual(['Funded logo']);
    fireEvent.click(within(sheet).getByRole('button', { name: /^Show 1 job$/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove filter Funded only' }));
    expect(where).toBe('');
    expect(cardTitles()).toHaveLength(2);
  });

  it('a funded=1 link reopens filtered', () => {
    find('/jobs/find?funded=1');
    expect(cardTitles()).toEqual(['Funded logo']);
    expect(screen.getByRole('button', { name: 'Remove filter Funded only' })).toBeTruthy();
  });

  it('Newest: funded first within the same day', () => {
    const later = listing({ title: 'Later funded', createdAt: T0 + 30 });
    find('/jobs/find', { open: [open, later, funded] });
    expect(cardTitles()).toEqual(['Later funded', 'Funded logo', 'Open landing page']);
  });

  it('flag off: the v1.3 board (funded only, no switch, old heading)', () => {
    find('/jobs/find', { lockAtHire: false });
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Find jobs, already funded');
    expect(cardTitles()).toEqual(['Funded logo']);
    fireEvent.click(screen.getByRole('button', { name: /^Filters/ }));
    expect(within(screen.getByRole('dialog', { name: 'Filters' })).queryByRole('switch', { name: /Funded only/ })).toBeNull();
  });
});

const ovBase: OverviewViewProps = { jobs: [funded, open], loading: false, error: false, onRetry: () => {}, vn: false, client: false, signedIn: false, names: {}, now: T0 };
const overview = (over: Partial<OverviewViewProps> = {}) =>
  render(
    <MemoryRouter initialEntries={['/jobs']}>
      <Routes>
        <Route path="/jobs" element={<OverviewView {...ovBase} {...over} />} />
      </Routes>
    </MemoryRouter>
  );
const notch = () => screen.getByTestId('notch').textContent ?? '';

describe('Overview', () => {
  it('locked counts funded listings only, plus a "+N jobs that lock when hired" line', () => {
    const s = overviewStats([funded, open]);
    expect([s.lockedUnits, s.unfundedCount, s.newestFunded?.title]).toEqual([20n * USDC, 1, 'Funded logo']);
    overview();
    expect(notch()).toContain('20.00 USDC');
    expect(screen.getByTestId('unfunded-count').textContent).toBe('+1 job that locks when hired');
    expect(screen.getByText(HERO.guest.sub)).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Work with the budgetlocked before you start');
  });

  it('Vietnam view: ≈ VND, the CL sub, no USDC or SOL in the hero', () => {
    overview({ vn: true, signedIn: true });
    expect(screen.getByText(HERO.vn.sub)).toBeTruthy();
    expect(HERO.vn.sub.endsWith('VND transfer simulated in this demo.')).toBe(true);
    expect(screen.getByTestId('hero').textContent).not.toMatch(/USDC|SOL/);
    expect(notch()).not.toMatch(/USDC|SOL/);
  });

  it('flag off: the v1.3 hero, no +N line, unfunded listings left out', () => {
    overview({ lockAtHire: false });
    expect(screen.getByText(HERO_V13.guest.sub)).toBeTruthy();
    expect(screen.queryByTestId('unfunded-count')).toBeNull();
    expect(notch()).toContain('1open jobs, each with its budget already locked');
  });
});

describe('Applicants → Select on a listing that locks when hired', () => {
  const business = Keypair.generate().publicKey;
  const mai = Keypair.generate().publicKey;
  const job = listing({ business, title: 'Open landing page', total: 30n * USDC, applicationCount: 1, unfunded: true, milestones: [{ index: 0, amount: 30n * USDC, workSecs: 3 * 86_400, reviewSecs: 86_400 }] });
  const apps: JobApplicationAccount[] = [{ address: Keypair.generate().publicKey, version: 1, job: job.address, freelancer: mai, createdAt: T0 + 10, pitch: 'Hi', bump: 1 }];
  const view = (balance?: bigint) =>
    wrap(<ApplicantsView job={job} applications={apps} names={{ [mai.toBase58()]: '@mai' }} records={{}} briefOk now={T0} me={business.toBase58()} balance={balance} />);

  it('sheet title, balance after, the bullets and the lock button', () => {
    view(100n * USDC);
    expect(screen.getByText('Locks when you select · 30.00 USDC')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Withdraw listing' })).toBeTruthy();
    fireEvent.click(within(screen.getByTestId('applicant')).getByRole('button', { name: 'Select' }));
    const sheet = screen.getByRole('dialog');
    expect(within(sheet).getByRole('heading').textContent).toBe('Select @mai and lock 30.00 USDC');
    expect(within(sheet).getByTestId('balance-after').textContent).toContain('70.00 USDC');
    expect(within(sheet).getAllByRole('listitem')).toHaveLength(3);
    expect(sheet.textContent).toContain('30.00 USDC is locked in the job now, in the same step');
    expect((within(sheet).getByRole('button', { name: 'Lock 30.00 USDC & select' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('balance too low: the V5 error, and the button is off', () => {
    view(10n * USDC);
    fireEvent.click(within(screen.getByTestId('applicant')).getByRole('button', { name: 'Select' }));
    const sheet = screen.getByRole('dialog');
    expect(within(sheet).getByRole('alert').textContent).toBe('You need 30.00 USDC to lock this budget when you select.');
    expect((within(sheet).getByRole('button', { name: 'Lock 30.00 USDC & select' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('a funded listing keeps the v1.3 sheet', () => {
    const fundedJob = { ...job, unfunded: false };
    wrap(<ApplicantsView job={fundedJob} applications={apps} names={{ [mai.toBase58()]: '@mai' }} records={{}} briefOk now={T0} me={business.toBase58()} balance={0n} />);
    fireEvent.click(within(screen.getByTestId('applicant')).getByRole('button', { name: 'Select' }));
    const sheet = screen.getByRole('dialog');
    expect(within(sheet).getByRole('heading').textContent).toBe('Select @mai?');
    expect(within(sheet).queryByTestId('balance-after')).toBeNull();
    expect(within(sheet).getByRole('button', { name: 'Create contract & select' })).toBeTruthy();
  });
});
