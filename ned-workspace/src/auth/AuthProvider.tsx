// AuthProvider + useAuth(): the only layer that wraps the Dynamic JS SDK. Same shape as the mobile app
// (ned-wallet/services/auth): { status, walletAddress, login, logout, signTransaction }. No gas sponsorship.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  completeSocialRedirect,
  detectSocialRedirectUrl,
  getNetworksData,
  initializeClient,
  logout as dynamicLogout,
  signInWithSocialRedirect,
  switchActiveNetwork,
  type DynamicClient,
} from '@dynamic-labs-sdk/client';
import { createWaasWalletAccounts, getChainsMissingWaasWalletAccounts } from '@dynamic-labs-sdk/client/waas';
import { DynamicProvider, useGetWalletAccounts, useInitStatus, useOnEvent, useUser } from '@dynamic-labs-sdk/react-hooks';
import {
  isSolanaWalletAccount,
  signTransaction as dynamicSignTransaction,
  type SolanaWalletAccount,
} from '@dynamic-labs-sdk/solana';
import type { Transaction, VersionedTransaction } from '@solana/web3.js';
import { dynamicClient } from './client.ts';

export type AuthStatus = 'unconfigured' | 'initializing' | 'signed-out' | 'setting-up' | 'ready' | 'error';

export interface AuthContextValue {
  status: AuthStatus;
  /** Embedded Solana wallet of the signed-in user */
  walletAddress: string | null;
  email: string | null;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  signTransaction: <T extends Transaction | VersionedTransaction>(tx: T) => Promise<T>;
}

const NOT_CONFIGURED = 'Missing VITE_DYNAMIC_ENVIRONMENT_ID: add it to ned-workspace/.env.local and restart.';
const AuthContext = createContext<AuthContextValue | null>(null);

// One promise, so the userChanged listener and the restore path never create the wallet twice
let creatingWallet: Promise<void> | null = null;
function ensureSolanaWallet(client: DynamicClient): Promise<void> {
  if (!getChainsMissingWaasWalletAccounts(client).includes('SOL')) return Promise.resolve();
  creatingWallet ??= createWaasWalletAccounts({ chains: ['SOL'] }, client).finally(() => {
    creatingWallet = null;
  });
  return creatingWallet;
}

/** Point the wallet at Solana devnet (enabled in the Dynamic dashboard › Chains & Networks) */
async function switchToDevnet(client: DynamicClient, walletAccount: SolanaWalletAccount): Promise<void> {
  const devnet = getNetworksData(client).find((n) => n.chain === 'SOL' && (n.cluster === 'devnet' || /devnet/i.test(n.displayName)));
  if (!devnet) throw new Error('Solana Devnet is not enabled in the Dynamic dashboard (Chains & Networks).');
  await switchActiveNetwork({ networkId: devnet.networkId, walletAccount }, client);
}

const message = (err: unknown) => (err instanceof Error ? err.message : String(err));

/**
 * Dev-only read-only preview (builds with VITE_DEV_TOOLS=1; removed from normal builds): `?previewWallet=<address>`
 * shows the Workspace as that public wallet without a login, for screenshots and browser checks. Nothing can be signed.
 */
function previewWallet(): string | null {
  if (import.meta.env.VITE_DEV_TOOLS !== '1') return null;
  try {
    const fromUrl = new URLSearchParams(location.search).get('previewWallet');
    if (fromUrl) sessionStorage.setItem('ned.previewWallet', fromUrl);
    return fromUrl ?? sessionStorage.getItem('ned.previewWallet');
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const preview = previewWallet();
  if (preview) return <Preview wallet={preview}>{children}</Preview>;
  if (!dynamicClient) return <Unconfigured>{children}</Unconfigured>;
  return (
    <DynamicProvider client={dynamicClient}>
      <DynamicAuth client={dynamicClient}>{children}</DynamicAuth>
    </DynamicProvider>
  );
}

function DynamicAuth({ client, children }: { client: DynamicClient; children: ReactNode }) {
  const { data: initStatus } = useInitStatus();
  const { data: user } = useUser();
  const { data: accounts = [] } = useGetWalletAccounts();
  const account = accounts.find(isSolanaWalletAccount) ?? null;
  const [devnetFor, setDevnetFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 1. Initialise; finish the Google redirect when we come back from it
  useEffect(() => {
    if (initStatus !== 'uninitialized') return;
    initializeClient(client)
      .then(async () => {
        const url = new URL(window.location.href);
        if (!(await detectSocialRedirectUrl({ url }, client))) return;
        await completeSocialRedirect({ url }, client);
        window.history.replaceState(null, '', url.pathname);
      })
      .catch((err) => setError(message(err)));
  }, [client, initStatus]);

  // 2. The embedded wallet is not created automatically after sign-in
  useOnEvent({
    event: 'userChanged',
    listener: async ({ user: changed }) => {
      if (changed) await ensureSolanaWallet(client).catch((err) => setError(message(err)));
    },
  });

  // 3. Restored session: create the wallet if missing, else switch it to devnet
  const hasUser = Boolean(user);
  const address = account?.address ?? null;
  useEffect(() => {
    if (!hasUser || initStatus !== 'finished') return;
    if (!account) {
      ensureSolanaWallet(client).catch((err) => setError(message(err)));
      return;
    }
    if (devnetFor === account.address) return;
    let cancelled = false;
    switchToDevnet(client, account)
      .then(() => !cancelled && setDevnetFor(account.address))
      .catch((err) => !cancelled && setError(message(err)));
    return () => {
      cancelled = true;
    };
    // account is tracked through its address
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, hasUser, initStatus, address, devnetFor]);

  const login = useCallback(async () => {
    setError(null);
    await signInWithSocialRedirect({ provider: 'google', redirectUrl: window.location.origin + window.location.pathname }, client);
  }, [client]);

  const logout = useCallback(async () => {
    await dynamicLogout(client);
    setDevnetFor(null);
    setError(null);
  }, [client]);

  const signTransaction = useCallback(
    async <T extends Transaction | VersionedTransaction>(tx: T): Promise<T> => {
      if (!account) throw new Error('No wallet yet. Sign in first.');
      if (devnetFor !== account.address) {
        await switchToDevnet(client, account);
        setDevnetFor(account.address);
      }
      const { signedTransaction } = await dynamicSignTransaction({ transaction: tx, walletAccount: account }, client);
      return signedTransaction as T;
    },
    [client, account, devnetFor]
  );

  let status: AuthStatus;
  if (initStatus === 'failed') status = 'error';
  else if (initStatus !== 'finished') status = 'initializing';
  else if (!user) status = 'signed-out';
  else if (!account || devnetFor !== account.address) status = error ? 'error' : 'setting-up';
  else status = 'ready';

  const value = useMemo<AuthContextValue>(
    () => ({ status, walletAddress: address, email: user?.email ?? null, error, login, logout, signTransaction }),
    [status, address, user?.email, error, login, logout, signTransaction]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function Preview({ wallet, children }: { wallet: string; children: ReactNode }) {
  const value = useMemo<AuthContextValue>(() => {
    const fail = async (): Promise<never> => {
      throw new Error('Preview only: nothing can be signed here.');
    };
    return { status: 'ready', walletAddress: wallet, email: 'preview@example.com', error: null, login: fail, logout: async () => {}, signTransaction: fail };
  }, [wallet]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function Unconfigured({ children }: { children: ReactNode }) {
  const value = useMemo<AuthContextValue>(() => {
    const fail = async (): Promise<never> => {
      throw new Error(NOT_CONFIGURED);
    };
    return { status: 'unconfigured', walletAddress: null, email: null, error: NOT_CONFIGURED, login: fail, logout: async () => {}, signTransaction: fail };
  }, []);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
