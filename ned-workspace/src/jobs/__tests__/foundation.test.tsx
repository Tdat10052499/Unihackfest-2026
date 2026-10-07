// Hub v4 foundation (prompts-hub-v4.md H1): Popover, Sheet, the motion hooks, Switch, Segmented and the footer.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { useRef, useState } from 'react';
import { Popover } from '../components/Popover.tsx';
import { Segmented } from '../components/Segmented.tsx';
import { Sheet } from '../components/Sheet.tsx';
import { StatCounter } from '../components/StatCounter.tsx';
import { Switch } from '../components/Switch.tsx';
import { useAutoAdvance, useCountUp } from '../motion.ts';
import { CTA, FOOT, JobsFooter, JobsHeader } from '../JobsLayout.tsx';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function reducedMotion(on: boolean) {
  window.matchMedia = ((q: string) => ({ matches: on && q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
}
beforeEach(() => reducedMotion(false));

function PopoverDemo() {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null);
  return (
    <div>
      <button ref={anchor} onClick={() => setOpen(!open)}>
        Field
      </button>
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={anchor} label="Choose a field">
        <button>Design</button>
      </Popover>
      <p>outside</p>
    </div>
  );
}

describe('Popover', () => {
  it('closes on Escape and gives focus back to its anchor', () => {
    render(<PopoverDemo />);
    const anchor = screen.getByRole('button', { name: 'Field' });
    fireEvent.click(anchor);
    expect(screen.getByRole('dialog', { name: 'Choose a field' }).className).toContain('hb-pop');
    screen.getByRole('button', { name: 'Design' }).focus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(anchor);
  });

  it('closes on a click outside, not on a click inside', () => {
    render(<PopoverDemo />);
    fireEvent.click(screen.getByRole('button', { name: 'Field' }));
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Design' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.pointerDown(screen.getByText('outside'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

function SheetDemo() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(true)}>Filters</button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Filters" footer={<button>Show 4 jobs</button>}>
        <button>Logo & brand</button>
      </Sheet>
    </div>
  );
}

describe('Sheet', () => {
  it('opens with focus inside, traps Tab, closes on Escape and returns focus', () => {
    render(<SheetDemo />);
    const opener = screen.getByRole('button', { name: 'Filters' });
    opener.focus();
    fireEvent.click(opener);
    const dialog = screen.getByRole('dialog', { name: 'Filters' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.contains(document.activeElement)).toBe(true);
    screen.getByRole('button', { name: 'Show 4 jobs' }).focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('closes on a click on the backdrop (outside the panel) and on the close button', () => {
    render(<SheetDemo />);
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
    fireEvent.click(screen.getByRole('button', { name: 'Logo & brand' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.click(screen.getByTestId('sheet-backdrop'));
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('motion hooks', () => {
  it('useCountUp returns the target at once under reduced motion', () => {
    reducedMotion(true);
    const { result, rerender } = renderHook(({ n }) => useCountUp(n, 1400), { initialProps: { n: 42 } });
    expect(result.current).toBe(42);
    rerender({ n: 50 });
    expect(result.current).toBe(50);
    render(<StatCounter value={7} label="open jobs" />);
    expect(screen.getAllByText('7')).toHaveLength(2);
  });

  it('useCountUp starts at 0 and reaches the target with motion', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    const { result } = renderHook(() => useCountUp(100, 1400));
    expect(result.current).toBe(0);
    act(() => vi.advanceTimersByTime(700));
    expect(result.current).toBeGreaterThan(50);
    expect(result.current).toBeLessThan(100);
    act(() => vi.advanceTimersByTime(800));
    expect(result.current).toBe(100);
  });

  it('useAutoAdvance moves every 6 s, not while paused, never under reduced motion', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ paused }) => useAutoAdvance(5, 6000, paused), { initialProps: { paused: false } });
    act(() => vi.advanceTimersByTime(6000));
    expect(result.current.index).toBe(1);
    rerender({ paused: true });
    act(() => vi.advanceTimersByTime(12_000));
    expect(result.current.index).toBe(1);
    rerender({ paused: false });
    act(() => result.current.select(4));
    act(() => vi.advanceTimersByTime(6000));
    expect(result.current.index).toBe(0);
    reducedMotion(true);
    const still = renderHook(() => useAutoAdvance(5, 6000));
    act(() => vi.advanceTimersByTime(30_000));
    expect(still.result.current.index).toBe(0);
  });
});

describe('Switch and Segmented', () => {
  it('Switch is one switch row; Segmented is a radiogroup or a pressed toggle', () => {
    const onSwitch = vi.fn();
    const onPick = vi.fn();
    render(
      <>
        <Switch checked={false} onChange={onSwitch} label="Apply by within 24 hours" sub="Jobs that close soon" />
        <Segmented label="Milestones" value="any" onChange={onPick} options={[{ value: 'any', label: 'Any' }, { value: '1', label: '1' }]} />
        <Segmented label="Layout" mode="toggle" value="grid" onChange={() => {}} options={[{ value: 'grid', label: 'G', name: 'Grid' }, { value: 'list', label: 'L', name: 'List' }]} />
      </>,
    );
    const sw = screen.getByRole('switch', { name: /Apply by within 24 hours/ });
    expect(sw.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(sw);
    expect(onSwitch).toHaveBeenCalledWith(true);
    expect(screen.getByRole('radio', { name: 'Any' }).getAttribute('aria-checked')).toBe('true');
    fireEvent.click(screen.getByRole('radio', { name: '1' }));
    expect(onPick).toHaveBeenCalledWith('1');
    expect(screen.getByRole('button', { name: 'Grid' }).getAttribute('aria-pressed')).toBe('true');
  });
});

describe('footer (V9)', () => {
  const links = () => Array.from(screen.getByRole('navigation', { name: 'Footer' }).querySelectorAll('a')).map((a) => a.textContent);

  it('links, student line, the disclaimer per view, legal links; Post a job hidden in the Vietnam view', () => {
    render(
      <MemoryRouter>
        <JobsFooter vn={false} client />
      </MemoryRouter>,
    );
    expect(links()).toEqual(['Overview', 'Find jobs', 'Post a job', 'Workspace', 'Legal']);
    expect(screen.getByText('Student project · UniHackFest 2026')).toBeTruthy();
    expect(screen.getByText(FOOT.intl)).toBeTruthy();
    expect(Array.from(screen.getByRole('navigation', { name: 'Legal' }).querySelectorAll('a')).map((a) => a.textContent)).toEqual(['Terms of use', 'Privacy', 'Disclosures']);
    expect(screen.queryByTestId('cta-band')).toBeNull();
    cleanup();
    render(
      <MemoryRouter>
        <JobsFooter vn client={false} />
      </MemoryRouter>,
    );
    expect(links()).toEqual(['Overview', 'Find jobs', 'Workspace', 'Legal']);
    expect(screen.getByText(FOOT.vn)).toBeTruthy();
  });

  it('CTA band: client heading and Post a job; others without it', () => {
    render(
      <MemoryRouter>
        <JobsFooter vn={false} client cta />
      </MemoryRouter>,
    );
    const band = screen.getByTestId('cta-band');
    expect(band.textContent).toContain(CTA.client.join(''));
    expect(band.textContent).toContain('Post a job');
    cleanup();
    render(
      <MemoryRouter>
        <JobsFooter vn client={false} cta />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('cta-band').textContent).toContain(CTA.other.join(''));
    expect(screen.getByTestId('cta-band').textContent).not.toContain('Post a job');
  });
});

describe('header (V4)', () => {
  const header = (over: Partial<Parameters<typeof JobsHeader>[0]> = {}) =>
    render(
      <MemoryRouter initialEntries={['/jobs']}>
        <JobsHeader wallet={null} name={null} vn={false} status="signed-out" next="%2Fjobs" onOpenWallet={() => {}} {...over} />
      </MemoryRouter>,
    );
  const WALLET = '9PZwK7pZmZnqfq1D5Xm9JvmoFQbPSjCoxj4AHiVLrhkW';

  it('tabs are Overview and Find jobs only, never Legal; signed out shows the dark Sign in pill', () => {
    header();
    const nav = screen.getByRole('navigation', { name: 'Jobs' });
    expect(Array.from(nav.querySelectorAll('a')).map((a) => a.textContent)).toEqual(['Overview', 'Find jobs']);
    expect(nav.querySelector('[aria-current="page"]')?.textContent).toBe('Overview');
    expect(screen.queryByText('Legal')).toBeNull();
    expect(screen.getByText('Devnet · test money')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Sign in' }).getAttribute('href')).toBe('/sign-in?next=%2Fjobs');
    expect(screen.queryByText('Post a job')).toBeNull();
    expect(screen.getByRole('banner').className).toContain('hb-hdr');
  });

  it('a client gets Post a job and the profile button; the Vietnam view never posts', () => {
    header({ wallet: WALLET, name: '@mia', status: 'ready' });
    expect(screen.getByRole('link', { name: /Post a job/ }).getAttribute('href')).toBe('/jobs/new');
    expect(screen.getByRole('button', { name: 'Account menu, @mia' })).toBeTruthy();
    cleanup();
    header({ wallet: WALLET, name: '@mia', status: 'ready', vn: true });
    expect(screen.queryByText('Post a job')).toBeNull();
    expect(screen.getByRole('button', { name: 'Account menu, @mia' }).textContent).toContain('Vietnam view · VND');
  });
});
