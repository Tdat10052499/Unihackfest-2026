import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Keypair } from '@solana/web3.js';
import type { ReactNode } from 'react';
import type { JobApplicationAccount } from '@ned/core/jobs/decode.ts';
import { AuthProvider } from '../../auth/AuthProvider.tsx';
import { WalletPanelProvider } from '../../components/WalletPanelContext.tsx';
import { ApplicantsView, withdrawReason } from '../pages/Applicants.tsx';
import { BRIEF_BAD, BRIEF_OK, JobDetailView, PITCH_HINT, type JobDetailViewProps } from '../pages/JobDetail.tsx';
import { initialForm, postProblems, toDraft } from '../pages/PostJob.tsx';
import { dueLabel, spanLabel } from '../labels.ts';
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

const business = Keypair.generate().publicKey;
const me = Keypair.generate().publicKey;
const fund = Keypair.generate().publicKey;
const job = listing({ business, title: 'Logo refresh', total: 20n * USDC, applicationCount: 4, milestones: [{ index: 0, amount: 20n * USDC, workSecs: 3 * 86_400, reviewSecs: 2 * 86_400 }] });
const brief = { status: 'ok' as const, brief: { v: 1, title: 'Logo refresh', scope: 'A cleaner wordmark.', references: ['https://example.com/menu'], milestones: [{ name: 'Two logo concepts', criteria: ['Two directions', 'Shown at 32 px'] }] } };
const app = (over: Partial<JobApplicationAccount> = {}): JobApplicationAccount => ({ address: Keypair.generate().publicKey, version: 1, job: job.address, freelancer: me, createdAt: T0 + 60, pitch: 'I design cafe logos.', bump: 1, ...over });
const detail = (over: Partial<JobDetailViewProps> = {}) =>
  wrap(<JobDetailView job={job} brief={brief} application={null} records={[]} businessName="@orbit_cafe" now={T0} vn={false} me={me.toBase58()} {...over} />);

describe('labels', () => {
  it('days on launch values, minutes and hours on devnet values', () => {
    expect(dueLabel(3 * 86_400, 2 * 86_400)).toBe('Due 3 days after you are selected · 2 days to review');
    expect(spanLabel(86_400)).toBe('1 day');
    expect(spanLabel(600)).toBe('10 min');
    expect(spanLabel(7_200)).toBe('2 h');
  });
});

describe('Job detail', () => {
  it('open: brief verified, scope with links, milestones, budget card, apply with a live 280-byte counter', () => {
    detail();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Logo refresh');
    expect(screen.getByText(BRIEF_OK)).toBeTruthy();
    expect(screen.getByRole('link', { name: /example.com\/menu/ }).getAttribute('href')).toBe('https://example.com/menu');
    expect(screen.getByText('Due 3 days after you are selected · 2 days to review')).toBeTruthy();
    expect(screen.getByText('Shown at 32 px')).toBeTruthy();
    expect(screen.getByText(/It goes back to @orbit_cafe only if nobody is hired/)).toBeTruthy();
    expect(screen.getByText('Counted from contracts on Solana. Not a rating.')).toBeTruthy();
    expect(screen.getByText('48 h (2 min on devnet)')).toBeTruthy();
    expect(screen.getByText(PITCH_HINT)).toBeTruthy();
    const apply = screen.getByRole('button', { name: 'Apply' }) as HTMLButtonElement;
    expect(apply.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Your pitch'), { target: { value: 'đ'.repeat(10) } });
    expect(screen.getByText('20 / 280')).toBeTruthy();
    expect(apply.disabled).toBe(false);
    fireEvent.change(screen.getByLabelText('Your pitch'), { target: { value: 'x'.repeat(281) } });
    expect(apply.disabled).toBe(true);
  });

  it('a brief that does not match warns; Vietnam view shows ≈ VND and the VND payout note', () => {
    const { container } = detail({ brief: { status: 'mismatch' }, vn: true });
    expect(screen.getByRole('alert').textContent).toBe(BRIEF_BAD);
    expect(container.textContent).toContain('≈ 520,000 VND (estimate)');
    expect(container.textContent).toContain('choose VND to your bank');
  });

  it('applied, selected (Review & accept in wallet), hired, own job, signed out', () => {
    detail({ application: app() });
    expect(screen.getByText(/^Applied · /)).toBeTruthy();
    expect(screen.getByText('I design cafe logos.')).toBeTruthy();
    cleanup();
    detail({ application: app(), job: { ...job, state: 'Selected', selected: me, selectedAt: T0, fund } });
    expect(screen.getByText('You were selected')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Review & accept in wallet/ })).toBeTruthy();
    cleanup();
    detail({ application: app(), job: { ...job, state: 'Filled', selected: me, fund } });
    expect(screen.getByRole('link', { name: 'Open contract' }).getAttribute('href')).toBe(`/contract/${fund.toBase58()}`);
    cleanup();
    detail({ me: business.toBase58() });
    expect(screen.getByRole('link', { name: 'Review applicants' })).toBeTruthy();
    cleanup();
    detail({ me: null });
    expect(screen.getByRole('link', { name: 'Sign in to apply' })).toBeTruthy();
  });
});

describe('Post a job', () => {
  it('the form becomes the core draft (days → seconds, brief from the milestones)', () => {
    const f = { ...initialForm(), title: ' Logo ', summary: 'A logo.', scope: 'Scope', references: 'https://a.example\n\n', milestones: [{ name: 'Concepts', amt: '12.5', due: '3', review: '2', done: 'Two\n Three \n' }] };
    const d = toDraft(f, T0);
    expect(d.title).toBe('Logo');
    expect(d.milestones).toEqual([{ amountUsdc: '12.5', workSecs: 3 * 86_400, reviewSecs: 2 * 86_400 }]);
    expect(d.brief).toEqual({ scope: 'Scope', references: ['https://a.example'], milestones: [{ name: 'Concepts', criteria: ['Two', 'Three'] }] });
    expect(d.applyBy).toBe(T0 + 3 * 86_400);
    expect(d.selectBy).toBe(T0 + 5 * 86_400);
    expect(postProblems(f, T0, 100n * USDC)).toEqual([]);
    expect(postProblems(f, T0, 10n * USDC)).toEqual(['Your wallet has 10.00 USDC.']);
    expect(postProblems(initialForm(), T0, 0n)).toContain('Add a title.');
    expect(postProblems({ ...f, summary: 's'.repeat(161) }, T0, 100n * USDC)).toContain('Shorten the summary to 160 bytes.');
  });
});

describe('Applicants', () => {
  const others = [app({ freelancer: Keypair.generate().publicKey, createdAt: T0 + 10, pitch: 'Second' }), app({ createdAt: T0 + 20, pitch: 'First' })];
  const view = (j = job, now = T0) =>
    wrap(<ApplicantsView job={j} applications={others} names={{}} records={{}} briefOk now={now} me={business.toBase58()} />);

  it('open with applicants: withdraw disabled with the reason; Select opens the sheet with absolute deadlines', () => {
    view();
    const withdraw = screen.getByRole('button', { name: 'Withdraw budget' }) as HTMLButtonElement;
    expect(withdraw.disabled).toBe(true);
    expect(screen.getByText(/^Withdraw opens after .* if you hire no one\./)).toBeTruthy();
    expect(screen.getAllByTestId('applicant').map((a) => within(a).getByText(/First|Second/).textContent)).toEqual(['First', 'Second']);
    fireEvent.click(within(screen.getAllByTestId('applicant')[0]).getByRole('button', { name: 'Select' }));
    const sheet = screen.getByRole('dialog');
    expect(sheet.textContent).toContain('This creates a contract with your brief and these deadlines, counted from now:');
    expect(sheet.textContent).toMatch(/Submit by .+ · review by .+/);
    expect(within(sheet).getByRole('button', { name: 'Create contract & select' })).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('waiting, accept time over (re-select), hired; withdraw reasons', () => {
    const selected = { ...job, state: 'Selected' as const, selected: me, selectedAt: T0, fund };
    view(selected, T0 + 30);
    expect(screen.getByText(/^Waiting for .* to accept · .* left$/)).toBeTruthy();
    cleanup();
    view(selected, T0 + 500);
    expect(screen.getByText(/didn't accept in time$/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Select again' })).toBeTruthy();
    cleanup();
    view({ ...selected, state: 'Filled' });
    expect(screen.getByText(/^Hired .* moved into the contract$/)).toBeTruthy();
    expect(screen.getAllByText('Not selected')).toHaveLength(1);
    expect(withdrawReason({ ...job, applicationCount: 0 }, T0, (w) => w)).toBe('No one has applied yet, so you can withdraw now.');
  });
});
