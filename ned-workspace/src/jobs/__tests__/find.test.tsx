import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { Keypair } from '@solana/web3.js';
import type { JobApplicationAccount } from '@ned/core/jobs/decode.ts';
import { skillsMask } from '@ned/core/jobs/taxonomy.ts';
import { applicationRows, budgetLabel, filterChips, listingRows, sheetCount, viewFromQuery, viewToQuery } from '../find.ts';
import { FindView, NO_MATCH, type FindViewProps } from '../pages/Find.tsx';
import { listing, T0, USDC } from './fixture.ts';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const me = Keypair.generate().publicKey;
const design = (i: number, over = {}) => listing({ title: `Design job ${i}`, category: 0, createdAt: T0 + i, total: BigInt(5 + i) * USDC, skills: skillsMask([3]), ...over });
const jobs = [
  ...Array.from({ length: 11 }, (_, i) => design(i)),
  listing({ title: 'Translate onboarding', category: 2, createdAt: T0 + 100, total: 15n * USDC, skills: skillsMask([12]) }),
];

let where = '';
function Spy() {
  const l = useLocation();
  where = l.search;
  return null;
}
const base: FindViewProps = { open: jobs, openLoading: false, openError: false, onRetry: () => {}, applications: [], listings: [], signedIn: true, vn: false, me: me.toBase58(), names: {}, now: T0 };
const show = (url: string, over: Partial<FindViewProps> = {}) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/jobs/find" element={<><FindView {...base} {...over} /><Spy /></>} />
      </Routes>
    </MemoryRouter>
  );
const titles = () => screen.queryAllByTestId('job-card').map((c) => c.querySelector('h3')?.textContent);
const rows = () => screen.queryAllByTestId('job-row').map((r) => r.getAttribute('aria-label')?.split(',')[0]);

describe('URL state', () => {
  it('filters, sort, view and tab round-trip through the query (core key order)', () => {
    const q = viewToQuery({ q: 'logo', cat: 'design', budget: '20to50', skills: ['figma'], dur: '1w', ms: '1', soon: true, hide: true, sort: 'budget', view: 'list' }, 'applied');
    expect(q).toBe('q=logo&cat=design&budget=20to50&skills=figma&dur=1w&ms=1&soon=24h&hide=applied&sort=budget&view=list&tab=applied');
    expect(viewFromQuery(q)).toEqual({ filters: { q: 'logo', cat: 'design', budget: '20to50', skills: ['figma'], dur: '1w', ms: '1', soon: true, hide: true, sort: 'budget', view: 'list' }, tab: 'applied' });
    expect(viewFromQuery('tab=nope').tab).toBe('open');
    expect(budgetLabel('lt20', true)).toBe('Under ≈ 520,000 VND');
    expect(budgetLabel('20to50', true)).toBe('≈ 520,000 – 1,301,000 VND');
  });

  it('chips: one per filter, each removes only itself; the sheet count', () => {
    const f = { cat: 'design', budget: 'lt20' as const, skills: ['figma', 'ui-ux'], ms: '1' as const, soon: true };
    const chips = filterChips(f, false);
    expect(chips.map((c) => c.label)).toEqual(['Design', 'Under 20 USDC', 'Figma', 'UI/UX', '1 milestone', 'Apply by within 24 h']);
    expect(chips[2].without.skills).toEqual(['ui-ux']);
    expect(chips[1].without.budget).toBeUndefined();
    expect(sheetCount(f)).toBe(4);
  });

  it('a filtered URL reopens the same results, view and tab', () => {
    show('/jobs/find?cat=writing');
    expect(titles()).toEqual(['Translate onboarding']);
    expect(screen.getByTestId('result-count').textContent).toBe('1 job match');
    expect(screen.getByRole('button', { name: /Field/ }).textContent).toContain('Writing & Translation');
    cleanup();
    show('/jobs/find?cat=design&sort=budget&budget=gt50');
    expect(titles()).toEqual([]);
    expect(screen.getByRole('status').textContent).toContain(NO_MATCH);
    cleanup();
    show('/jobs/find?cat=design&sort=budget&budget=lt20&view=list');
    expect(rows()).toEqual(['Design job 10', 'Design job 9', 'Design job 8', 'Design job 7', 'Design job 6', 'Design job 5', 'Design job 4', 'Design job 3', 'Design job 2']);
    expect(screen.getByRole('button', { name: 'List' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByLabelText('Sort')).toHaveProperty('value', 'budget');
  });
});

describe('Find jobs v4', () => {
  it('title row and tabs with count badges', () => {
    show('/jobs/find');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Find jobs, locked before you accept');
    expect(screen.getByTestId('find-summary').textContent).toBe('12 open jobs · 125.00 USDC locked on Solana');
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Open jobs12', 'My applications0', 'My listings0']);
  });

  it('Field popover: two columns of counts, picking writes cat; Escape closes and one popover at a time', () => {
    show('/jobs/find?budget=lt20');
    const field = screen.getByRole('button', { name: /Field/ });
    fireEvent.click(field);
    const pop = screen.getByRole('dialog', { name: 'Choose a field' });
    expect(within(pop).getByRole('button', { name: /All fields/ }).textContent).toBe('All fields12 open jobs');
    expect(within(pop).getByRole('button', { name: /^Design/ }).textContent).toBe('Design11 open jobs');
    expect(field.getAttribute('aria-expanded')).toBe('true');
    fireEvent.pointerDown(screen.getByRole('button', { name: /Budget/ }));
    fireEvent.click(screen.getByRole('button', { name: /Budget/ }));
    expect(screen.queryByRole('dialog', { name: 'Choose a field' })).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Choose a budget' })).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(field);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^Writing/ }));
    expect(where).toBe('?cat=writing&budget=lt20');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Budget popover: radio rows with counts; ≈ VND ranges in the Vietnam view', () => {
    show('/jobs/find', { vn: true });
    fireEvent.click(screen.getByRole('button', { name: /Budget/ }));
    const radios = within(screen.getByRole('dialog', { name: 'Choose a budget' })).getAllByRole('radio');
    expect(radios.map((r) => r.textContent)).toEqual(['Any budget12 open jobs', 'Under ≈ 520,000 VND12 open jobs', '≈ 520,000 – 1,301,000 VND0 open jobs', 'Over ≈ 1,301,000 VND0 open jobs']);
    expect(radios[0].getAttribute('aria-checked')).toBe('true');
    fireEvent.click(radios[2]);
    expect(where).toBe('?budget=20to50');
    expect(document.body.textContent).not.toContain('USDC');
  });

  it('9 at a time, Show all / Show fewer; grid and list', () => {
    show('/jobs/find');
    expect(screen.getAllByTestId('job-card')).toHaveLength(9);
    fireEvent.click(screen.getByRole('button', { name: /Show all 12 jobs/ }));
    expect(screen.getAllByTestId('job-card')).toHaveLength(12);
    fireEvent.click(screen.getByRole('button', { name: /Show fewer jobs/ }));
    expect(screen.getAllByTestId('job-card')).toHaveLength(9);
    fireEvent.click(screen.getByRole('button', { name: 'List' }));
    expect(where).toBe('?view=list');
    expect(screen.getAllByTestId('job-row')).toHaveLength(9);
    expect(screen.queryByTestId('job-card')).toBeNull();
  });

  it('Filters sheet: badge, skills, segmented, switches, Clear these, Show N jobs', () => {
    show('/jobs/find?sort=soon');
    fireEvent.click(screen.getByRole('button', { name: /^Filters/ }));
    const sheet = screen.getByRole('dialog', { name: 'Filters' });
    fireEvent.click(within(sheet).getByRole('button', { name: 'Figma' }));
    fireEvent.click(within(sheet).getByRole('radio', { name: '1' }));
    fireEvent.click(within(sheet).getByRole('switch', { name: /Apply by within 24 hours/ }));
    expect(where).toBe('?skills=figma&ms=1&soon=24h&sort=soon');
    expect(within(sheet).getByRole('button', { name: 'Figma' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: /^Filters/ }).textContent).toContain('3');
    expect(within(sheet).getByRole('button', { name: /^Show \d+ jobs?$/ })).toBeTruthy();
    fireEvent.click(within(sheet).getByRole('button', { name: 'Clear these' }));
    expect(where).toBe('?sort=soon');
    fireEvent.click(within(sheet).getByRole('button', { name: /^Show 12 jobs$/ }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('chips remove one filter; Clear all keeps sort and view; Share copies the URL', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    show('/jobs/find?cat=design&skills=figma&sort=soon&view=list');
    fireEvent.click(screen.getByRole('button', { name: 'Remove filter Figma' }));
    expect(where).toBe('?cat=design&sort=soon&view=list');
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(where).toBe('?sort=soon&view=list');
    expect(screen.queryByRole('button', { name: 'Clear all' })).toBeNull();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Copy a link to this search' })));
    expect(writeText).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Link to this search copied' }).textContent).toBe('Copied');
  });

  it('the What box writes q to the URL 150 ms after typing; the search button at once', () => {
    vi.useFakeTimers();
    show('/jobs/find');
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search jobs' }), { target: { value: 'translate' } });
    expect(where).toBe('');
    act(() => vi.advanceTimersByTime(160));
    expect(where).toBe('?q=translate');
    expect(titles()).toEqual(['Translate onboarding']);
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search jobs' }), { target: { value: 'design job 1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(where).toBe('?q=design+job+1');
  });

  it('no match: "No open jobs match, yet" and Clear all filters', () => {
    show('/jobs/find?q=nothing+like+this&sort=budget');
    expect(screen.getByRole('status').textContent).toContain('No open jobs match, yet');
    fireEvent.click(screen.getByRole('button', { name: 'Clear all filters' }));
    expect(where).toBe('?sort=budget');
  });

  it('Vietnam view: no My listings tab, ≈ VND everywhere; signed out: the My tabs ask to sign in', () => {
    const { container } = show('/jobs/find?tab=listings', { vn: true });
    expect(screen.queryByRole('tab', { name: /My listings/ })).toBeNull();
    expect(screen.getByRole('tab', { name: /Open jobs/ }).getAttribute('aria-selected')).toBe('true');
    expect(container.textContent).not.toContain('USDC');
    expect(screen.getByTestId('find-summary').textContent).toContain('VND');
    cleanup();
    show('/jobs/find?tab=applied', { signedIn: false, me: null, applications: [], listings: [] });
    expect(screen.getByText('Sign in to see your applications')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Sign in' }).getAttribute('href')).toBe('/sign-in?next=%2Fjobs%2Ffind%3Ftab%3Dapplied');
  });

  it('error and loading states', () => {
    const onRetry = vi.fn();
    show('/jobs/find', { open: null, openError: true, onRetry });
    fireEvent.click(screen.getByRole('button', { name: /Retry/ }));
    expect(onRetry).toHaveBeenCalledOnce();
    cleanup();
    show('/jobs/find', { open: null, openLoading: true });
    expect(screen.getAllByTestId('job-skeleton')).toHaveLength(6);
  });
});

describe('My tabs', () => {
  const fund = Keypair.generate().publicKey;
  const app = (job: ReturnType<typeof listing>): { application: JobApplicationAccount; job: typeof job } => ({
    application: { address: Keypair.generate().publicKey, version: 1, job: job.address, freelancer: me, createdAt: T0 + 5, pitch: 'hi', bump: 1 },
    job,
  });

  it('application rows: selected (accept now), applied, not selected, hired', () => {
    const name = (w: string) => (w ? '@biz' : '');
    const rows = applicationRows(
      [
        app(listing({ title: 'Picked', state: 'Selected', selected: me, selectedAt: T0, fund })),
        app(listing({ title: 'Waiting' })),
        app(listing({ title: 'Lost', state: 'Filled', selected: Keypair.generate().publicKey, fund })),
        app(listing({ title: 'Won', state: 'Filled', selected: me, fund })),
      ],
      me.toBase58(),
      name,
      T0 + 10
    );
    expect(rows.map((r) => [r.title, r.status, r.cta])).toEqual([
      ['Picked', 'Selected · accept now', 'Review & accept'],
      ['Waiting', 'Applied', 'View job'],
      ['Lost', 'Not selected', 'View job'],
      ['Won', 'Hired', 'Open contract'],
    ]);
    expect(rows[0].href).toBe(`/contract/${fund.toBase58()}`);
    expect(rows[0].primary).toBe(true);
  });

  it('listing rows render with status chips and actions', () => {
    const mine = [
      listing({ title: 'Open one', applicationCount: 2, business: me }),
      listing({ title: 'Filled one', state: 'Filled', business: me, selected: Keypair.generate().publicKey, fund }),
      listing({ title: 'Withdrawn one', state: 'Withdrawn', business: me }),
    ];
    expect(listingRows(mine, me.toBase58(), () => '@vinh').map((r) => [r.status, r.cta, r.sub])).toEqual([
      ['Open', 'Review applicants', 'locked in the job'],
      ['Filled', 'Open contract', 'moved into the contract'],
      ['Withdrawn', 'View record', 'returned to you'],
    ]);
    show('/jobs/find?tab=listings', { listings: mine });
    expect(screen.getByRole('region', { name: 'My listings' })).toBeTruthy();
    expect(screen.getAllByTestId('my-row')).toHaveLength(3);
    expect(screen.getByRole('link', { name: 'Review applicants' }).getAttribute('href')).toBe(`/jobs/${mine[0].address.toBase58()}/applicants`);
    expect(screen.getByRole('tab', { name: /My listings/ }).textContent).toBe('My listings3');
  });

  it('empty My applications', () => {
    show('/jobs/find?tab=applied');
    expect(screen.getByText("You haven't applied to a job yet")).toBeTruthy();
  });
});
