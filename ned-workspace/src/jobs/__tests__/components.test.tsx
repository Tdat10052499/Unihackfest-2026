import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { Keypair } from '@solana/web3.js';
import type { JobListingAccount } from '@ned/core/jobs/decode.ts';
import { skillsMask } from '@ned/core/jobs/taxonomy.ts';
import { JobCard, durationLabel } from '../components/JobCard.tsx';
import { MoneyText } from '../components/MoneyText.tsx';
import { ProfileMenu, viewLabelFor } from '../ProfileMenu.tsx';
import { safeNext } from '../../lib/next.ts';

afterEach(cleanup);

const T0 = 1_759_400_000;
const address = Keypair.generate().publicKey;
const job: JobListingAccount = {
  address,
  version: 1,
  state: 'Open',
  business: Keypair.generate().publicKey,
  category: 0,
  skills: skillsMask([0, 3]),
  mint: Keypair.generate().publicKey,
  jobId: 1n,
  createdAt: T0,
  applyBy: T0 + 3 * 86_400,
  selectBy: T0 + 5 * 86_400,
  total: 10_000_000n,
  milestoneCount: 2,
  milestones: [
    { index: 0, amount: 5_000_000n, workSecs: 5 * 86_400, reviewSecs: 86_400 },
    { index: 1, amount: 5_000_000n, workSecs: 7 * 86_400, reviewSecs: 86_400 },
  ],
  title: 'Logo refresh for a coffee brand',
  summary: 'A cleaner wordmark.',
  briefHash: new Uint8Array(32).fill(1),
  selected: null,
  selectedAt: 0,
  fund: null,
  applicationCount: 4,
  bump: 255,
  vaultBump: 254,
};

const inRouter = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('MoneyText', () => {
  it('shows USDC outside Vietnam and ≈ VND with the "$… · estimate" line in the Vietnam view', () => {
    const { container, rerender } = render(<MoneyText units={10_000_000n} vn={false} />);
    expect(container.textContent).toBe('10.00 USDC');
    rerender(<MoneyText units={10_000_000n} vn />);
    expect(container.textContent).toContain('≈ 260,000 VND (estimate)');
    expect(container.textContent).toContain('$10.00 · estimate');
    expect(container.textContent).not.toContain('USDC');
  });
});

describe('JobCard', () => {
  it('is one link to /jobs/:job with the anatomy of H.9 (USDC view)', () => {
    inRouter(<JobCard job={job} vn={false} now={T0} businessName="@orbit_cafe" />);
    const card = screen.getByRole('link');
    expect(card.getAttribute('href')).toBe(`/jobs/${address.toBase58()}`);
    expect(card.getAttribute('aria-label')).toBe('Logo refresh for a coffee brand, 10.00 USDC, budget locked');
    for (const text of ['Design', '1 week', '2 milestones', 'Logo & brand', 'Figma', '10.00 USDC', 'Budget locked', '@orbit_cafe', '4 applicants', 'Apply now'])
      expect(card.textContent).toContain(text);
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('Vietnam view: ≈ VND and the estimate line, never USDC; dark featured variant and "Applied"', () => {
    inRouter(<JobCard job={job} vn now={T0} dark mine="applied" />);
    const card = screen.getByRole('link');
    expect(card.textContent).toContain('≈ 260,000 VND (estimate)');
    expect(card.textContent).toContain('$10.00 · estimate');
    expect(card.textContent).not.toContain('USDC');
    expect(card.textContent).toContain('Applied');
    expect(card.textContent).toContain('View');
    expect(card.className).toContain('cardDark');
  });

  it('closed applications and short devnet windows', () => {
    inRouter(<JobCard job={{ ...job, applicationCount: 0 }} vn={false} now={job.applyBy + 1} />);
    expect(screen.getByRole('link').textContent).toContain('Applications closed · no applicants yet');
    expect(durationLabel(600)).toBe('10 min');
    expect(durationLabel(7_200)).toBe('2 h');
    expect(durationLabel(20 * 86_400)).toBe('1 month');
  });
});

describe('ProfileMenu', () => {
  const props = { wallet: address.toBase58(), name: '@mia', viewLabel: viewLabelFor(false) };

  it('opens, focuses the first item, closes on Escape and gives focus back to the button', () => {
    inRouter(<ProfileMenu {...props} onOpenWallet={() => {}} />);
    const button = screen.getByRole('button', { name: 'Account menu, @mia' });
    expect(button.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    const menu = screen.getByRole('menu');
    expect(menu.textContent).toContain('@mia');
    expect(menu.textContent).toContain('USDC wallet');
    expect(document.activeElement?.textContent).toContain('Open wallet');
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(document.activeElement?.textContent).toContain('Go to Workspace');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(button);
  });

  it('links to the Workspace, opens the wallet, and closes on a click outside', () => {
    const onOpenWallet = vi.fn();
    inRouter(<ProfileMenu {...props} viewLabel={viewLabelFor(true)} onOpenWallet={onOpenWallet} />);
    fireEvent.click(screen.getByRole('button', { name: /Account menu/ }));
    expect(screen.getByRole('menu').textContent).toContain('Vietnam view · VND');
    expect(screen.getByRole('menuitem', { name: /Go to Workspace/ }).getAttribute('href')).toBe('/');
    fireEvent.click(screen.getByRole('menuitem', { name: /Open wallet/ }));
    expect(onOpenWallet).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menu')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Account menu/ }));
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('menu')).toBeNull();
  });
});

describe('sign-in ?next=', () => {
  it('returns only to a path on this site', () => {
    expect(safeNext('/jobs/find?q=logo')).toBe('/jobs/find?q=logo');
    expect(safeNext('https://evil.example')).toBe('/');
    expect(safeNext('//evil.example')).toBe('/');
    expect(safeNext('/\\evil.example')).toBe('/');
    expect(safeNext(null)).toBe('/');
  });
});
