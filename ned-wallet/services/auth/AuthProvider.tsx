// AuthProvider + useAuth(): lớp duy nhất bọc Dynamic JS SDK (đăng nhập Google + ví nhúng Solana MPC).
// Các màn hình chỉ gọi useAuth(), không import @dynamic-labs-sdk/* trực tiếp.
// Không có gas sponsorship (gói Dynamic không phải Enterprise) → mọi giao dịch sponsorshipMode 'off', ví tự trả phí.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  completeSocialRedirect,
  detectSocialRedirectUrl,
  getNetworksData,
  initializeClient,
  logout as dynamicLogout,
  signInWithSocialPopUp,
  signInWithSocialRedirect,
  signMessage as dynamicSignMessage,
  switchActiveNetwork,
  type DynamicClient,
} from '@dynamic-labs-sdk/client';
import { createWaasWalletAccounts, getChainsMissingWaasWalletAccounts } from '@dynamic-labs-sdk/client/waas';
import { DynamicProvider, useGetWalletAccounts, useInitStatus, useOnEvent, useUser } from '@dynamic-labs-sdk/react-hooks';
import {
  getSolanaConnection,
  isSolanaWalletAccount,
  signAndSendTransaction as dynamicSignAndSendTransaction,
  signTransaction as dynamicSignTransaction,
  type SolanaWalletAccount,
} from '@dynamic-labs-sdk/solana';
import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { dynamicClient, IS_WEB } from './client';

export type AuthStatus = 'unconfigured' | 'initializing' | 'signed-out' | 'setting-up' | 'ready' | 'error';

export interface AuthUser {
  id: string;
  email: string | null;
}

export interface AuthContextValue {
  status: AuthStatus;
  /** SDK đã khởi tạo xong */
  isReady: boolean;
  isAuthenticated: boolean;
  user: AuthUser | null;
  /** Địa chỉ ví Solana nhúng của người dùng */
  walletAddress: string | null;
  /** Connection devnet (RPC cấu hình trong Dynamic Console; fallback Helius/public khi chưa sẵn sàng) */
  connection: Connection;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  signTransaction: <T extends Transaction | VersionedTransaction>(tx: T) => Promise<T>;
  /** Ký + gửi, trả về signature (chưa chờ confirm). Tự điền blockhash/feePayer cho Transaction legacy nếu thiếu. */
  signAndSendTransaction: (tx: Transaction | VersionedTransaction) => Promise<string>;
  signMessage: (message: string) => Promise<string>;
  getJwt: () => string | null;
}

const FALLBACK_DEVNET_RPC =
  process.env.EXPO_PUBLIC_HELIUS_DEVNET_URL || process.env.EXPO_PUBLIC_SOLANA_DEVNET_RPC || 'https://api.devnet.solana.com';
const fallbackConnection = new Connection(FALLBACK_DEVNET_RPC, 'confirmed');

const NOT_CONFIGURED = 'Missing EXPO_PUBLIC_DYNAMIC_ENVIRONMENT_ID — add it to ned-wallet/.env and restart Metro with --clear.';

const AuthContext = createContext<AuthContextValue | null>(null);
const queryClient = new QueryClient();

// Dùng chung 1 promise để listener userChanged và login() không tạo ví 2 lần song song
let creatingWallet: Promise<void> | null = null;
function ensureSolanaWallet(client: DynamicClient): Promise<void> {
  if (!getChainsMissingWaasWalletAccounts(client).includes('SOL')) return Promise.resolve();
  creatingWallet ??= createWaasWalletAccounts({ chains: ['SOL'] }, client).finally(() => {
    creatingWallet = null;
  });
  return creatingWallet;
}

/** Chuyển ví sang Solana devnet (phải bật trong Dynamic Console › Chains & Networks) và trả về Connection devnet */
async function switchToDevnet(client: DynamicClient, walletAccount: SolanaWalletAccount): Promise<Connection> {
  const devnet = getNetworksData(client).find(
    (n) => n.chain === 'SOL' && (n.cluster === 'devnet' || /devnet/i.test(n.displayName))
  );
  if (!devnet) {
    throw new Error('Solana Devnet is not enabled in Dynamic Console (Chains & Networks)');
  }
  await switchActiveNetwork({ networkId: devnet.networkId, walletAccount }, client);
  return getSolanaConnection({ networkData: devnet });
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  if (!dynamicClient) {
    return <UnconfiguredAuthProvider>{children}</UnconfiguredAuthProvider>;
  }
  return (
    <QueryClientProvider client={queryClient}>
      <DynamicProvider client={dynamicClient}>
        <DynamicAuthProvider client={dynamicClient}>{children}</DynamicAuthProvider>
      </DynamicProvider>
    </QueryClientProvider>
  );
}

function DynamicAuthProvider({ client, children }: { client: DynamicClient; children: ReactNode }) {
  const { data: initStatus } = useInitStatus();
  const { data: sdkUser } = useUser();
  const { data: walletAccounts = [] } = useGetWalletAccounts();
  const solanaAccount = walletAccounts.find(isSolanaWalletAccount) ?? null;
  const [devnet, setDevnet] = useState<{ address: string; connection: Connection } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 1. Khởi tạo SDK; web: hoàn tất đăng nhập khi quay về từ trang Google
  useEffect(() => {
    if (initStatus !== 'uninitialized') return;
    initializeClient(client)
      .then(async () => {
        if (!IS_WEB) return;
        const url = new URL(window.location.href);
        if (!(await detectSocialRedirectUrl({ url }, client))) return;
        await completeSocialRedirect({ url }, client);
        window.history.replaceState(null, '', url.pathname);
      })
      .catch((err) => {
        console.warn('[auth] initialize / redirect failed:', err);
        setError(errorMessage(err));
      });
  }, [client, initStatus]);

  // 2. Ví nhúng không tự tạo sau khi đăng nhập — tạo khi user thay đổi
  useOnEvent({
    event: 'userChanged',
    listener: async ({ user }) => {
      if (!user) return;
      await ensureSolanaWallet(client).catch((err) => setError(errorMessage(err)));
    },
  });

  // 3. Phiên được khôi phục (không có userChanged) nhưng chưa có ví → tạo; có ví → chuyển sang devnet
  const hasUser = Boolean(sdkUser);
  const accountAddress = solanaAccount?.address ?? null;
  useEffect(() => {
    if (!hasUser || initStatus !== 'finished') return;
    if (!solanaAccount) {
      ensureSolanaWallet(client).catch((err) => setError(errorMessage(err)));
      return;
    }
    if (devnet?.address === solanaAccount.address) return;
    let cancelled = false;
    switchToDevnet(client, solanaAccount)
      .then((connection) => {
        if (!cancelled) setDevnet({ address: solanaAccount.address, connection });
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err));
      });
    return () => {
      cancelled = true;
    };
    // solanaAccount được theo dõi qua accountAddress
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, hasUser, initStatus, accountAddress, devnet?.address]);

  const requireAccount = useCallback(async (): Promise<SolanaWalletAccount> => {
    if (!solanaAccount) throw new Error('No Solana wallet yet — please sign in first.');
    if (devnet?.address !== solanaAccount.address) {
      const connection = await switchToDevnet(client, solanaAccount);
      setDevnet({ address: solanaAccount.address, connection });
    }
    return solanaAccount;
  }, [client, solanaAccount, devnet?.address]);

  const connection = devnet?.connection ?? fallbackConnection;

  const login = useCallback(async () => {
    setError(null);
    if (IS_WEB) {
      // Trang chuyển sang Google rồi quay lại — bước 1 hoàn tất đăng nhập
      await signInWithSocialRedirect(
        { provider: 'google', redirectUrl: window.location.origin + window.location.pathname },
        client
      );
      return;
    }
    await signInWithSocialPopUp({ provider: 'google' }, client);
    await ensureSolanaWallet(client);
  }, [client]);

  const logout = useCallback(async () => {
    await dynamicLogout(client);
    setDevnet(null);
    setError(null);
  }, [client]);

  const signTransaction = useCallback(
    async <T extends Transaction | VersionedTransaction>(tx: T): Promise<T> => {
      const walletAccount = await requireAccount();
      const { signedTransaction } = await dynamicSignTransaction({ transaction: tx, walletAccount }, client);
      return signedTransaction as T;
    },
    [client, requireAccount]
  );

  const signAndSendTransaction = useCallback(
    async (tx: Transaction | VersionedTransaction): Promise<string> => {
      const walletAccount = await requireAccount();
      if (tx instanceof Transaction) {
        if (!tx.feePayer) tx.feePayer = new PublicKey(walletAccount.address);
        if (!tx.recentBlockhash) {
          const conn = devnet?.connection ?? fallbackConnection;
          tx.recentBlockhash = (await conn.getLatestBlockhash('confirmed')).blockhash;
        }
      }
      const { signature } = await dynamicSignAndSendTransaction(
        { transaction: tx, walletAccount, sponsorshipMode: 'off', options: { preflightCommitment: 'confirmed' } },
        client
      );
      return signature;
    },
    [client, requireAccount, devnet?.connection]
  );

  const signMessage = useCallback(
    async (message: string): Promise<string> => {
      const walletAccount = await requireAccount();
      const { signature } = await dynamicSignMessage({ message, walletAccount }, client);
      return signature;
    },
    [client, requireAccount]
  );

  const getJwt = useCallback(() => client.token, [client]);

  let status: AuthStatus;
  if (initStatus === 'failed') status = 'error';
  else if (initStatus !== 'finished') status = 'initializing';
  else if (!sdkUser) status = 'signed-out';
  else if (!solanaAccount || devnet?.address !== solanaAccount.address) status = error ? 'error' : 'setting-up';
  else status = 'ready';

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      isReady: initStatus === 'finished' || initStatus === 'failed',
      isAuthenticated: Boolean(sdkUser),
      user: sdkUser ? { id: sdkUser.id, email: sdkUser.email ?? null } : null,
      walletAddress: accountAddress,
      connection,
      error,
      login,
      logout,
      signTransaction,
      signAndSendTransaction,
      signMessage,
      getJwt,
    }),
    [status, initStatus, sdkUser, accountAddress, connection, error, login, logout, signTransaction, signAndSendTransaction, signMessage, getJwt]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function UnconfiguredAuthProvider({ children }: { children: ReactNode }) {
  const value = useMemo<AuthContextValue>(() => {
    const fail = async (): Promise<never> => {
      throw new Error(NOT_CONFIGURED);
    };
    return {
      status: 'unconfigured',
      isReady: true,
      isAuthenticated: false,
      user: null,
      walletAddress: null,
      connection: fallbackConnection,
      error: NOT_CONFIGURED,
      login: fail,
      logout: async () => {},
      signTransaction: fail,
      signAndSendTransaction: fail,
      signMessage: fail,
      getJwt: () => null,
    };
  }, []);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
