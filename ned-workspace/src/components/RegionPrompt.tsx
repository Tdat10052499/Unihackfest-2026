// "Where do you live?" (OnbResidence board, same words as the phone): asked once per wallet on this computer, and
// again from "Change" in the wallet panel. Vietnam → amounts in VND, no client actions (D18); outside → USDC.
import { useEffect, useRef, useState } from 'react';
import { m } from 'motion/react';
import type { Region } from '@ned/core/milestone/view.ts';
import { useAuth } from '../auth/AuthProvider.tsx';
import { useRegion } from '../hooks/region.ts';
import { Icon } from './icons.tsx';
import { DURATION, EASE, EASE_OUT } from '../motion.ts';
import styles from './RegionPrompt.module.css';

const OPTIONS: { id: Region; title: string; body: string }[] = [
  {
    id: 'vn',
    title: 'I live in Vietnam',
    body: "You'll see amounts in VND and receive earnings in your bank account through a payout partner. No crypto balance is shown.",
  },
  { id: 'intl', title: 'I live outside Vietnam', body: "You'll see USDC and receive earnings in your N.E.D wallet." },
];

export function RegionPrompt() {
  const { status, walletAddress } = useAuth();
  const { region, chosen, prompt, setRegion } = useRegion(walletAddress);
  const [selected, setSelected] = useState<Region>(region);
  const first = useRef<HTMLButtonElement>(null);
  const show = status === 'ready' && prompt;

  useEffect(() => {
    if (!show) return;
    setSelected(region);
    first.current?.focus();
  }, [show, region]);

  if (!show) return null;
  return (
    <div className={styles.layer}>
      <m.div className={styles.backdrop} aria-hidden initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: DURATION.backdrop, ease: EASE } }} />
      <m.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="region-title"
        className={styles.card}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0, transition: { duration: DURATION.stateChange, ease: EASE_OUT } }}
        onKeyDown={(e) => {
          // Escape keeps the current view only when one was already chosen
          if (e.key === 'Escape' && chosen) setRegion(region);
        }}
      >
        <h2 id="region-title" className={styles.title}>
          Where do you live?
        </h2>
        <p className={styles.lead}>This decides how amounts are shown and where your earnings can go.</p>
        <div role="radiogroup" aria-label="Where you live" className={styles.options}>
          {OPTIONS.map((o, i) => (
            <button
              key={o.id}
              ref={i === 0 ? first : undefined}
              type="button"
              role="radio"
              aria-checked={selected === o.id}
              className={`${styles.option} ${selected === o.id ? styles.optionOn : ''}`}
              onClick={() => setSelected(o.id)}
            >
              <span className={styles.badge} aria-hidden>
                {o.id === 'vn' ? 'VN' : <Icon name="globe" size={16} color="var(--ink)" />}
              </span>
              <span className={styles.optionText}>
                <span className={styles.optionTitle}>{o.title}</span>
                <span className={styles.optionBody}>{o.body}</span>
              </span>
            </button>
          ))}
        </div>
        <button type="button" className={styles.confirm} onClick={() => setRegion(selected)}>
          Continue
        </button>
        <p className={styles.later}>You can change this in the wallet panel.</p>
      </m.div>
    </div>
  );
}
