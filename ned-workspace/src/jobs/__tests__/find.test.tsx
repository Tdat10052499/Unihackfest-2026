import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { Keypair } from '@solana/web3.js';
import type { JobApplicationAccount } from '@ned/core/jobs/decode.ts';
import { skillsMask } from '@ned/core/jobs/taxonomy.ts';
import { applicationRows, budgetLabel, listingRows, viewFromQuery, viewToQuery } from '../find.ts';
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
const titles = () => screen.queryAllByTestId('job-card').map((c) => c.querySelector('span')?.textContent);

describe('URL state', () => {
  it('filters, sort and tab round-trip through the query', () => {
    const q = viewToQuery({ q: 'logo', cat: 'design', skills: ['figma'], min: 20, max: 50, dur: '1w', ms: '1', soon: true, hide: true, sort: 'budget' }, 'applied');
    expect(q).toBe('q=logo&cat=design&skills=figma&min=20&max=50&dur=1w&ms=1&soon=24h&hide=applied&sort=budget&tab=applied');
    expect(viewFromQuery(q)).toEqual({ filters: { q: 'logo', cat: 'design', skills: ['figma'], min: 20, max: 50, dur: '1w', ms: '1', soon: true, hide: true, sort: 'budget' }, tab: 'applied' });
    expect(viewFromQuery('tab=nope').tab).toBe('open');
    expect(budgetLabel('lt20', true)).toBe('Under ≈ 520,000 VND');
  });

  it('a filtered URL reopens the same results', () => {
    show('/jobs/find?cat=writing');
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Writing & Translation jobs');
    expect(titles()).toEqual(['Translate onboarding']);
    expect(screen.getByTestId('result-count').textContent).toBe('1 open job match');
    cleanup();
    show('/jobs/find?cat=design&sort=budget&min=20');
    expect(titles()).toEqual([]);
    expect(screen.getByRole('status').textContent).toContain(NO_MATCH);
    cleanup();
    show('/jobs/find?cat=design&sort=budget&max=10');
    expect(titles()).toEqual(['Design job 5', 'Design job 4', 'Design job 3', 'Design job 2', 'Design job 1', 'Design job 0']);
  });
});

describe('Find jobs', () => {
  it('category chips count the other filters; choosing one writes the URL', () => {
    show('/jobs/find');
    const chips = screen.getByRole('group', { name: 'Category' });
    expect(within(chips).getByRole('button', { name: /^All/ }).textContent).toBe('All12');
    expect(within(chips).getByRole('button', { name: /^Design/ }).textContent).toBe('Design11');
    fireEvent.click(within(chips).getByRole('button', { name: /^Writing/ }));
    expect(where).toBe('?cat=writing');
    expect(within(chips).getByRole('button', { name: /^Writing/ }).getAttribute('aria-pressed')).toBe('true');
  });

  it('9 at a time, first card dark, Show all / Show fewer', () => {
    show('/jobs/find');
    expect(screen.getAllByTestId('job-card')).toHaveLength(9);
    expect(screen.getAllByTestId('job-card')[0].className).toContain('cardDark');
    fireEvent.click(screen.getByRole('button', { name: /Show all 12 jobs/ }));
    expect(screen.getAllByTestId('job-card')).toHaveLength(12);
    fireEvent.click(screen.getByRole('button', { name: /Show fewer jobs/ }));
    expect(screen.getAllByTestId('job-card')).toHaveLength(9);
  });

  it('selects and ticks write the URL; Clear keeps only the sort; Copy link', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    show('/jobs/find?sort=soon');
    fireEvent.change(screen.getByLabelText('Milestones'), { target: { value: '1' } });
    fireEvent.click(screen.getByLabelText('Apply by within 24 h'));
    expect(where).toBe('?ms=1&soon=24h&sort=soon');
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(where).toBe('?sort=soon');
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /Copy link/ })));
    expect(writeText).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: /Link copied/ })).toBeTruthy();
  });

  it('the search box writes q to the URL 150 ms after typing', () => {
    vi.useFakeTimers();
    show('/jobs/find');
    fireEvent.change(screen.getByLabelText('Search jobs'), { target: { value: 'translate' } });
    expect(where).toBe('');
    act(() => vi.advanceTimersByTime(160));
    expect(where).toBe('?q=translate');
    expect(titles()).toEqual(['Translate onboarding']);
  });

  it('no match: message and Clear filters', () => {
    show('/jobs/find?q=nothing+like+this');
    expect(screen.getByRole('status').textContent).toContain(NO_MATCH);
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(where).toBe('');
  });

  it('Vietnam view: no My listings tab, ≈ VND budgets; signed out: the My tabs ask to sign in', () => {
    show('/jobs/find?tab=listings', { vn: true });
    expect(screen.queryByRole('tab', { name: /My listings/ })).toBeNull();
    expect(screen.getByRole('tab', { name: /Open jobs/ }).getAttribute('aria-selected')).toBe('true');
    expect(within(screen.getByLabelText('Budget')).getByRole('option', { name: 'Under ≈ 520,000 VND' })).toBeTruthy();
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
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('My listings');
    expect(screen.getAllByTestId('job-row')).toHaveLength(3);
    expect(screen.getByRole('link', { name: 'Review applicants' }).getAttribute('href')).toBe(`/jobs/${mine[0].address.toBase58()}/applicants`);
    expect(screen.getByRole('tab', { name: /My listings/ }).textContent).toBe('My listings3');
  });

  it('empty My applications', () => {
    show('/jobs/find?tab=applied');
    expect(screen.getByText("You haven't applied to a job yet.")).toBeTruthy();
  });
});
