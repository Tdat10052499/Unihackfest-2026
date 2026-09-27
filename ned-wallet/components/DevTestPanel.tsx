// Panel test tạm (Phase 1) trên Home: số dư USDC/SOL devnet + ký thử + chuyển 1 USDC, dùng thẳng useAuth().
// Tách riêng để không đụng giao diện cũ; gỡ khi Home V4 (Phase 4) xong.
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Keypair, LAMPORTS_PER_SOL, PublicKey, Transaction } from '@solana/web3.js';
import { useAuth } from '../services/auth';
import {
  createAssociatedTokenAccountInstruction,
  createSplTokenTransferInstruction,
  getAssociatedTokenAddress,
  USDC_DEVNET_MINT,
} from '../services/solana';

const USDC_DECIMALS = 6;
const explorerTx = (signature: string) => `https://explorer.solana.com/tx/${signature}?cluster=devnet`;

type Result = { ok: boolean; title: string; lines: string[]; link?: string };

function isValidAddress(value: string): boolean {
  try {
    return PublicKey.isOnCurve(new PublicKey(value).toBytes());
  } catch {
    return false;
  }
}

export function DevTestPanel() {
  const { status, walletAddress, connection, signMessage, signAndSendTransaction } = useAuth();
  const [usdc, setUsdc] = useState<number | null>(null);
  const [sol, setSol] = useState<number | null>(null);
  // Mặc định: một địa chỉ devnet ngẫu nhiên (sửa được) để chỉ cần bấm là chuyển thử
  const [recipient, setRecipient] = useState(() => Keypair.generate().publicKey.toBase58());
  const [busy, setBusy] = useState<'sign' | 'send' | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const refresh = useCallback(async () => {
    if (!walletAddress) return;
    const owner = new PublicKey(walletAddress);
    const ata = getAssociatedTokenAddress(USDC_DEVNET_MINT, owner);
    const [usdcRes, lamports] = await Promise.all([
      connection.getTokenAccountBalance(ata, 'confirmed').catch(() => null),
      connection.getBalance(owner, 'confirmed').catch(() => null),
    ]);
    setUsdc(usdcRes?.value.uiAmount ?? 0);
    setSol(lamports === null ? null : lamports / LAMPORTS_PER_SOL);
  }, [walletAddress, connection]);

  // Tải số dư ngay khi có ví, rồi mỗi 10 giây
  useEffect(() => {
    const first = setTimeout(refresh, 0);
    const timer = setInterval(refresh, 10000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [refresh]);

  const run = async (kind: 'sign' | 'send', fn: () => Promise<Result>) => {
    setBusy(kind);
    setResult(null);
    const t0 = Date.now();
    try {
      const out = await fn();
      setResult({ ...out, lines: [...out.lines, `${Date.now() - t0} ms`] });
    } catch (err) {
      setResult({ ok: false, title: 'FAILED', lines: [err instanceof Error ? err.message : String(err)] });
    } finally {
      setBusy(null);
      refresh();
    }
  };

  const handleSign = () =>
    run('sign', async () => {
      const message = `N.E.D test ${new Date().toISOString()}`;
      const signature = await signMessage(message);
      return { ok: true, title: 'Signed', lines: [`Message: ${message}`, `Signature: ${signature}`] };
    });

  const handleSend = () =>
    run('send', async () => {
      if (!walletAddress) throw new Error('No wallet yet');
      const to = recipient.trim();
      if (!isValidAddress(to)) throw new Error('Recipient is not a valid Solana wallet address');
      if ((usdc ?? 0) < 1) throw new Error('Need at least 1 USDC (devnet) — use the Circle faucet');
      if ((sol ?? 0) < 0.003) throw new Error('Need a little devnet SOL for fees/rent — use faucet.solana.com');

      const owner = new PublicKey(walletAddress);
      const toOwner = new PublicKey(to);
      const fromAta = getAssociatedTokenAddress(USDC_DEVNET_MINT, owner);
      const toAta = getAssociatedTokenAddress(USDC_DEVNET_MINT, toOwner);
      const tx = new Transaction();
      const toAtaExists = Boolean(await connection.getAccountInfo(toAta, 'confirmed'));
      if (!toAtaExists) {
        // Người gửi trả rent tạo ATA USDC cho người nhận
        tx.add(createAssociatedTokenAccountInstruction(owner, toAta, toOwner, USDC_DEVNET_MINT));
      }
      tx.add(createSplTokenTransferInstruction(fromAta, toAta, owner, 1 * 10 ** USDC_DECIMALS));

      const signature = await signAndSendTransaction(tx);
      await connection.confirmTransaction(signature, 'confirmed');
      return {
        ok: true,
        title: 'Sent 1 USDC',
        lines: [`To: ${to}`, toAtaExists ? 'Recipient USDC account existed' : 'Created recipient USDC account', `Signature: ${signature}`],
        link: explorerTx(signature),
      };
    });

  if (status !== 'ready' || !walletAddress) {
    return (
      <View style={styles.panel}>
        <Text style={styles.label}>Dev test · wallet {status}</Text>
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.label}>
        Dev test · {walletAddress.slice(0, 4)}…{walletAddress.slice(-4)}
      </Text>
      <Text style={styles.balance} onPress={refresh}>
        {usdc === null ? '… USDC' : `${usdc.toFixed(2)} USDC`}
        <Text style={styles.small}>{sol === null ? '' : `  ·  ${sol.toFixed(4)} SOL (devnet)`}</Text>
      </Text>

      <View style={styles.row}>
        <TouchableOpacity style={styles.button} onPress={handleSign} disabled={busy !== null}>
          {busy === 'sign' ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Sign test message</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.sendButton]} onPress={handleSend} disabled={busy !== null}>
          {busy === 'send' ? <ActivityIndicator color="#000" /> : <Text style={[styles.buttonText, styles.sendText]}>Send 1 USDC</Text>}
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.input}
        value={recipient}
        onChangeText={setRecipient}
        placeholder="Recipient devnet wallet address"
        autoCapitalize="none"
        autoCorrect={false}
      />

      {result ? (
        <View style={styles.result}>
          <Text style={result.ok ? styles.ok : styles.error}>{result.title}</Text>
          {result.lines.map((line, i) => (
            <Text key={i} style={styles.line} selectable>
              {line}
            </Text>
          ))}
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
  panel: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 12,
    borderStyle: 'dashed',
    backgroundColor: '#FFFBEB',
    gap: 8,
  },
  label: { fontSize: 11, fontWeight: '700', color: '#92400E', textTransform: 'uppercase' },
  balance: { fontSize: 16, fontWeight: '800', color: '#000' },
  small: { fontSize: 12, fontWeight: '600', color: '#555' },
  row: { flexDirection: 'row', gap: 8 },
  button: {
    flex: 1,
    backgroundColor: '#000',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  sendButton: { backgroundColor: '#FACC15', borderWidth: 2, borderColor: '#000' },
  buttonText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  sendText: { color: '#000' },
  input: {
    borderWidth: 1.5,
    borderColor: '#000',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    backgroundColor: '#FFF',
    color: '#000',
  },
  result: { gap: 2 },
  ok: { color: '#15803D', fontWeight: '800' },
  error: { color: '#DC2626', fontWeight: '800' },
  line: { fontSize: 11, color: '#111', fontFamily: 'monospace' },
  link: { color: '#2563EB', textDecorationLine: 'underline', marginTop: 4, fontSize: 12 },
});
