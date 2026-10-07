import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { ReactNode } from 'react';
import { WalletPanelProvider } from '../../components/WalletPanelContext.tsx';
import { CLIENT, FREELANCER, SCENARIOS, scenarioView } from '../../dev/states.ts';
import { confirmFor } from '../../hooks/contractActions.ts';
import { ContractView } from '../Contract.tsx';
import { NO_POINTS, NOT_READY, REQUEST_INFO, ReviewView } from '../Review.tsx';
import { BLANK_HINT, FRAME_SANDBOX, NOT_EMBEDDABLE } from '../../components/PreviewFrame.tsx';

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
  it('R2 layout: delivery with link tabs and the PreviewFrame, What to check, integrity, only Accept & release and Request changes', () => {
    review('submitted', 'client');
    expect(screen.getByRole('heading', { name: 'What to check' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'What @vinh delivered' })).toBeTruthy();
    expect(screen.getByText('on time')).toBeTruthy();
    expect(within(screen.getByRole('tablist', { name: 'Links' })).getAllByRole('tab')).toHaveLength(2);
    const frame = screen.getByTestId('preview-frame');
    expect(frame.getAttribute('data-kind')).toBe('frame');
    expect(frame.textContent).toContain('Figma');
    expect(frame.textContent).toContain('Fixed version');
    expect(within(frame).getByRole('link', { name: 'Open in a new tab ↗' }).getAttribute('href')).toBe('https://www.figma.com/file/abc/Logo?version-id=2214');
    expect(frame.textContent).toContain(BLANK_HINT('@vinh'));
    expect(screen.getByTestId('integrity').textContent).toBe('Same delivery that was submitted ✓');
    const buttons = screen.getAllByRole('button').map((b) => b.textContent);
    expect(buttons).toContain('Accept & release');
    expect(buttons).toContain('Request changes');
    expect(buttons.some((t) => /Reject|Refund/.test(t ?? ''))).toBe(false);
    expect(screen.getByTestId('bottom-line').textContent).toBe(NOT_READY('@vinh', S('submitted').fund.milestones[0].reviewBy));
  });

  it('R2: nothing is requested from the preview site before "Load preview"; the click is remembered on the page', () => {
    review('submitted', 'client');
    expect(document.querySelector('iframe')).toBeNull();
    expect(document.querySelector('img[referrerpolicy]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Load preview' }));
    const iframe = document.querySelector('iframe')!;
    expect(iframe.getAttribute('src')).toBe(`https://www.figma.com/embed?embed_host=ned&url=${encodeURIComponent('https://www.figma.com/file/abc/Logo?version-id=2214')}`);
    expect(iframe.getAttribute('title')).toBe('Preview of the delivery on Figma');
    expect(iframe.getAttribute('sandbox')).toBe(FRAME_SANDBOX);
    expect(iframe.getAttribute('referrerpolicy')).toBe('no-referrer');
    expect(iframe.getAttribute('loading')).toBe('lazy');
    // the second link is a Drive folder: not embeddable, a link card with the reason
    fireEvent.click(within(screen.getByRole('tablist', { name: 'Links' })).getAllByRole('tab')[1]);
    expect(screen.getByTestId('preview-frame').getAttribute('data-kind')).toBe('link');
    expect(screen.getByText(NOT_EMBEDDABLE)).toBeTruthy();
    fireEvent.click(within(screen.getByRole('tablist', { name: 'Links' })).getAllByRole('tab')[0]);
    expect(document.querySelector('iframe')).toBeTruthy();
  });

  it('R2: review has no drop zone; listed files show name, size and a short fingerprint only', () => {
    review('submitted', 'client');
    expect(document.querySelector('input[type=file]')).toBeNull();
    expect(screen.queryByText('Optional · Check a file you received')).toBeNull();
    const files = screen.getByTestId('files-listed');
    expect(files.textContent).toContain('Files listed (fingerprints only)');
    expect(files.textContent).toContain('concepts-preview.png');
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

describe('R2 request sheet without done-when points', () => {
  it('no checklist; the reason is required: 9 characters stay disabled, 10 send', () => {
    const s = S('submitted');
    const fund = scenarioView(s, 'client', 'intl', true);
    fund.milestones[0] = { ...fund.milestones[0], criteria: [] };
    const send = vi.fn(async () => {});
    wrap(<ReviewView fund={fund} raw={s.fund} index={0} now={s.now} vn={false} me={CLIENT.toBase58()} content={content} p1 status="" onRelease={async () => {}} onRequestChanges={send} />);
    expect(screen.getByTestId('no-points').textContent).toBe(NO_POINTS);
    fireEvent.click(screen.getByRole('button', { name: 'Request changes' }));
    const sheet = screen.getByRole('dialog');
    expect(sheet.textContent).toContain('Say what is missing and what would make it acceptable.');
    expect(within(sheet).queryAllByRole('checkbox')).toHaveLength(0);
    const go = within(sheet).getByRole('button', { name: 'Request changes' }) as HTMLButtonElement;
    fireEvent.change(within(sheet).getByLabelText('Reason (required)'), { target: { value: '123456789' } });
    expect(go.disabled).toBe(true);
    expect(sheet.textContent).toContain('9/500');
    fireEvent.change(within(sheet).getByLabelText('Reason (required)'), { target: { value: 'Add the dark version.' } });
    expect(go.disabled).toBe(false);
    fireEvent.click(go);
    expect(send).toHaveBeenCalledWith({ unmet: [], reason: 'Add the dark version.' }, false);
  });

  it('a wallet error shows in the sheet, which stays open', async () => {
    const s = S('submitted');
    const send = vi.fn(async () => {
      throw new Error('User rejected the request.');
    });
    wrap(<ReviewView fund={scenarioView(s, 'client', 'intl', true)} raw={s.fund} index={0} now={s.now} vn={false} me={CLIENT.toBase58()} content={content} p1 status="" onRelease={async () => {}} onRequestChanges={send} />);
    fireEvent.click(screen.getByRole('button', { name: 'Request changes' }));
    const sheet = screen.getByRole('dialog');
    fireEvent.click(within(sheet).getByLabelText('Readable at 32 px'));
    await act(async () => {
      fireEvent.click(within(sheet).getByRole('button', { name: 'Request changes' }));
    });
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(within(screen.getByRole('dialog')).getByRole('alert').textContent).toBeTruthy();
  });
});
