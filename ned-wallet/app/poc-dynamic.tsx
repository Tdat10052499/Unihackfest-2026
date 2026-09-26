// PoC T0.4 — kiểm tra Dynamic SDK trên Expo SDK 57 (nhánh poc/dynamic, không merge vào main).
// Mở bằng deep link: nedwallet://poc-dynamic
import React, { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  completeSocialRedirect,
  detectSocialRedirectUrl,
  getNetworksData,
  getWalletAccounts,
  initializeClient,
  logout,
  signInWithSocialPopUp,
  signInWithSocialRedirect,
  switchActiveNetwork,
  type DynamicClient,
} from '@dynamic-labs-sdk/client';
import { createWaasWalletAccounts, getChainsMissingWaasWalletAccounts } from '@dynamic-labs-sdk/client/waas';
import {
  DynamicProvider,
  useDynamicClient,
  useGetWalletAccounts,
  useInitStatus,
  useOnEvent,
  useUser,
} from '@dynamic-labs-sdk/react-hooks';
import {
  getSolanaConnection,
  isSolanaWalletAccount,
  signAndSendSponsoredTransaction,
  signAndSendTransaction,
  type SolanaWalletAccount,
} from '@dynamic-labs-sdk/solana';
import { LAMPORTS_PER_SOL, PublicKey, Transaction, TransactionInstruction, type Connection } from '@solana/web3.js';
import { scryptAsync } from '@noble/hashes/scrypt.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';
import { Buffer } from 'buffer';
import { dynamicClient } from '../poc/dynamicClient';
import {
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  USDC_DEVNET_MINT,
} from '../services/solana';

const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
const SCRYPT_INPUT = '+84901234567';
const SCRYPT_SALT = 'ned-poc-salt-v1';
const SCRYPT_RUNS = 3;
const IS_WEB = Platform.OS === 'web';
// Web: lưu thời điểm bấm Login để đo cả thời gian ở trang Google (trang bị tải lại sau redirect)
const LOGIN_STARTED_KEY = 'ned_poc_login_started_at';

const queryClient = new QueryClient();

type StepResult = {
  status: 'running' | 'ok' | 'error';
  ms?: number;
  lines: string[];
  link?: string;
  error?: string;
};

type StepKey = 'login' | 'memo' | 'memoZero' | 'ata' | 'scrypt';

const explorerTx = (signature: string) => `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
const formatSol = (lamports: number) => `${(lamports / LAMPORTS_PER_SOL).toFixed(6)} SOL`;

function errorMessage(err: unknown): string {
  if (err instanceof Error) return `${err.name}: ${err.message}`;
  return String(err);
}

/** Chuyển ví sang Solana devnet (network phải được bật trong Dynamic Console) và trả về Connection devnet */
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

function memoTransaction(owner: PublicKey, text: string): Transaction {
  return new Transaction().add(
    new TransactionInstruction({
      keys: [{ pubkey: owner, isSigner: true, isWritable: false }],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(text, 'utf8'),
    })
  );
}

/** Đặt blockhash + feePayer = ví người dùng (khi được tài trợ, Dynamic thay feePayer) */
async function prepare(tx: Transaction, connection: Connection, owner: PublicKey): Promise<Transaction> {
  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;
  tx.feePayer = owner;
  return tx;
}

/** Đọc fee payer thực tế của giao dịch on-chain để biết ai đã trả phí */
async function describeFeePayer(connection: Connection, signature: string, owner: string): Promise<string[]> {
  const tx = await connection.getTransaction(signature, { commitment: 'confirmed', maxSupportedTransactionVersion: 0 });
  if (!tx) return ['Fee payer: (transaction not found yet)'];
  const feePayer = tx.transaction.message.staticAccountKeys[0].toBase58();
  return [
    `Fee payer: ${feePayer}`,
    feePayer === owner ? 'Fee paid by: USER wallet' : 'Fee paid by: SPONSOR (not the user)',
    `Fee: ${tx.meta?.fee ?? '?'} lamports`,
  ];
}

// Dùng chung 1 promise để listener userChanged và nút Login không tạo ví 2 lần song song
let creatingWallet: Promise<void> | null = null;
function ensureSolanaWallet(client: DynamicClient): Promise<void> {
  if (!getChainsMissingWaasWalletAccounts(client).includes('SOL')) return Promise.resolve();
  creatingWallet ??= createWaasWalletAccounts({ chains: ['SOL'] }, client).finally(() => {
    creatingWallet = null;
  });
  return creatingWallet;
}

export default function PocDynamicScreen() {
  if (!dynamicClient) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Dynamic PoC</Text>
        <Text style={styles.error}>
          Missing EXPO_PUBLIC_DYNAMIC_ENVIRONMENT_ID in .env — add it and restart Metro with --clear.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <DynamicProvider client={dynamicClient}>
        <PocContent />
      </DynamicProvider>
    </QueryClientProvider>
  );
}

function PocContent() {
  const client = useDynamicClient();
  const { data: initStatus } = useInitStatus();
  const { data: user } = useUser();
  const { data: walletAccounts = [] } = useGetWalletAccounts();
  const solanaAccount = walletAccounts.find(isSolanaWalletAccount);
  const [results, setResults] = useState<Partial<Record<StepKey, StepResult>>>({});

  useEffect(() => {
    if (initStatus !== 'uninitialized') return;
    initializeClient(client)
      .then(async () => {
        // Web: quay về từ trang Google → hoàn tất đăng nhập
        if (!IS_WEB) return;
        const url = new URL(window.location.href);
        if (!(await detectSocialRedirectUrl({ url }, client))) return;
        run('login', async () => {
          await completeSocialRedirect({ url }, client);
          window.history.replaceState(null, '', url.pathname);
          const lines = await finishLogin();
          const startedAt = Number(window.sessionStorage.getItem(LOGIN_STARTED_KEY));
          window.sessionStorage.removeItem(LOGIN_STARTED_KEY);
          if (startedAt) lines.push(`Total incl. Google page: ${Date.now() - startedAt} ms`);
          return { lines };
        });
      })
      .catch((err) => console.warn('[Dynamic PoC] initializeClient failed:', err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, initStatus]);

  // Ví nhúng không tự tạo sau khi đăng nhập — tạo khi user thay đổi (theo React Native Quickstart)
  useOnEvent({
    event: 'userChanged',
    listener: async ({ user: changedUser }) => {
      if (!changedUser) return;
      await ensureSolanaWallet(client);
    },
  });

  const run = async (key: StepKey, fn: () => Promise<Omit<StepResult, 'status' | 'ms'>>) => {
    setResults((r) => ({ ...r, [key]: { status: 'running', lines: [] } }));
    const t0 = Date.now();
    try {
      const out = await fn();
      setResults((r) => ({ ...r, [key]: { ...out, status: 'ok', ms: Date.now() - t0 } }));
    } catch (err) {
      console.warn(`[Dynamic PoC] ${key} failed:`, err);
      setResults((r) => ({
        ...r,
        [key]: { status: 'error', ms: Date.now() - t0, lines: [], error: errorMessage(err) },
      }));
    }
  };

  const requireAccount = (): SolanaWalletAccount => {
    if (!solanaAccount) throw new Error('No Solana embedded wallet yet — run "Login with Google" first');
    return solanaAccount;
  };

  /** Tạo ví Solana nhúng (nếu thiếu) → trả về địa chỉ + số dư devnet */
  const finishLogin = async (): Promise<string[]> => {
    await ensureSolanaWallet(client);
    const account = await waitForSolanaAccount(client);
    const connection = await switchToDevnet(client, account);
    const balance = await connection.getBalance(new PublicKey(account.address), 'confirmed');
    return [`Wallet: ${account.address}`, `Balance (devnet): ${formatSol(balance)}`];
  };

  const login = () =>
    run('login', async () => {
      if (!user) {
        if (IS_WEB) {
          // Trang sẽ chuyển sang Google rồi quay lại — phần còn lại chạy trong useEffect ở trên
          window.sessionStorage.setItem(LOGIN_STARTED_KEY, String(Date.now()));
          await signInWithSocialRedirect({ provider: 'google', redirectUrl: window.location.href }, client);
          return { lines: ['Redirecting to Google…'] };
        }
        await signInWithSocialPopUp({ provider: 'google' }, client);
      }
      return { lines: await finishLogin() };
    });

  const sendMemo = () =>
    run('memo', async () => {
      const account = requireAccount();
      const owner = new PublicKey(account.address);
      const connection = await switchToDevnet(client, account);
      const tx = await prepare(memoTransaction(owner, `N.E.D PoC memo ${Date.now()}`), connection, owner);
      // sponsorshipMode 'off' → kiểm tra riêng việc ký + gửi, người dùng tự trả phí
      const { signature } = await signAndSendTransaction(
        { transaction: tx, walletAccount: account, sponsorshipMode: 'off' },
        client
      );
      await connection.confirmTransaction(signature, 'confirmed');
      return {
        lines: [`Signature: ${signature}`, ...(await describeFeePayer(connection, signature, account.address))],
        link: explorerTx(signature),
      };
    });

  const sendMemoZeroSol = () =>
    run('memoZero', async () => {
      const account = requireAccount();
      const owner = new PublicKey(account.address);
      const connection = await switchToDevnet(client, account);
      const before = await connection.getBalance(owner, 'confirmed');
      const tx = await prepare(memoTransaction(owner, `N.E.D PoC sponsored memo ${Date.now()}`), connection, owner);
      // Bắt buộc tài trợ — ném SponsorTransactionError nếu không tài trợ được
      const { signature } = await signAndSendSponsoredTransaction({ transaction: tx, walletAccount: account }, client);
      await connection.confirmTransaction(signature, 'confirmed');
      const after = await connection.getBalance(owner, 'confirmed');
      return {
        lines: [
          `Balance before: ${formatSol(before)}${before > 0 ? '  ⚠️ not a 0 SOL wallet' : ''}`,
          `Balance after: ${formatSol(after)}`,
          `Signature: ${signature}`,
          ...(await describeFeePayer(connection, signature, account.address)),
        ],
        link: explorerTx(signature),
      };
    });

  // Phương án dự phòng T1.6 (SVM Gas Sponsorship bị khoá — không phải gói Enterprise):
  // người dùng tự trả phí + rent → đo số SOL thực tế bị trừ khi tạo ATA USDC
  const createUsdcAta = () =>
    run('ata', async () => {
      const account = requireAccount();
      const owner = new PublicKey(account.address);
      const connection = await switchToDevnet(client, account);
      const ata = getAssociatedTokenAddress(USDC_DEVNET_MINT, owner);
      if (await connection.getAccountInfo(ata, 'confirmed')) {
        throw new Error(`USDC ATA already exists (${ata.toBase58()}) — use a fresh wallet to measure rent`);
      }
      const before = await connection.getBalance(owner, 'confirmed');
      const tx = await prepare(
        new Transaction().add(createAssociatedTokenAccountInstruction(owner, ata, owner, USDC_DEVNET_MINT)),
        connection,
        owner
      );
      const { signature } = await signAndSendTransaction(
        { transaction: tx, walletAccount: account, sponsorshipMode: 'off' },
        client
      );
      await connection.confirmTransaction(signature, 'confirmed');
      const after = await connection.getBalance(owner, 'confirmed');
      const rent = await connection.getBalance(ata, 'confirmed');
      return {
        lines: [
          `ATA: ${ata.toBase58()}`,
          `Balance before: ${formatSol(before)}`,
          `Balance after: ${formatSol(after)}`,
          `Rent locked in ATA: ${formatSol(rent)} (${rent} lamports)`,
          `Total deducted (rent + fee): ${formatSol(before - after)}`,
          `Signature: ${signature}`,
          ...(await describeFeePayer(connection, signature, account.address)),
        ],
        link: explorerTx(signature),
      };
    });

  const benchmarkScrypt = () =>
    run('scrypt', async () => {
      const lines: string[] = [];
      for (const logN of [14, 15]) {
        const times: number[] = [];
        let hash = '';
        for (let i = 0; i < SCRYPT_RUNS; i++) {
          const t0 = Date.now();
          const out = await scryptAsync(utf8ToBytes(SCRYPT_INPUT), utf8ToBytes(SCRYPT_SALT), {
            N: 2 ** logN,
            r: 8,
            p: 1,
            dkLen: 32,
          });
          times.push(Date.now() - t0);
          hash = bytesToHex(out);
        }
        const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
        lines.push(`N=2^${logN}: avg ${avg} ms  (runs: ${times.join(', ')} ms)  hash ${hash.slice(0, 16)}…`);
      }
      return { lines };
    });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Dynamic PoC (T0.4)</Text>
        <Text style={styles.meta}>Init: {initStatus ?? '…'}</Text>
        <Text style={styles.meta}>User: {user ? user.email || user.id : 'signed out'}</Text>
        <Text style={styles.meta}>Solana wallet: {solanaAccount?.address ?? '—'}</Text>

        <PocButton title="a. Login with Google" onPress={login} result={results.login} />
        <PocButton title="b. Send memo (devnet)" onPress={sendMemo} result={results.memo} />
        <PocButton title="c. Memo from 0 SOL wallet" onPress={sendMemoZeroSol} result={results.memoZero} />
        <PocButton title="d. Create USDC ATA (user pays)" onPress={createUsdcAta} result={results.ata} />
        <PocButton title="e. Benchmark scrypt" onPress={benchmarkScrypt} result={results.scrypt} />

        {user ? (
          <Pressable style={[styles.button, styles.secondary]} onPress={() => logout(client)}>
            <Text style={styles.buttonText}>Log out</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Chờ ví Solana nhúng xuất hiện sau khi tạo (tối đa ~10 giây) */
async function waitForSolanaAccount(client: DynamicClient): Promise<SolanaWalletAccount> {
  for (let i = 0; i < 20; i++) {
    const account = getWalletAccounts(client).find(isSolanaWalletAccount);
    if (account) return account;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('Solana embedded wallet was not created');
}

function PocButton({ title, onPress, result }: { title: string; onPress: () => void; result?: StepResult }) {
  const running = result?.status === 'running';
  return (
    <View style={styles.card}>
      <Pressable style={[styles.button, running && styles.disabled]} onPress={onPress} disabled={running}>
        <Text style={styles.buttonText}>{running ? `${title} …` : title}</Text>
      </Pressable>
      {result && result.status !== 'running' ? (
        <View style={styles.result}>
          <Text style={result.status === 'ok' ? styles.ok : styles.error}>
            {result.status === 'ok' ? 'OK' : 'FAILED'} · {result.ms} ms
          </Text>
          {result.lines.map((line, i) => (
            <Text key={i} style={styles.line} selectable>
              {line}
            </Text>
          ))}
          {result.error ? (
            <Text style={styles.error} selectable>
              {result.error}
            </Text>
          ) : null}
          {result.link ? (
            <Text style={styles.link} onPress={() => Linking.openURL(result.link!)}>
              Open in Solana Explorer (devnet)
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF8F5' },
  scroll: { padding: 16, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8, color: '#000' },
  meta: { fontSize: 12, color: '#444', marginBottom: 2 },
  card: { marginTop: 16, borderWidth: 2, borderColor: '#000', borderRadius: 8, backgroundColor: '#FFF' },
  button: { backgroundColor: '#000', padding: 14, borderRadius: 6 },
  secondary: { marginTop: 24, backgroundColor: '#666' },
  disabled: { opacity: 0.5 },
  buttonText: { color: '#FFF', fontWeight: '700', textAlign: 'center' },
  result: { padding: 12, gap: 4 },
  ok: { color: '#10B981', fontWeight: '700' },
  error: { color: '#EF4444', fontWeight: '600' },
  line: { fontSize: 12, color: '#111', fontFamily: 'monospace' },
  link: { color: '#2563EB', textDecorationLine: 'underline', marginTop: 4 },
});
