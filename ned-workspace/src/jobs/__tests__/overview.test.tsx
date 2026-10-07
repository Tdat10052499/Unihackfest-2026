import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { lockedStatLabel, overviewStats } from '../overview.ts';
import { ERROR_TEXT, HERO, howSteps, OverviewView, RULES, TRUST_TEXT, type OverviewViewProps } from '../pages/Overview.tsx';
import { listing, T0, USDC } from './fixture.ts';

const DAY = 86_400;

function reducedMotion(on: boolean) {
  window.matchMedia = ((q: string) => ({ matches: on && q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
}
// Counters show their final value at once, so the numbers can be read
beforeEach(() => reducedMotion(true));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const jobs = [
  listing({ title: 'Oldest logo job', createdAt: T0, total: 20n * USDC, applicationCount: 4, category: 0 }),
  listing({ title: 'Translate onboarding', createdAt: T0 + 30, total: 15n * USDC, applicationCount: 2, category: 2 }),
  listing({
    title: 'Review a Solana program',
    createdAt: T0 + 60,
    total: 80n * USDC,
    applicationCount: 1,
    category: 1,
    milestoneCount: 2,
    milestones: [
      { index: 0, amount: 50n * USDC, workSecs: 9 * DAY, reviewSecs: DAY },
      { index: 1, amount: 30n * USDC, workSecs: 14 * DAY, reviewSecs: DAY },
    ],
  }),
  listing({ title: 'Already filled', createdAt: T0 + 90, state: 'Filled', total: 50n * USDC, applicationCount: 9 }),
];

function Where() {
  const l = useLocation();
  return <div data-testid="where">{l.pathname + l.search}</div>;
}

const base: OverviewViewProps = { jobs, loading: false, error: false, onRetry: () => {}, vn: false, client: true, signedIn: true, names: {}, now: T0 };
const show = (over: Partial<OverviewViewProps> = {}) =>
  render(
    <MemoryRouter initialEntries={['/jobs']}>
      <Routes>
        <Route path="/jobs" element={<OverviewView {...base} {...over} />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
const h1 = () => screen.getByRole('heading', { level: 1 }).textContent;
const notch = () => screen.getByTestId('notch').textContent ?? '';

describe('overviewStats', () => {
  it('counts only open listings: total locked, applications, categories, the newest four', () => {
    const s = overviewStats(jobs);
    expect(s.openCount).toBe(3);
    expect(s.lockedUnits).toBe(115n * USDC);
    expect(s.applications).toBe(7);
    expect(s.byCategory).toEqual([1, 1, 1, 0, 0, 0, 0, 0]);
    expect(s.featured.map((j) => j.title)).toEqual(['Review a Solana program', 'Translate onboarding', 'Oldest logo job']);
    expect(s.newest?.title).toBe('Review a Solana program');
    expect(overviewStats([...jobs, ...jobs]).featured).toHaveLength(4);
  });

  it('the locked counter label: USDC, ≈ M VND from one million, ≈ VND below', () => {
    expect(lockedStatLabel(115, false)).toBe('115.00 USDC');
    expect(lockedStatLabel(115, true)).toBe('≈ 3.0M VND');
    expect(lockedStatLabel(0.05, true)).toBe('≈ 1,000 VND');
  });
});

describe('Overview v4', () => {
  it('client: hero copy, notch numbers from the listings, glass card, links', () => {
    show();
    expect(h1()).toBe(HERO.client.title.join(''));
    expect(screen.getByText(HERO.client.sub)).toBeTruthy();
    expect(notch()).toContain('115.00 USDC');
    expect(notch()).toContain('locked in open jobs, read from Solana now');
    expect(notch()).toContain('3open jobs, each with its budget already locked');
    expect(notch()).toContain('7applications on open jobs');
    expect(screen.getByTestId('glass-card').textContent).toContain('Review a Solana program');
    expect(screen.getByTestId('glass-card').textContent).toContain('80.00 USDC');
    expect(screen.getByRole('link', { name: /^Post a job/ }).getAttribute('href')).toBe('/jobs/new');
    expect(screen.getByTestId('hero').className).toContain('rv-scale');
  });

  it('guest and Vietnam view copy; the Vietnam view shows ≈ VND and never USDC', () => {
    show({ client: false, signedIn: false, vn: false });
    expect(h1()).toBe(HERO.guest.title.join(''));
    expect(screen.getByText(HERO.guest.sub)).toBeTruthy();
    expect(screen.getByRole('link', { name: /How it works/ }).getAttribute('href')).toBe('#hb-how');
    cleanup();
    const { container } = show({ client: false, signedIn: true, vn: true });
    expect(screen.getByText(HERO.vn.sub)).toBeTruthy();
    expect(notch()).toContain('≈ 3.0M VND');
    expect(container.textContent).not.toContain('USDC');
    expect(container.textContent).toContain('the locked amount never passes through your wallet');
    expect(container.textContent).not.toContain('never hold crypto');
    expect(screen.queryByRole('link', { name: /^Post a job/ })).toBeNull();
  });

  it('the glass search pill opens Find jobs with q in the URL', () => {
    show();
    const form = screen.getByRole('search');
    fireEvent.change(within(form).getByLabelText('Search jobs'), { target: { value: 'logo cà phê' } });
    fireEvent.click(within(form).getByRole('button', { name: /Search/ }));
    expect(screen.getByTestId('where').textContent).toBe('/jobs/find?q=logo+c%C3%A0+ph%C3%AA');
  });

  it('trust heading, eight category circles to Find jobs, six rules', () => {
    show();
    expect(screen.getByRole('heading', { name: 'Funded first, so both sides can start with trust' })).toBeTruthy();
    expect(screen.getByText(TRUST_TEXT)).toBeTruthy();
    const circles = within(screen.getByRole('list', { name: 'Browse by field' })).getAllByRole('listitem');
    expect(circles).toHaveLength(8);
    expect(screen.getByRole('listitem', { name: 'Design, 1 open job' }).getAttribute('href')).toBe('/jobs/find?cat=design');
    expect(screen.getByRole('listitem', { name: 'Marketing, No open jobs yet' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Same rules for every job, written into the program' })).toBeTruthy();
    for (const r of RULES) expect(screen.getByRole('heading', { level: 3, name: r.title })).toBeTruthy();
  });

  it('featured split: numbered cards, hover or focus updates the preview with the milestone plan', () => {
    show();
    const cards = screen.getAllByTestId('featured-card');
    expect(cards.map((c) => c.textContent?.slice(0, 2))).toEqual(['01', '02', '03']);
    const preview = () => screen.getByTestId('featured-preview').textContent ?? '';
    expect(preview()).toContain('Review a Solana program');
    expect(preview()).toContain('Due 9 days after selection');
    expect(preview()).toContain('Due 14 days after selection');
    expect(preview()).toContain('1 applicant');
    fireEvent.mouseEnter(cards[1]);
    expect(preview()).toContain('Translate onboarding');
    expect(cards[1].getAttribute('aria-current')).toBe('true');
    fireEvent.focus(cards[2]);
    expect(preview()).toContain('Oldest logo job');
    expect(within(screen.getByTestId('featured-preview')).getByRole('link', { name: /Apply/ }).getAttribute('href')).toBe(cards[2].getAttribute('href'));
  });

  it('how it works: five tabs, auto-advance every 6 s, pause on hover, restart on click', () => {
    reducedMotion(false);
    vi.useFakeTimers();
    show();
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent?.slice(2))).toEqual(howSteps(false).map((s) => s.title));
    const selected = () => screen.getAllByRole('tab').findIndex((t) => t.getAttribute('aria-selected') === 'true');
    expect(selected()).toBe(0);
    expect(screen.getByRole('tabpanel').textContent).toContain('Post and lock the budget');
    act(() => vi.advanceTimersByTime(6000));
    expect(selected()).toBe(1);
    fireEvent.mouseEnter(screen.getByTestId('showcase'));
    act(() => vi.advanceTimersByTime(18_000));
    expect(selected()).toBe(1);
    expect(screen.getByTestId('tab-fill').className).toContain('hb-paused');
    fireEvent.mouseLeave(screen.getByTestId('showcase'));
    fireEvent.click(screen.getAllByRole('tab')[4]);
    expect(selected()).toBe(4);
    expect(screen.getByRole('tabpanel').textContent).toContain('Released');
    act(() => vi.advanceTimersByTime(6000));
    expect(selected()).toBe(0);
  });

  it('how it works never advances under reduced motion; the Vietnam view mocks have no USDC', () => {
    vi.useFakeTimers();
    show({ vn: true, client: false });
    act(() => vi.advanceTimersByTime(30_000));
    expect(screen.getAllByRole('tab')[0].getAttribute('aria-selected')).toBe('true');
    expect(howSteps(true).flatMap((s) => [s.button, ...s.rows.flat()]).join(' ')).not.toContain('USDC');
  });

  it('loading shows skeletons; an error shows the message and Retry; no open jobs shows the empty state', () => {
    show({ jobs: null, loading: true });
    expect(screen.getAllByTestId('stat-skeleton')).toHaveLength(3);
    expect(screen.getAllByTestId('job-skeleton')).toHaveLength(4);
    cleanup();
    const onRetry = vi.fn();
    show({ jobs: null, loading: false, error: true, onRetry });
    expect(screen.getByRole('alert').textContent).toContain(ERROR_TEXT);
    fireEvent.click(screen.getByRole('button', { name: /Retry/ }));
    expect(onRetry).toHaveBeenCalledOnce();
    cleanup();
    show({ jobs: [], signedIn: false, client: false });
    expect(screen.getByText('No open jobs yet', { selector: 'p' })).toBeTruthy();
    expect(notch()).toContain('0applications on open jobs');
    expect(screen.queryByTestId('glass-card')).toBeNull();
  });
});
