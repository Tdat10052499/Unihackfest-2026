// v1.4 (D29, prompt V6): Post a job calls runPostJob with lockNow false (default, "Publish") or true ("Lock X USDC &
// publish"); the flag off shows no choice and always locks now. Wallet panel, chain time, balance and the action are
// mocked so only the page's own choice is under test.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Keypair } from '@solana/web3.js';
import type { ConfirmRequest } from '../../components/WalletPanelContext.tsx';
import { T0, USDC } from './fixture.ts';

const requests: ConfirmRequest[] = [];
const runPostJob = vi.fn();

vi.mock('../../components/WalletPanelContext.tsx', () => ({
  useWalletPanel: () => ({ confirm: async (r: ConfirmRequest) => (requests.push(r), true), ensureConsent: () => true, ensureAccount: () => true }),
}));
vi.mock('../../hooks/useChainTime.ts', () => ({ useChainTime: () => T0 }));
vi.mock('../../hooks/queries.ts', () => ({ useUsdcUnits: () => ({ data: 100n * USDC }) }));
vi.mock('../../hooks/actions.ts', () => ({ useActionEnv: () => ({ env: {}, status: '' }) }));
vi.mock('@ned/core/jobs/actions.ts', async (orig) => ({ ...(await orig<object>()), runPostJob: (...args: unknown[]) => runPostJob(...args) }));

const { PostJobForm, LOCK_NOW_TEXT, LOCK_WHEN_HIRED_TEXT, BALANCE_AT_SELECT } = await import('../pages/PostJob.tsx');

beforeEach(() => {
  requests.length = 0;
  runPostJob.mockReset();
  runPostJob.mockImplementation(async (_env, _draft, _region, _cb, opts?: { lockNow?: boolean }) => ({ signature: 's', job: Keypair.generate().publicKey.toBase58(), briefSignatures: [], locked: opts?.lockNow ?? true }));
});
afterEach(cleanup);

const wallet = Keypair.generate().publicKey.toBase58();
const page = (lockAtHire?: boolean) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <PostJobForm wallet={wallet} name="@orbit_cafe" {...(lockAtHire === undefined ? {} : { lockAtHire })} />
      </MemoryRouter>
    </QueryClientProvider>
  );

function fill() {
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Landing page' } });
  fireEvent.change(screen.getByLabelText(/^Summary/), { target: { value: 'One responsive page.' } });
  fireEvent.change(screen.getByLabelText('Scope'), { target: { value: 'Build the page.' } });
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Page' } });
  fireEvent.change(screen.getByLabelText('Amount (USDC)'), { target: { value: '30' } });
  fireEvent.change(screen.getByLabelText(/^Done when/), { target: { value: 'Responsive at 390 px' } });
}

describe('Post a job: When is the budget locked?', () => {
  it('default Lock when I hire → "Publish", the sheet repeats the choice, runPostJob lockNow false', async () => {
    page();
    fill();
    const choice = screen.getByRole('radiogroup', { name: 'When is the budget locked?' });
    expect(screen.getByRole('radio', { name: /Lock when I hire/ }).getAttribute('aria-checked')).toBe('true');
    expect(choice.textContent).toContain(LOCK_WHEN_HIRED_TEXT('30.00 USDC'));
    expect(LOCK_WHEN_HIRED_TEXT('30.00 USDC')).toBe('Nothing is locked now. When you select a freelancer, 30.00 USDC is locked in the same step.');
    expect(screen.getByTestId('job-card-preview').textContent).toContain('Locks when hired');
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    await waitFor(() => expect(runPostJob).toHaveBeenCalledTimes(1));
    expect(runPostJob.mock.calls[0][4]).toEqual({ lockNow: false });
    expect(requests[0].title).toBe('Publish');
    expect(requests[0].note?.text).toBe(`${LOCK_WHEN_HIRED_TEXT('30.00 USDC')} ${BALANCE_AT_SELECT}`);
    expect(await screen.findByText('Published · 30.00 USDC locks when you hire')).toBeTruthy();
  });

  it('Lock now → "Lock 30.00 USDC & publish", runPostJob lockNow true', async () => {
    page();
    fill();
    fireEvent.click(screen.getByRole('radio', { name: /Lock now/ }));
    expect(screen.getByRole('radiogroup', { name: 'When is the budget locked?' }).textContent).toContain(LOCK_NOW_TEXT('30.00 USDC'));
    expect(screen.getByTestId('job-card-preview').textContent).toContain('Locked');
    fireEvent.click(screen.getByRole('button', { name: 'Lock 30.00 USDC & publish' }));
    await waitFor(() => expect(runPostJob).toHaveBeenCalledTimes(1));
    expect(runPostJob.mock.calls[0][4]).toEqual({ lockNow: true });
    expect(requests[0].title).toBe('Lock 30.00 USDC & publish');
    expect(requests[0].note?.text.startsWith(LOCK_NOW_TEXT('30.00 USDC'))).toBe(true);
    expect(await screen.findByText('Published · 30.00 USDC locked')).toBeTruthy();
  });

  it('flag off: no choice, the v1.3 button, always locks now', async () => {
    page(false);
    fill();
    expect(screen.queryByRole('radiogroup', { name: 'When is the budget locked?' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Lock 30.00 USDC & publish' }));
    await waitFor(() => expect(runPostJob).toHaveBeenCalledTimes(1));
    expect(runPostJob.mock.calls[0][4]).toEqual({ lockNow: true });
    expect(requests[0].note?.text).toBe('With no applicants you can withdraw the budget at any time. Once someone applies, it stays locked until the select-by date.');
  });
});
