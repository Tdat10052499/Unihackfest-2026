// PoC T0.4 — kiểm tra Dynamic trên Expo SDK 57. Giờ dùng chung services/auth (useAuth).
// Mở bằng route /poc-dynamic (web) hoặc deep link nedwallet://poc-dynamic (native).
import React, { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Connection, LAMPORTS_PER_SOL, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import { scryptAsync } from '@noble/hashes/scrypt.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';
import { Buffer } from 'buffer';
import { useAuth } from '../services/auth';
import {
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  USDC_DEVNET_MINT,
} from '../services/solana';

// RPC công khai của Solana cho requestAirdrop (RPC devnet của Dynamic/Helius có thể không hỗ trợ airdrop)
const PUBLIC_DEVNET_RPC = 'https://api.devnet.solana.com';
const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
const SCRYPT_INPUT = '+84901234567';
const SCRYPT_SALT = 'ned-poc-salt-v1';
const SCRYPT_RUNS = 3;

type StepResult = {
  status: 'running' | 'ok' | 'error';
  ms?: number;
  lines: string[];
  link?: string;
  error?: string;
};

type StepKey = 'login' | 'airdrop' | 'memo' | 'ata' | 'scrypt';

const explorerTx = (signature: string) => `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
const formatSol = (lamports: number) => `${(lamports / LAMPORTS_PER_SOL).toFixed(6)} SOL`;

function errorMessage(err: unknown): string {
  if (err instanceof Error) return `${err.name}: ${err.message}`;
  return String(err);
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

/** Ví 0 SOL → báo rõ thay vì lỗi mô phỏng "no record of a prior credit" */
async function requireSol(connection: Connection, owner: PublicKey): Promise<void> {
  if ((await connection.getBalance(owner, 'confirmed')) === 0) {
    throw new Error('Wallet has 0 SOL on devnet — tap "Get test SOL" first');
  }
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

export default function PocDynamicScreen() {
  const auth = useAuth();
  const { user, walletAddress, connection } = auth;
  const [results, setResults] = useState<Partial<Record<StepKey, StepResult>>>({});

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

  const requireWallet = (): PublicKey => {
    if (!walletAddress) throw new Error('No Solana wallet yet — run "Login with Google" first');
    return new PublicKey(walletAddress);
  };

  const login = () =>
    run('login', async () => {
      if (!user) {
        await auth.login();
        return { lines: ['Redirecting to Google…'] };
      }
      const owner = requireWallet();
      const balance = await connection.getBalance(owner, 'confirmed');
      return { lines: [`Wallet: ${owner.toBase58()}`, `Balance (devnet): ${formatSol(balance)}`] };
    });

  // Nút "Get test SOL" của phương án dự phòng T1.6 — airdrop devnet (có thể bị giới hạn tần suất)
  const getTestSol = () =>
    run('airdrop', async () => {
      const owner = requireWallet();
      const faucet = new Connection(PUBLIC_DEVNET_RPC, 'confirmed');
      const signature = await faucet.requestAirdrop(owner, LAMPORTS_PER_SOL);
      await faucet.confirmTransaction(signature, 'confirmed');
      const balance = await connection.getBalance(owner, 'confirmed');
      return {
        lines: [`Airdropped 1 SOL`, `Balance (devnet): ${formatSol(balance)}`, `Signature: ${signature}`],
        link: explorerTx(signature),
      };
    });

  const sendMemo = () =>
    run('memo', async () => {
      const owner = requireWallet();
      await requireSol(connection, owner);
      const signature = await auth.signAndSendTransaction(memoTransaction(owner, `N.E.D PoC memo ${Date.now()}`));
      await connection.confirmTransaction(signature, 'confirmed');
      return {
        lines: [`Signature: ${signature}`, ...(await describeFeePayer(connection, signature, owner.toBase58()))],
        link: explorerTx(signature),
      };
    });

  // Phương án dự phòng T1.6 (SVM Gas Sponsorship bị khoá — không phải gói Enterprise):
  // người dùng tự trả phí + rent → đo số SOL thực tế bị trừ khi tạo ATA USDC
  const createUsdcAta = () =>
    run('ata', async () => {
      const owner = requireWallet();
      const ata = getAssociatedTokenAddress(USDC_DEVNET_MINT, owner);
      if (await connection.getAccountInfo(ata, 'confirmed')) {
        throw new Error(`USDC ATA already exists (${ata.toBase58()}) — use a fresh wallet to measure rent`);
      }
      await requireSol(connection, owner);
      const before = await connection.getBalance(owner, 'confirmed');
      const signature = await auth.signAndSendTransaction(
        new Transaction().add(createAssociatedTokenAccountInstruction(owner, ata, owner, USDC_DEVNET_MINT))
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
          ...(await describeFeePayer(connection, signature, owner.toBase58())),
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
        <Text style={styles.meta}>Status: {auth.status}</Text>
        <Text style={styles.meta}>User: {user ? user.email || user.id : 'signed out'}</Text>
        <Text style={styles.meta}>Solana wallet: {walletAddress ?? '—'}</Text>
        {auth.error ? <Text style={styles.error}>{auth.error}</Text> : null}

        <PocButton title="a. Login with Google" onPress={login} result={results.login} />
        <PocButton title="Get test SOL (devnet airdrop)" onPress={getTestSol} result={results.airdrop} />
        <PocButton title="b. Send memo (devnet)" onPress={sendMemo} result={results.memo} />
        <PocButton title="d. Create USDC ATA (user pays)" onPress={createUsdcAta} result={results.ata} />
        <PocButton title="e. Benchmark scrypt" onPress={benchmarkScrypt} result={results.scrypt} />

        {user ? (
          <Pressable style={[styles.button, styles.secondary]} onPress={() => auth.logout()}>
            <Text style={styles.buttonText}>Log out</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
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
