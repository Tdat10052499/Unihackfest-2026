// /key-check — spike S0 of docs/09-milestone-lock/key-sync-plan.md (temporary, not linked from the UI).
// Signs the fixed key-sync message twice with the embedded wallet and says whether the two signatures are equal
// (Plan A: a repeatable signature can derive the wallet content key on every device). Only SHA-256 fingerprints are
// shown: in Plan A the signature itself is the secret, so it is never displayed, logged or sent anywhere.
import { useState } from 'react';
import { sha256 } from '@noble/hashes/sha2.js';
import { utf8ToBytes } from '@noble/hashes/utils.js';
import { useAuth } from '../auth/AuthProvider.tsx';
import styles from './Flow.module.css';

const MESSAGE = 'N.E.D content key v1 · This signature unlocks your private contract briefs. Sign it only in the N.E.D app.';
const fingerprint = (signature: string) =>
  [...sha256(utf8ToBytes(signature)).slice(0, 6)].map((b) => b.toString(16).padStart(2, '0')).join('');

type Result = { first: string; second: string; ms: number } | { error: string };

export function KeyCheck() {
  const { signMessage, walletAddress } = useAuth();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const run = async () => {
    setBusy(true);
    setResult(null);
    const t0 = performance.now();
    try {
      const a = await signMessage(MESSAGE);
      const b = await signMessage(MESSAGE);
      setResult({ first: fingerprint(a), second: fingerprint(b), ms: Math.round(performance.now() - t0) });
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : 'Signing failed.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main id="main" className={styles.page}>
      <div className={styles.notice}>
        <h1 className={styles.noticeTitle}>Key check (S0)</h1>
        <p className={styles.noticeText}>
          Signs one fixed message twice with your N.E.D wallet ({walletAddress?.slice(0, 4)}…{walletAddress?.slice(-4)}). No transaction, no fee. Only fingerprints of the
          signatures are shown.
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.primaryBtn} onClick={() => void run()} disabled={busy}>
            {busy ? 'Signing…' : 'Run the check'}
          </button>
        </div>
        {result && 'error' in result ? (
          <p className={styles.error} role="alert">
            {result.error}
          </p>
        ) : null}
        {result && !('error' in result) ? (
          <div className={styles.facts} role="status">
            <div className={styles.fact}>
              <div className={styles.caption}>Signature 1 · fingerprint</div>
              <div className={styles.factMono}>{result.first}</div>
            </div>
            <div className={styles.fact}>
              <div className={styles.caption}>Signature 2 · fingerprint</div>
              <div className={styles.factMono}>{result.second}</div>
            </div>
            <div className={styles.fact}>
              <div className={styles.caption}>Result</div>
              <div className={styles.factText}>
                {result.first === result.second ? 'SAME — repeatable (Plan A works)' : 'DIFFERENT — not repeatable (Plan B)'} · {result.ms} ms
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
