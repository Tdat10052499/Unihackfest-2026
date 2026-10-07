import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { overviewStats } from '../overview.ts';
import { COPY, ERROR_TEXT, OverviewView, type OverviewViewProps } from '../pages/Overview.tsx';
import { listing, T0, USDC } from './fixture.ts';

afterEach(cleanup);

const jobs = [
  listing({ title: 'Oldest logo job', createdAt: T0, total: 20n * USDC, applicationCount: 4, category: 0 }),
  listing({ title: 'Translate onboarding', createdAt: T0 + 30, total: 15n * USDC, applicationCount: 2, category: 2 }),
  listing({ title: 'Review a Solana program', createdAt: T0 + 60, total: 80n * USDC, applicationCount: 1, category: 1 }),
  listing({ title: 'Already filled', createdAt: T0 + 90, state: 'Filled', total: 50n * USDC, applicationCount: 9 }),
];

function Where() {
  const l = useLocation();
  return <div data-testid="where">{l.pathname + l.search}</div>;
}

const base: OverviewViewProps = { jobs, loading: false, error: false, onRetry: () => {}, vn: false, client: true, signedIn: true, me: null, names: {}, now: T0, onRecords: () => {} };
const show = (over: Partial<OverviewViewProps> = {}) =>
  render(
    <MemoryRouter initialEntries={['/jobs']}>
      <Routes>
        <Route path="/jobs" element={<OverviewView {...base} {...over} />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>
  );

describe('overviewStats', () => {
  it('counts only open listings: total locked, applications, categories, newest first, one bar each', () => {
    const s = overviewStats(jobs);
    expect(s.openCount).toBe(3);
    expect(s.lockedUnits).toBe(115n * USDC);
    expect(s.applications).toBe(7);
    expect(s.byCategory).toEqual([1, 1, 1, 0, 0, 0, 0, 0]);
    expect(s.featured.map((j) => j.title)).toEqual(['Review a Solana program', 'Translate onboarding', 'Oldest logo job']);
    expect(s.newest?.title).toBe('Review a Solana program');
    expect(s.bars).toEqual([{ height: 30, high: true }, { height: 6, high: false }, { height: 8, high: false }]);
  });
});

describe('Overview page', () => {
  it('client view: copy, numbers from the listings, featured cards (first dark) and the buttons', () => {
    show();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(COPY.client.title);
    expect(screen.getByTestId('locked-card').textContent).toContain('115.00 USDC');
    expect(screen.getByTestId('locked-card').textContent).toContain('locked in 3 open jobs');
    expect(screen.getByTestId('apps-card').textContent).toBe('7 applications on open jobs');
    expect(screen.getByTestId('hero-card').textContent).toContain('Review a Solana program');
    const cards = screen.getAllByTestId('job-card');
    expect(cards).toHaveLength(3);
    expect(cards[0].className).toContain('cardDark');
    expect(cards[1].className).not.toContain('cardDark');
    expect(screen.getByRole('link', { name: 'Design, 1 open job' }).getAttribute('href')).toBe('/jobs/find?cat=design');
    expect(screen.getByRole('link', { name: 'Marketing, No open jobs yet' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Find more jobs/ }).getAttribute('href')).toBe('/jobs/find');
    expect(screen.getByRole('link', { name: /^Post a job/ }).getAttribute('href')).toBe('/jobs/new');
    expect(screen.getByRole('link', { name: 'Figma' }).getAttribute('href')).toBe('/jobs/find?skills=figma');
  });

  it('Vietnam view: freelancer copy, ≈ VND, never USDC, Browse open jobs', () => {
    const { container } = show({ vn: true, client: false });
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(COPY.freelancer.title);
    expect(screen.getByTestId('locked-card').textContent).toContain('VND (estimate)');
    expect(container.textContent).not.toContain('USDC');
    expect(screen.getByRole('link', { name: /Browse open jobs/ }).getAttribute('href')).toBe('/jobs/find');
    expect(screen.queryByRole('link', { name: /^Post a job/ })).toBeNull();
    expect(container.textContent).toContain('Receive VND per milestone');
  });

  it('the search capsule opens Find jobs with the query in the URL', () => {
    show();
    const form = screen.getByRole('search');
    fireEvent.change(within(form).getByLabelText('Keyword'), { target: { value: 'logo cà phê' } });
    fireEvent.change(within(form).getByLabelText('Category'), { target: { value: 'design' } });
    fireEvent.click(within(form).getByRole('button', { name: /Search/ }));
    expect(screen.getByTestId('where').textContent).toBe('/jobs/find?q=logo+c%C3%A0+ph%C3%AA&cat=design');
  });

  it('loading shows skeleton cards; an error shows the message and a retry', () => {
    show({ jobs: null, loading: true });
    expect(screen.getAllByTestId('job-skeleton')).toHaveLength(6);
    cleanup();
    const onRetry = vi.fn();
    show({ jobs: null, loading: false, error: true, onRetry });
    expect(screen.getByRole('alert').textContent).toContain(ERROR_TEXT);
    fireEvent.click(screen.getByRole('button', { name: /Retry/ }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('no open jobs: empty state and zero counts, signed out', () => {
    show({ jobs: [], signedIn: false, client: false, vn: true });
    expect(screen.getByText('No open jobs yet', { selector: 'p' })).toBeTruthy();
    expect(screen.getByTestId('apps-card').textContent).toBe('0 applications on open jobs');
    expect(screen.getByRole('link', { name: 'See your records' }).getAttribute('href')).toBe('/sign-in?next=%2Fjobs');
  });
});
