// F2 (final files on the Workspace): the promised list at submit, "What you will receive" and the no-enforcement line
// in Review, the Final files card in each state, Download, "Check your download", the receipt, the Files section, the
// close warning, the hand-over page before release, and the bell notices.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { ReactNode } from 'react';
import { createHash } from 'node:crypto';
import { FINALS_NEEDED, PREVIEW_IS_FINAL, type FileFingerprint } from '@ned/core/milestone/content.ts';
import type { ReleaseRecord } from '@ned/core/milestone/records.ts';
import type { FundView } from '@ned/core/milestone/view.ts';
import { CHECK_CHIP, FinalFilesCard, FIXED_IS_FINAL, LINKS_EXPIRE, NO_ENFORCEMENT } from '../../components/FinalFilesCard.tsx';
import { WalletPanelProvider } from '../../components/WalletPanelContext.tsx';
import { FINALS, SCENARIOS, scenarioView } from '../../dev/states.ts';
import { downloadHref, finalsNotices, receiptName } from '../../lib/finalFiles.ts';
import { CLOSE_WARNING, ContractView, milestonesLabel } from '../Contract.tsx';
import { ReviewView } from '../Review.tsx';
import { FINALS_HINT, FIXED_FINAL, HANDOVER_TOO_EARLY, SubmitView, type SubmitMode } from '../Submit.tsx';

process.env.TZ = 'UTC';
afterEach(cleanup);
const wrap = (ui: ReactNode) => render(<WalletPanelProvider><MemoryRouter>{ui}</MemoryRouter></WalletPanelProvider>);
const S = (id: string) => SCENARIOS.find((s) => s.id === id)!;
const H = 3600;
const release = (id: string, hoursAgo: number): ReleaseRecord => ({
  id: 'x:0',
  fund: S(id).fund.address.toBase58(),
  index: 0,
  title: '',
  client: '',
  amountUnits: '8000000',
  releasedAt: S(id).now - hoursAgo * H,
  signature: 'RelSig',
  destination: 'ownWallet',
  by: 'approve',
});

function submit(id: string, mode: SubmitMode) {
  const s = S(id);
  const onSend = vi.fn(async () => {});
  const content = { hasKey: true, contentStatus: 'ok' as const, content: s.content, importKey: async () => false };
  wrap(<SubmitView fund={scenarioView(s, 'freelancer')} raw={s.fund} index={0} now={s.now} vn={false} content={content} mode={mode} initialType="writing" status="" onSend={onSend} />);
  return onSend;
}
const pick = async (region: string, file: File) => {
  const input = screen.getByRole('region', { name: new RegExp(`^${region}`) }).querySelector('input[type=file]') as HTMLInputElement;
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } });
  });
};
const addLink = (url: string) => {
  fireEvent.change(screen.getByLabelText('Add a link'), { target: { value: url } });
  fireEvent.click(screen.getByRole('button', { name: 'Add' }));
};
const submitButton = () => screen.getByRole('button', { name: /^Submit milestone 1$/ });

describe('Submit: the promised list', () => {
  it('required with a plain link; the picked final files are sent with their count', async () => {
    const send = submit('funded', 'submit');
    addLink('https://drive.google.com/file/d/1Preview/view');
    const section = screen.getByTestId('finals-section');
    expect(section.textContent).toContain('Final files you will hand over after release');
    expect(section.textContent).toContain('required');
    expect(section.textContent).toContain(FINALS_HINT('@mia'));
    await act(async () => {
      fireEvent.click(submitButton());
    });
    expect(send).not.toHaveBeenCalled();
    expect(screen.getByText(FINALS_NEEDED)).toBeTruthy();
    await pick('Final files you will hand over', new File(['final svg'], 'logo.svg'));
    await waitFor(() => expect(within(section).getByText('logo.svg')).toBeTruthy());
    await act(async () => {
      fireEvent.click(submitButton());
    });
    expect(send).toHaveBeenCalledOnce();
    const [delivery, summary] = send.mock.calls[0] as unknown as [{ finals: FileFingerprint[] }, { finals: number }];
    expect(delivery.finals.map((f) => f.name)).toEqual(['logo.svg']);
    expect(summary.finals).toBe(1);
  });

  it('optional with a fixed-version link', async () => {
    const send = submit('funded', 'submit');
    addLink('https://www.figma.com/design/AbC/Logo?version-id=2214');
    expect(screen.getByTestId('finals-section').textContent).toContain(FIXED_FINAL);
    await act(async () => {
      fireEvent.click(submitButton());
    });
    expect(send).toHaveBeenCalledOnce();
  });

  it('the preview cannot be a promised file', async () => {
    const send = submit('funded', 'submit');
    addLink('https://drive.google.com/file/d/1Preview/view');
    const same = () => new File(['the same bytes'], 'logo.png');
    await pick('Preview files', same());
    await pick('Final files you will hand over', same());
    await waitFor(() => expect(within(screen.getByTestId('finals-section')).getByText('logo.png')).toBeTruthy());
    await act(async () => {
      fireEvent.click(submitButton());
    });
    expect(send).not.toHaveBeenCalled();
    expect(screen.getByText(PREVIEW_IS_FINAL)).toBeTruthy();
  });

  it('the hand-over page is closed before release', () => {
    submit('submitted', 'handover');
    expect(screen.getByTestId('handover-too-early').textContent).toContain(HANDOVER_TOO_EARLY);
    expect(screen.queryByRole('button', { name: 'Hand over final files' })).toBeNull();
  });
});

const content = { hasKey: true, ready: true, contentStatus: 'ok' as const, importKey: async () => false };

describe('Review before the decision', () => {
  it('"What you will receive after release" and the no-enforcement line', () => {
    const s = S('submitted');
    wrap(<ReviewView fund={scenarioView(s, 'client')} raw={s.fund} index={0} now={s.now} vn={false} me={scenarioView(s, 'client').milestones[0] ? s.fund.client.toBase58() : ''} content={content} p1 status="" onRelease={async () => {}} onRequestChanges={async () => {}} />);
    const card = screen.getByTestId('will-receive');
    expect(card.textContent).toContain('What you will receive after release');
    for (const f of FINALS) expect(card.textContent).toContain(f.name);
    expect(screen.getByTestId('no-enforcement').textContent).toBe(NO_ENFORCEMENT('@vinh'));
  });
});

function card(id: string, role: 'client' | 'freelancer', opts: { release?: ReleaseRecord; ms?: (f: FundView) => FundView['milestones'][number]; onSave?: (n: string, d: unknown) => void } = {}) {
  const s = S(id);
  const fund = scenarioView(s, role);
  const ms = opts.ms ? opts.ms(fund) : fund.milestones[0];
  wrap(
    <FinalFilesCard
      fundAddress={fund.address}
      title={fund.title}
      raw={s.fund}
      ms={ms}
      role={role}
      other={role === 'client' ? '@vinh' : '@mia'}
      now={s.now}
      {...(opts.release ? { release: opts.release } : {})}
      {...(role === 'freelancer' ? { handoverHref: '/contract/x/submit?i=0&mode=handover' } : {})}
      {...(opts.onSave ? { onSave: opts.onSave } : {})}
    />
  );
  return screen.getByTestId('final-files');
}

describe('Final files card', () => {
  it('waiting: since the release time, the promised list in grey; the freelancer gets "Hand over final files"', () => {
    let el = card('released', 'client', { release: release('released', 2) });
    expect(el.getAttribute('data-state')).toBe('waiting');
    expect(el.textContent).toMatch(/Waiting for final files from @vinh · since \d+ Oct, \d\d:\d\d/);
    expect(within(el).getByTestId('promised-list').textContent).toContain('usage-sheet.pdf');
    cleanup();
    el = card('released', 'freelancer', { release: release('released', 2) });
    expect(within(el).getByRole('link', { name: 'Hand over final files' }).getAttribute('href')).toContain('mode=handover');
  });

  it('late after 48 hours (a reminder only); without a release time it stays waiting', () => {
    let el = card('released', 'client', { release: release('released', 50) });
    expect(el.getAttribute('data-state')).toBe('late');
    expect(el.textContent).toContain('Late · 50 hours after release');
    cleanup();
    el = card('released', 'client');
    expect(el.getAttribute('data-state')).toBe('waiting');
    expect(el.textContent).toContain('Waiting for final files from @vinh');
  });

  it('handed over: version, Download with the Drive direct address, chips, receipt, footer line', () => {
    const onSave = vi.fn();
    const el = card('final-files', 'client', { release: release('final-files', 10), onSave });
    expect(el.getAttribute('data-state')).toBe('handed-over');
    expect(el.textContent).toMatch(/Handed over .* · for Version 1, accepted /);
    const dl = within(el).getByTestId('download');
    expect(dl.getAttribute('href')).toBe('https://drive.google.com/uc?export=download&id=1FinalLogoFilesZip');
    expect(dl.getAttribute('rel')).toBe('noopener noreferrer');
    expect(within(el).getAllByText('Same as promised')).toHaveLength(3);
    expect(el.textContent).toContain(LINKS_EXPIRE('@vinh'));
    fireEvent.click(within(el).getByRole('button', { name: 'Save receipt' }));
    const [name, data] = onSave.mock.calls[0] as [string, Record<string, unknown>];
    expect(name).toBe(receiptName(S('final-files').fund.address.toBase58(), 0));
    expect(name).toMatch(/^ned-receipt-.{8}-m1\.json$/);
    expect(Object.keys(data)).toEqual(['contract', 'acceptedVersion', 'promised', 'handover', 'release', 'check', 'program', 'note']);
    expect((data.release as { signature: string }).signature).toBe('RelSig');
    expect((data.promised as FileFingerprint[]).length).toBe(3);
  });

  it('check your download: same, different, not in the list; kept only on the page', async () => {
    const bytes = { svg: 'final svg bytes', png: 'final png bytes' };
    const sha = (t: string) => createHash('sha256').update(t).digest('hex');
    const promised = [
      { name: 'logo.svg', size: bytes.svg.length, sha256: sha(bytes.svg) },
      { name: 'logo@2x.png', size: bytes.png.length, sha256: sha(bytes.png) },
    ];
    const el = card('final-files', 'client', {
      ms: (f) => {
        const m = f.milestones[0];
        const deliveries = m.history!.deliveries.map((d) => ({ ...d, content: { ...d.content, ...(d.stage === 'handover' ? { files: promised } : { finals: promised }) } }));
        return { ...m, history: { ...m.history!, deliveries } };
      },
    });
    const input = within(el).getByTestId('check-download').querySelector('input[type=file]') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, { target: { files: [new File([bytes.svg], 'logo.svg'), new File(['edited png'], 'logo@2x.png'), new File(['x'], 'notes.txt')] } });
    });
    await waitFor(() => expect(within(el).getByTestId('check-results')).toBeTruthy());
    const chips = within(el).getByTestId('check-results').textContent!;
    expect(chips).toContain(CHECK_CHIP.same);
    expect(chips).toContain(CHECK_CHIP.different);
    expect(chips).toContain(CHECK_CHIP.extra);
  });

  it('refunded and split: no final files', () => {
    let el = card('refunded', 'client');
    expect(el.textContent).toContain('No final files: this milestone was refunded.');
    cleanup();
    el = card('split-settled', 'freelancer');
    expect(el.textContent).toContain('No final files: this milestone was split.');
    expect(el.textContent).toContain('Agree which files are handed over as part of the split.');
  });

  it('a fixed-version link and no list: the link is the final work', () => {
    const el = card('released', 'client', {
      ms: (f) => {
        const m = f.milestones[0];
        return { ...m, history: { ...m.history!, deliveries: m.history!.deliveries.map((d) => ({ ...d, content: { ...d.content, finals: [] } })) } };
      },
    });
    expect(el.textContent).toContain(FIXED_IS_FINAL);
  });
});

describe('Contract page: Files section and the close warning', () => {
  const view = (id: string, role: 'client' | 'freelancer', fund?: FundView) => {
    const s = S(id);
    wrap(<ContractView fund={fund ?? scenarioView(s, role)} raw={s.fund} content={content} vn={false} isParty p1 actions={{ run: vi.fn(), busy: null, status: '', error: '' }} releases={[release(id, 5)]} now={s.now} />);
  };

  it('one row per milestone with its hand-over status; the client banner reads "View status" while waiting', () => {
    view('released', 'client');
    const rows = screen.getAllByTestId('files-row');
    expect(rows.map((r) => r.querySelector('span')?.nextElementSibling?.textContent)).toEqual(['Waiting for final files · Version 1', 'Before release']);
    expect(screen.getByRole('link', { name: 'View status' }).getAttribute('href')).toBe('#files-m1');
  });

  it('closing with a released milestone and no hand-over asks first: Keep open or Close anyway', () => {
    const s = S('released');
    const fund = { ...scenarioView(s, 'client'), nextAction: { kind: 'close' as const, label: 'Close the contract' } };
    view('released', 'client', fund);
    fireEvent.click(screen.getByRole('button', { name: 'Open in wallet' }));
    expect(screen.getByTestId('close-warning').textContent).toBe(CLOSE_WARNING('@vinh', 'milestone 1'));
    expect(milestonesLabel([0, 1])).toBe('milestones 1 and 2');
    expect(milestonesLabel([0, 1, 2])).toBe('milestones 1, 2 and 3');
    fireEvent.click(screen.getByRole('button', { name: 'Keep open' }));
    expect(screen.queryByTestId('close-warning')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Open in wallet' }));
    expect(screen.getByRole('button', { name: 'Close anyway' })).toBeTruthy();
  });
});

describe('download address and bell notices', () => {
  it('a single Drive file downloads directly; other links open as given', () => {
    expect(downloadHref('https://drive.google.com/file/d/1AbC/view?usp=sharing')).toEqual({ href: 'https://drive.google.com/uc?export=download&id=1AbC', direct: true });
    expect(downloadHref('https://drive.google.com/drive/folders/final')).toEqual({ href: 'https://drive.google.com/drive/folders/final', direct: false });
    expect(downloadHref('https://www.dropbox.com/s/x/logo.zip')).toEqual({ href: 'https://www.dropbox.com/s/x/logo.zip', direct: false });
  });

  it('freelancer: due at 24 h and 48 h without a hand-over; client: received once', () => {
    const r = 1_000_000;
    const w = (handed: boolean, role: 'client' | 'freelancer') => [{ fund: 'F', index: 0, title: 'Logo refresh', role, releasedAt: r, handed }];
    expect(finalsNotices(w(false, 'freelancer'), { 'F:0': false }, r + 23 * H, r + 25 * H).map((n) => n.title)).toEqual(['Final files for milestone 1 are due']);
    expect(finalsNotices(w(false, 'freelancer'), { 'F:0': false }, r + 47 * H, r + 49 * H).map((n) => n.id)).toEqual(['finals:F:0:due48']);
    expect(finalsNotices(w(true, 'freelancer'), { 'F:0': false }, r + 23 * H, r + 49 * H)).toEqual([]);
    expect(finalsNotices(w(false, 'freelancer'), {}, null, r + 49 * H)).toEqual([]);
    expect(finalsNotices(w(true, 'client'), { 'F:0': false }, r, r + H).map((n) => n.title)).toEqual(['Final files received · milestone 1']);
    expect(finalsNotices(w(true, 'client'), { 'F:0': true }, r, r + H)).toEqual([]);
    expect(finalsNotices(w(true, 'client'), {}, r, r + H)).toEqual([]);
  });
});
