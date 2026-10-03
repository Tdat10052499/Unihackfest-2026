// The contract key is not on this computer: paste the invite link (or #k=…) to read the brief and deliveries.
// The pasted text is never logged or shown again.
import { useState, type FormEvent } from 'react';
import type { ContractContentState } from '../hooks/useContractContent.ts';
import styles from '../pages/Flow.module.css';

export function KeyMissing({ content, text }: { content: ContractContentState; text: string }) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const ok = await content.importKey(input);
    if (ok) setInput('');
    else setError('That is not the link of this contract. Copy it again from the app or from the person who sent it.');
  };
  return (
    <section className={styles.card} aria-labelledby="key-missing">
      <h2 id="key-missing" className={styles.h2}>
        Open the contract link on this computer
      </h2>
      <p className={styles.hint}>{text}</p>
      <form className={styles.addRow} onSubmit={(e) => void submit(e)} aria-label="Paste the contract link">
        <label htmlFor="key-missing-input" className="visually-hidden">
          Contract link
        </label>
        <input
          id="key-missing-input"
          className={styles.inputSmall}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste the contract link"
          autoComplete="off"
          spellCheck={false}
        />
        <button type="submit" className={styles.ghostBtn} disabled={!input.trim()}>
          Open
        </button>
      </form>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
