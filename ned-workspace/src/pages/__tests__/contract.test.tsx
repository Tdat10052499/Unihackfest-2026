import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { ReactNode } from 'react';
import { WalletPanelProvider } from '../../components/WalletPanelContext.tsx';
import { CLIENT, FREELANCER, SCENARIOS, scenarioView } from '../../dev/states.ts';
import { confirmFor } from '../../hooks/contractActions.ts';
import { ContractView } from '../Contract.tsx';
import { NOT_READY, REQUEST_INFO, ReviewView } from '../Review.tsx';

process.env.TZ = 'UTC';
afterEach(cleanup);
const wrap = (ui: ReactNode) => render(<WalletPanelProvider><MemoryRouter>{ui}</MemoryRouter></WalletPanelProvider>);
const content = { hasKey: true, ready: true, contentStatus: 'ok' as const, importKey: async () => false };
const S = (id: string) => SCENARIOS.find((s) => s.id === id)!;

function contract(id: string, role: 'client' | 'freelancer', opts: { p1?: boolean; vn?: boolean } = {}) {
  const run = vi.fn(async () => {});
  const s = S(id);
  const p1 = opts.p1 ?? true;
  wrap(<ContractView fund={scenarioView(s, role, opts.vn ? 'vn' : 'intl', p1)} raw={s.fund} content={content} vn={Boolean(opts.vn)} isParty p1={p1} actions={{ run, busy: null, status: '', error: '' }} />);
  return run;
}

describe('Contract page', () => {
  it('a Delivery line per submitted milestone, linking to the delivery', () => {
    contract('submitted', 'client');
    const line = screen.getByTestId('delivery-line');
    expect(line.textContent).toMatch(/^Submitted .* · 2 links · 1 file/);
    expect(within(line).getByRole('link', { name: 'View delivery' }).getAttribute('href')).toBe(`/contract/${S('submitted').fund.address.toBase58()}/review?i=0`);
    cleanup();
    contract('released', 'freelancer');
    expect(screen.getByTestId('delivery-line')).toBeTruthy();
  });

  it('U4: Release now for BOTH parties when the review time is over; Refund now when the submission deadline passed', () => {
    for (const role of ['client', 'freelancer'] as const) {
      const run = contract('review-over', role);
      const ms = screen.getByRole('group', { name: 'Milestone 1' });
      fireEvent.click(within(ms).getByRole('button', { name: 'Release now' }));
      expect(run).toHaveBeenCalledWith('releaseNow', 0);
      cleanup();
      const run2 = contract('submit-missed', role);
      fireEvent.click(within(screen.getByRole('group', { name: 'Milestone 1' })).getByRole('button', { name: 'Refund now' }));
      expect(run2).toHaveBeenCalledWith('refundNow', 0);
      cleanup();
    }
    contract('review-over', 'client', { vn: true });
    expect(within(screen.getByRole('group', { name: 'Milestone 1' })).queryByRole('button', { name: 'Release now' })).toBeNull();
  });

  it('a job contract never shows Lock; it shows Move locked budget', () => {
    const run = contract('job-accepted', 'client');
    expect(screen.queryByRole('button', { name: /^Lock/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Move locked budget' }));
    expect(run).toHaveBeenCalledWith('lockFromJob', 0);
  });

  it('D27: changes requested — freelancer sees the unmet points and reason, Send revised version, Propose a split, Return to client', () => {
    const run = contract('changes', 'freelancer');
    const banner = screen.getByTestId('d27-banner');
    expect(banner.textContent).toContain('Changes requested · send a revised version');
    expect(banner.textContent).toContain('Shown on light and dark backgrounds');
    expect(banner.textContent).toContain('Readable at 32 px');
    expect(banner.textContent).toContain('The dark background version is missing');
    expect(banner.textContent).toContain('No deadline while changes are requested. The amount stays locked until you both agree.');
    expect(within(banner).getByRole('link', { name: 'Send revised version' }).getAttribute('href')).toMatch(/\/submit\?i=0&mode=revision$/);
    expect(within(banner).getByRole('button', { name: 'Propose a split' })).toBeTruthy();
    fireEvent.click(within(banner).getByRole('button', { name: 'Return to client' }));
    expect(run).toHaveBeenCalledWith('concede', 0);
    cleanup();
    contract('changes', 'client');
    expect(screen.getByTestId('d27-banner').textContent).toContain('Changes requested · waiting for @vinh');
    cleanup();
    contract('revised', 'client');
    expect(screen.getByRole('link', { name: 'Review revised version' })).toBeTruthy();
  });

  it('split: the other side accepts with the same numbers; final files', () => {
    const run = contract('split', 'client');
    expect(screen.getByRole('status').textContent).toContain('@vinh proposed a split');
    fireEvent.click(screen.getAllByRole('button', { name: 'Accept split' })[0]);
    expect(run).toHaveBeenCalledWith('acceptSplit');
    cleanup();
    contract('released', 'freelancer');
    expect(screen.getByRole('link', { name: 'Hand over final files' }).getAttribute('href')).toMatch(/mode=handover$/);
    cleanup();
    contract('final-files', 'client');
    expect(screen.getByTestId('d27-banner').textContent).toContain('Final files received');
  });

  it('FEATURES.dispute off: no D27 control', () => {
    contract('changes', 'freelancer', { p1: false });
    expect(screen.queryByTestId('d27-banner')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Return to client' })).toBeNull();
  });

  it('confirm sheets: C4 wording and the Return to client sentence', () => {
    const s = S('changes');
    const asFreelancer = scenarioView(s, 'freelancer');
    expect(confirmFor('concede', asFreelancer, s.fund, 0).note?.text).toBe("This refunds milestone 1 (8.00 USDC) to @mia. You can't undo it.");
    expect(confirmFor('releaseNow', scenarioView(s, 'client'), s.fund, 0).rows.find((r) => r.label === 'To')?.sub).toBe('Through the payout partner, sent as VND (simulated)');
    expect(confirmFor('proposeSplit', asFreelancer, s.fund, 0, 5_000_000n).note?.text).toBe('A split settles every milestone that is still open in this contract, not only this one.');
  });

  it('A4 (CL review 7 Oct): confirm sheets in the Vietnam view show ≈ VND and no SOL amount', () => {
    const s = S('changes');
    const vnFreelancer = scenarioView(s, 'freelancer', 'vn');
    for (const sheet of [confirmFor('concede', vnFreelancer, s.fund, 0), confirmFor('proposeSplit', vnFreelancer, s.fund, 0, 5_000_000n)]) {
      const text = JSON.stringify(sheet);
      expect(text).not.toContain('USDC');
      expect(text).not.toMatch(/0\.000005|~0\.0/);
      expect(text).toContain('VND (estimate)');
      expect(sheet.rows.find((r) => r.label === 'Network fee')?.value).toBe('Test SOL on devnet');
    }
  });
});

function review(id: string, role: 'client' | 'freelancer', p1 = true) {
  const s = S(id);
  const onRequestChanges = vi.fn(async () => {});
  wrap(
    <ReviewView fund={scenarioView(s, role, 'intl', p1)} raw={s.fund} index={0} now={s.now} vn={false} me={(role === 'client' ? CLIENT : FREELANCER).toBase58()} content={content} p1={p1} status="" onRelease={async () => {}} onRequestChanges={onRequestChanges} />
  );
  return onRequestChanges;
}

describe('Review page', () => {
  it('side by side, link cards with Fixed version, optional file check, only Accept & release and Request changes', () => {
    review('submitted', 'client');
    expect(screen.getByRole('heading', { name: 'What to check' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'What @vinh delivered' })).toBeTruthy();
    const cards = screen.getAllByTestId('link-card');
    expect(cards[0].textContent).toContain('Fixed version');
    expect(cards[1].textContent).not.toContain('Fixed version');
    expect(screen.getByText('Optional · Check a file you received')).toBeTruthy();
    expect(screen.getByTestId('integrity').textContent).toBe('Same delivery that was submitted ✓');
    const buttons = screen.getAllByRole('button').map((b) => b.textContent);
    expect(buttons).toContain('Accept & release');
    expect(buttons).toContain('Request changes');
    expect(buttons.some((t) => /Reject|Refund/.test(t ?? ''))).toBe(false);
    expect(screen.getByTestId('bottom-line').textContent).toBe(NOT_READY('@vinh', S('submitted').fund.milestones[0].reviewBy));
  });

  it('the Request changes sheet needs one unmet point and sends the review', () => {
    const send = review('submitted', 'client');
    fireEvent.click(screen.getByRole('button', { name: 'Request changes' }));
    const sheet = screen.getByRole('dialog');
    expect(sheet.textContent).toContain(REQUEST_INFO('@vinh'));
    const go = within(sheet).getByRole('button', { name: 'Request changes' }) as HTMLButtonElement;
    expect(go.disabled).toBe(true);
    fireEvent.click(within(sheet).getByLabelText('Readable at 32 px'));
    fireEvent.change(within(sheet).getByLabelText('Reason'), { target: { value: 'Icon breaks up at 32 px.' } });
    expect(go.disabled).toBe(false);
    fireEvent.click(go);
    expect(send).toHaveBeenCalledWith({ unmet: [2], reason: 'Icon breaks up at 32 px.' }, false);
  });

  it('revisions: version switcher and the revision integrity line; final files; freelancer read-only', () => {
    review('revised', 'client');
    const tabs = screen.getAllByRole('tab').map((t) => t.textContent);
    expect(tabs).toEqual(['Version 1', 'Version 2 (revised)']);
    expect(screen.getByTestId('integrity').textContent).toContain('Revised version, signed by @vinh');
    fireEvent.click(screen.getByRole('tab', { name: 'Version 1' }));
    expect(screen.getByTestId('integrity').textContent).toBe('Same delivery that was submitted ✓');
    cleanup();
    review('final-files', 'client');
    expect(screen.getByTestId('final-files').textContent).toContain('Final SVG and PNG files');
    cleanup();
    review('submitted', 'freelancer');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('What you delivered');
    expect(screen.queryByRole('button', { name: 'Accept & release' })).toBeNull();
  });

  it('FEATURES.dispute off: no Request changes', () => {
    review('submitted', 'client', false);
    expect(screen.queryByRole('button', { name: 'Request changes' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Accept & release' })).toBeTruthy();
  });
});
