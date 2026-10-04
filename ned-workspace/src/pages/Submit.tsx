// /contract/:fund/submit?i=<milestone> (WebSubmit board, workspace-plan W4): links with the fixed-version hint, files
// fingerprinted on this computer (crypto.subtle, nothing uploaded), a note, the brief's "Done when" as a local
// self-check, the live delivery fingerprint and the deadline from chain time. Submit → wallet panel confirm →
// core runSubmit (evidence on-chain, delivery encrypted with the contract key) → done.
import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { AnimatePresence, m } from 'motion/react';
import { describeActionError, runSubmit } from '@ned/core/actions.ts';
import { USD_VND_RATE_DATE } from '@ned/core/constants.ts';
import { deliveryEvidence, LIMITS, validateDelivery, type DeliveryDraft } from '@ned/core/milestone/content.ts';
import { shortHash } from '@ned/core/milestone/evidence.ts';
import { formatCountdown, formatDeadline, formatUsdc, usdcFromUnits, vndFromUnits } from '@ned/core/milestone/format.ts';
import { isFixedVersion, linkLabel, looksUnversioned } from '@ned/core/milestone/links.ts';
import { txExplorerUrl } from '@ned/core/milestone/records.ts';
import { canSubmit } from '@ned/core/milestone/rules.ts';
import { PublicKey } from '@solana/web3.js';
import { partyName } from '../components/ContractsTable.tsx';
import { FileDrop } from '../components/FileDrop.tsx';
import { Icon } from '../components/icons.tsx';
import { KeyMissing } from '../components/KeyMissing.tsx';
import { useWalletPanel } from '../components/WalletPanelContext.tsx';
import { useActionEnv } from '../hooks/actions.ts';
import { useMilestonePage } from '../hooks/useMilestonePage.ts';
import { chainNowSeconds } from '../hooks/useChainTime.ts';
import { fileProblem, formatSize, hashFile, PROGRESS_FROM_BYTES, shortSha, type FileFingerprint } from '../lib/delivery.ts';
import { rise, stateChange, staggerParent } from '../motion.ts';
import flow from './Flow.module.css';
import styles from './Milestone.module.css';

const row = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: stateChange },
  exit: { opacity: 0, scale: 0.98, transition: { ...stateChange, duration: 0.22 } },
};
const rateDay = new Date(`${USD_VND_RATE_DATE}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const isUrl = (s: string) => /^https?:\/\/\S+$/i.test(s);

interface Reading {
  name: string;
  size: number;
  share: number;
}

export function Submit() {
  const page = useMilestonePage();
  const [done, setDone] = useState<{ signature: string; evidence: string; at: number } | null>(null);
  const { fund, ms, msRaw, raw, wallet, now } = page;

  if (page.missing) return <Message title="Contract not found" text="This contract does not exist on devnet, or it was closed." />;
  // Wait for the key and notes too, so the key and integrity blocks never flash and shift the page
  if (!fund || !ms || !msRaw || !raw || !wallet || !page.content.ready) {
    return (
      <main id="main" className={flow.page} aria-busy="true">
        <p className={flow.caption}>{page.error ? 'Could not read this contract. We try again every few seconds.' : 'Reading the contract from the chain…'}</p>
      </main>
    );
  }
  if (done) return <Done page={page} done={done} />;
  if (!canSubmit(raw, new PublicKey(wallet), page.index, now)) {
    const why =
      fund.role !== 'freelancer'
        ? 'Only the freelancer of this contract can submit work.'
        : msRaw.status !== 'Pending'
          ? `Milestone ${page.index + 1} is ${ms.statusLabel.toLowerCase()}.`
          : raw.state !== 'Funded'
            ? 'The client has not locked the money yet. You can submit once it is locked.'
            : 'The submission deadline of this milestone has passed.';
    return <Message title={`Submit milestone ${page.index + 1}`} text={why} back={`/contract/${fund.address}`} />;
  }
  return <Form page={page} onDone={setDone} />;
}

function Message({ title, text, back = '/' }: { title: string; text: string; back?: string }) {
  return (
    <main id="main" className={flow.page}>
      <div className={flow.notice}>
        <h1 className={flow.noticeTitle}>{title}</h1>
        <p className={flow.noticeText}>{text}</p>
        <div className={flow.actions}>
          <Link to={back} className={flow.ghost}>
            {back === '/' ? 'Back to Workspace' : 'Back to the contract'}
          </Link>
        </div>
      </div>
    </main>
  );
}

type Page = ReturnType<typeof useMilestonePage>;

function Crumb({ page }: { page: Page }) {
  return (
    <nav aria-label="Breadcrumb" className={flow.crumb}>
      <Link to="/">Workspace</Link> <span aria-hidden>/</span> <Link to={`/contract/${page.address}`}>{page.fund?.title}</Link> <span aria-hidden>/</span> Milestone{' '}
      {page.index + 1}
    </nav>
  );
}

/** "≈ 260,000 VND" + "$10.00 · estimate · rate of 2 Oct" in the Vietnam view, else USDC */
function money(units: bigint, vn: boolean) {
  return vn
    ? { big: `≈ ${vndFromUnits(units).toLocaleString('en-US')}`, unit: ' VND', sub: `$${usdcFromUnits(units)} · estimate · rate of ${rateDay}` }
    : { big: usdcFromUnits(units), unit: ' USDC', sub: 'devnet test money' };
}

function Form({ page, onDone }: { page: Page; onDone(d: { signature: string; evidence: string; at: number }): void }) {
  const { now, vn, content, index } = page;
  const fund = page.fund!;
  const ms = page.ms!;
  const msRaw = page.msRaw!;
  const { confirm } = useWalletPanel();
  const { env, status } = useActionEnv();
  const [links, setLinks] = useState<string[]>([]);
  const [linkDraft, setLinkDraft] = useState('');
  const [linkError, setLinkError] = useState('');
  const [files, setFiles] = useState<FileFingerprint[]>([]);
  const [reading, setReading] = useState<Reading[]>([]);
  const [fileError, setFileError] = useState('');
  const [note, setNote] = useState('');
  const [ticks, setTicks] = useState<Record<number, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const other = partyName(fund);
  const criteria = ms.criteria ?? [];
  const delivery: DeliveryDraft = useMemo(() => ({ links, files, note }), [links, files, note]);
  const problems = validateDelivery(delivery);
  const empty = !links.length && !files.length;
  const fingerprint = empty ? '—' : shortHash(deliveryEvidence(delivery));
  const left = msRaw.submitBy - now;
  const pay = money(msRaw.amount, vn);
  const ticked = criteria.filter((_, i) => ticks[i]).length;
  const noKey = !content.hasKey;

  const addLink = (e: FormEvent) => {
    e.preventDefault();
    const url = linkDraft.trim();
    if (!url) return;
    if (!isUrl(url) || url.length > LIMITS.urlChars) return setLinkError('A link must start with https://.');
    if (links.length >= LIMITS.links) return setLinkError(`Add up to ${LIMITS.links} links.`);
    if (links.includes(url)) return setLinkError('This link is already in the list.');
    setLinks([...links, url]);
    setLinkDraft('');
    setLinkError('');
  };

  const addFiles = async (picked: File[]) => {
    setFileError('');
    let list = files;
    for (const file of picked) {
      const problem = fileProblem(file, list);
      if (problem) {
        setFileError(problem);
        continue;
      }
      const big = file.size > PROGRESS_FROM_BYTES;
      if (big) setReading((r) => [...r, { name: file.name, size: file.size, share: 0 }]);
      try {
        const sha256 = await hashFile(file, big ? (share) => setReading((r) => r.map((x) => (x.name === file.name ? { ...x, share } : x))) : undefined);
        if (list.some((f) => f.sha256 === sha256)) {
          setFileError(`${file.name} is already in the list.`);
        } else {
          list = [...list, { name: file.name, size: file.size, sha256 }];
          setFiles(list);
        }
      } catch {
        setFileError(`Could not read ${file.name}.`);
      } finally {
        if (big) setReading((r) => r.filter((x) => x.name !== file.name));
      }
    }
  };

  const submit = async () => {
    setError('');
    if (problems.length) return setError(problems[0].message);
    if (noKey) return setError('This computer cannot open the contract yet. Open N.E.D on a device you used for this contract before, or paste the contract link.');
    const ok = await confirm({
      title: `Submit milestone ${index + 1}`,
      rows: [
        { label: 'Contract', value: fund.title },
        { label: 'For', value: other },
        { label: 'Amount', value: `${pay.big}${pay.unit}`, sub: pay.sub },
        { label: 'Delivery', value: `${links.length} ${links.length === 1 ? 'link' : 'links'} · ${files.length} ${files.length === 1 ? 'file' : 'files'}` },
        { label: 'Delivery fingerprint', value: fingerprint, sub: 'Saved on-chain with the chain clock', mono: true },
        { label: 'Network fee', value: '~0.000005 SOL per transaction', sub: 'devnet test SOL' },
        { label: 'N.E.D fee', value: 'None during the pilot' },
      ],
      note: { tone: 'warning', text: `You cannot edit a delivery after submitting. ${other} reads it with the contract key; only the fingerprint is public.` },
      confirmLabel: 'Submit',
    });
    if (!ok) return;
    setBusy(true);
    try {
      const result = await runSubmit(env, page.address, index, delivery);
      const at = await chainNowSeconds();
      await page.refresh();
      onDone({ signature: result.signature, evidence: result.evidence, at });
    } catch (err) {
      setError(describeActionError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <m.main id="main" className={flow.page} {...row}>
      <Crumb page={page} />
      <div className={flow.head}>
        <div>
          <h1 className={flow.h1}>Submit milestone {index + 1}</h1>
          <div className={styles.sub}>
            {fund.title}
            {ms.name ? ` · ${ms.name}` : ''} · for {other}
          </div>
        </div>
        <span role="timer" className={`${styles.timer} ${left < 86_400 ? styles.timerWarn : styles.timerInfo}`}>
          <Icon name="lock" size={14} />
          Submit by {formatDeadline(msRaw.submitBy)} · <strong>{formatCountdown(left)}</strong> left
        </span>
      </div>

      <div className={flow.grid}>
        <m.div className={flow.main} variants={staggerParent} initial="hidden" animate="shown">
          {noKey ? (
            <m.div variants={rise} custom={0}>
              <KeyMissing
                content={content}
                text="Open N.E.D on a device you used for this contract before (your phone, for example), and this computer unlocks by itself. Or paste the contract link."
              />
            </m.div>
          ) : null}
          <m.section variants={rise} custom={0} aria-labelledby="sb-links" className={flow.card}>
            <div>
              <h2 id="sb-links" className={flow.h2}>
                Links to your work
              </h2>
              <p className={flow.hint}>Use links that point at one fixed version (a Figma version, a Git commit, a shared file), so what {other} opens is what you delivered.</p>
            </div>
            <ul className={flow.list}>
              <AnimatePresence initial={false}>
                {links.map((url) => (
                  <m.li key={url} layout="position" className={flow.item} {...row}>
                    <Icon name="external" size={14} color="var(--caption)" />
                    <span className={styles.linkText}>
                      <span className={styles.linkLabel}>{linkLabel(url)}</span>
                      <span className={styles.linkUrl}>{url}</span>
                    </span>
                    {isFixedVersion(url) ? <span className={styles.fixed}>Fixed version</span> : null}
                    <button type="button" className={flow.remove} aria-label={`Remove ${linkLabel(url)}`} onClick={() => setLinks(links.filter((l) => l !== url))}>
                      <Icon name="close" size={14} color="var(--caption)" />
                    </button>
                  </m.li>
                ))}
              </AnimatePresence>
            </ul>
            <form className={flow.addRow} onSubmit={addLink}>
              <label htmlFor="sb-link" className="visually-hidden">
                Add a link
              </label>
              <input id="sb-link" type="url" className={flow.inputSmall} value={linkDraft} onChange={(e) => setLinkDraft(e.target.value)} placeholder="https://" />
              <button type="submit" className={flow.ghostBtn}>
                Add
              </button>
            </form>
            {linkError ? (
              <p className={flow.error} role="alert">
                {linkError}
              </p>
            ) : links.some(looksUnversioned) || looksUnversioned(linkDraft) ? (
              <p className={styles.warnHint}>Use a fixed version: a Figma link with version-id, or a Git commit / tree/&lt;sha&gt; / blob/&lt;sha&gt;.</p>
            ) : null}
          </m.section>

          <m.section variants={rise} custom={1} aria-labelledby="sb-files" className={flow.card}>
            <div>
              <h2 id="sb-files" className={flow.h2}>
                Files
              </h2>
              <p className={flow.hint}>
                Files stay on your computer. We read each one here and keep only its fingerprint, so {other} can check the file you share is the same one. Up to 200 MB
                each.
              </p>
            </div>
            <FileDrop label="Drop files here or choose files" onFiles={(f) => void addFiles(f)} />
            <ul className={flow.list} aria-live="polite">
              {reading.map((r) => (
                <li key={`reading-${r.name}`} className={flow.item} style={{ display: 'block' }}>
                  <span className={styles.linkLabel}>
                    Reading {r.name} · {formatSize(r.size)} · {Math.round(r.share * 100)}%
                  </span>
                  <div className={styles.progress} role="progressbar" aria-label={`Reading ${r.name}`} aria-valuenow={Math.round(r.share * 100)} aria-valuemin={0} aria-valuemax={100}>
                    <div className={styles.progressBar} style={{ transform: `scaleX(${r.share})` }} />
                  </div>
                </li>
              ))}
              <AnimatePresence initial={false}>
                {files.map((f) => (
                  <m.li key={f.sha256} layout="position" className={flow.item} {...row}>
                    <Icon name="contracts" size={14} color="var(--caption)" />
                    <span className={styles.linkText}>
                      <span className={styles.linkLabel}>{f.name}</span>
                      <span className={flow.caption} style={{ fontSize: 12 }}>
                        {formatSize(f.size)} · fingerprint <span className={flow.mono} style={{ fontSize: 12, fontWeight: 400 }}>{shortSha(f.sha256)}</span>
                      </span>
                    </span>
                    <button type="button" className={flow.remove} aria-label={`Remove ${f.name}`} onClick={() => setFiles(files.filter((x) => x.sha256 !== f.sha256))}>
                      <Icon name="close" size={14} color="var(--caption)" />
                    </button>
                  </m.li>
                ))}
              </AnimatePresence>
            </ul>
            {fileError ? (
              <p className={flow.error} role="alert">
                {fileError}
              </p>
            ) : null}
          </m.section>

          <m.section variants={rise} custom={2} aria-labelledby="sb-note-h" className={flow.card}>
            <div className={flow.labelRow}>
              <h2 id="sb-note-h" className={flow.h2}>
                <label htmlFor="sb-note">Note to {other}</label>
              </h2>
              <span className={styles.counter}>
                {[...note].length}/{LIMITS.noteChars}
              </span>
            </div>
            <textarea
              id="sb-note"
              className={flow.textarea}
              rows={3}
              value={note}
              maxLength={LIMITS.noteChars}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What is in this delivery and where to look first."
            />
          </m.section>

          {criteria.length ? (
            <m.section variants={rise} custom={3} aria-labelledby="sb-check" className={flow.card}>
              <div>
                <div className={flow.labelRow}>
                  <h2 id="sb-check" className={flow.h2}>
                    Check against the brief
                  </h2>
                  <span className={ticked === criteria.length ? styles.countOk : styles.countWarn}>
                    {ticked} of {criteria.length} ticked
                  </span>
                </div>
                <p className={flow.hint}>What {other} wrote under “Done when”. Only for you: ticks are not saved on-chain.</p>
              </div>
              {criteria.map((c, i) => (
                <label key={c} className={styles.check}>
                  <input type="checkbox" checked={Boolean(ticks[i])} onChange={() => setTicks({ ...ticks, [i]: !ticks[i] })} />
                  <span>{c}</span>
                </label>
              ))}
            </m.section>
          ) : null}
        </m.div>

        <m.aside aria-label="Before you submit" className={flow.aside} variants={staggerParent} initial="hidden" animate="shown">
          <m.div variants={rise} custom={1} className={flow.card} style={{ gap: 0 }}>
            <div className={flow.caption}>Comes to you after release</div>
            <div className={styles.amountBig}>
              {pay.big}
              <span className={styles.amountUnit}>{pay.unit}</span>
            </div>
            <div className={flow.caption}>
              {pay.sub}
              {fund.destination ? ` · ${fund.destination.kind === 'payoutPartner' ? 'to your bank via the payout partner' : 'to your N.E.D wallet'}` : ''}
            </div>
          </m.div>
          {content.content?.brief ? (
            <m.div variants={rise} custom={2} className={flow.card} style={{ gap: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>What {other} asked for</div>
              <p className={styles.briefScope}>{content.content.brief.scope}</p>
              <div className={styles.briefRow}>
                <span className={flow.caption} style={{ fontSize: 12 }}>
                  Brief fingerprint
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span className={flow.mono} style={{ fontSize: 12 }}>
                    {fund.briefHash}
                  </span>
                  <span className={styles.okChip}>You accepted</span>
                </span>
              </div>
              <Link to={`/contract/${fund.address}`} className={styles.smallLink}>
                Read the full brief
              </Link>
            </m.div>
          ) : null}
          <m.div variants={rise} custom={3} className={flow.fp}>
            <div className={flow.fpRow}>
              <span className={flow.fpLabel}>Delivery fingerprint</span>
              <span className={flow.mono} aria-live="polite">
                {fingerprint}
              </span>
            </div>
            <p className={flow.fpText}>
              Made from your links, file fingerprints and note. Only this goes on-chain; the delivery itself is encrypted with the contract key, so only you and {other} can
              read it.
            </p>
          </m.div>
          <m.div variants={rise} custom={4} className={flow.rules}>
            <div className={flow.rulesTitle}>How on-time is decided</div>
            The program accepts a submit only up to {formatDeadline(msRaw.submitBy)} and records the time from the chain clock, not from your computer. After that, the
            milestone can be refunded to {other}.
          </m.div>
          {criteria.length && ticked < criteria.length ? (
            <div role="status" className={styles.status}>
              Some “Done when” items are not ticked. You can still submit; {other} checks the same list before releasing.
            </div>
          ) : null}
          <div className={flow.createBox}>
            <button type="button" className={flow.create} onClick={() => void submit()} disabled={busy} aria-disabled={empty || noKey}>
              {busy ? status || 'Submitting…' : `Submit milestone ${index + 1}`}
            </button>
            <p className={error ? flow.error : flow.createHint} aria-live="polite">
              {error || 'Opens your wallet to confirm. You cannot edit a delivery after submitting.'}
            </p>
          </div>
        </m.aside>
      </div>
    </m.main>
  );
}

function Done({ page, done }: { page: Page; done: { signature: string; evidence: string; at: number } }) {
  const { fund, ms, msRaw, vn, index } = page;
  if (!fund || !msRaw || !ms) return null;
  const at = msRaw.submittedAt || done.at;
  const pay = money(msRaw.amount, vn);
  const other = partyName(fund);
  const partner = fund.destination?.kind === 'payoutPartner';
  return (
    <m.main id="main" className={flow.page} {...row}>
      <Crumb page={page} />
      <div className={flow.created}>
        <div className={flow.createdMain}>
          <div className={`${flow.okDot} ${styles.okDotWarn}`} aria-hidden>
            <Icon name="review" size={26} color="var(--warning-ink)" width={2.4} />
          </div>
          <h1 className={flow.createdTitle}>Submitted · in review</h1>
          <p className={flow.noticeText}>
            {other} sees your delivery in the Workspace and on the phone. If nothing happens by {formatDeadline(msRaw.reviewBy)}, it is released{' '}
            {partner ? 'to your bank in VND' : 'to your N.E.D wallet'}.
          </p>
          <div className={styles.rowsBox}>
            <div className={styles.doneRow}>
              <span>Recorded at</span>
              <span className={styles.doneValue}>{formatDeadline(at)} · chain clock</span>
            </div>
            <div className={styles.doneRow}>
              <span>Deadline</span>
              <span className={styles.doneValue}>
                {formatDeadline(msRaw.submitBy)} <span className={at <= msRaw.submitBy ? styles.onTime : styles.late}>{at <= msRaw.submitBy ? 'On time' : 'Late'}</span>
              </span>
            </div>
            <div className={styles.doneRow}>
              <span>Delivery fingerprint</span>
              <span className={`${styles.doneValue} ${flow.mono}`}>{done.evidence}</span>
            </div>
            <div className={styles.doneRow}>
              <span>Comes to you</span>
              <span className={styles.doneValue} style={{ display: 'block' }}>
                {vn ? `${pay.big}${pay.unit}` : formatUsdc(msRaw.amount)}
                <span className={styles.doneSub}>{pay.sub}</span>
              </span>
            </div>
          </div>
          <div className={flow.actions}>
            <a href={txExplorerUrl(done.signature)} target="_blank" rel="noopener noreferrer" className={flow.ghost}>
              View on Explorer
            </a>
            <Link to={`/contract/${fund.address}`} className={flow.plainLink}>
              Back to the contract
            </Link>
          </div>
          <p className={flow.caption} style={{ marginTop: 12 }}>
            Milestone {index + 1} · {ms.statusLabel}
          </p>
        </div>
      </div>
    </m.main>
  );
}
