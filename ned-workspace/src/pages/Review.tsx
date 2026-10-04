// /contract/:fund/review?i=<milestone> (WebReview board, workspace-plan W4): the delivery (note, links, files with
// fingerprints), "On time" from submitted_at vs submit_by, the integrity block, "Drop a file to compare" (hashed
// here, nothing uploaded), local "Done when" ticks, timeline and auto-release countdown. Release → wallet panel
// confirm → core approve → released. Dispute is P1 and off in the Workspace (no button).
import { useState } from 'react';
import { Link } from 'react-router';
import { m } from 'motion/react';
import { PublicKey } from '@solana/web3.js';
import { describeActionError, runFundAction } from '@ned/core/actions.ts';
import { deliveryEvidence } from '@ned/core/milestone/content.ts';
import { shortHash } from '@ned/core/milestone/evidence.ts';
import { formatCountdown, formatDeadline, formatUsdc } from '@ned/core/milestone/format.ts';
import { linkLabel } from '@ned/core/milestone/links.ts';
import { txExplorerUrl } from '@ned/core/milestone/records.ts';
import { canApprove } from '@ned/core/milestone/rules.ts';
import { Avatar } from '../components/Avatar.tsx';
import { partyName } from '../components/ContractsTable.tsx';
import { FileDrop } from '../components/FileDrop.tsx';
import { Icon } from '../components/icons.tsx';
import { KeyMissing } from '../components/KeyMissing.tsx';
import { useWalletPanel } from '../components/WalletPanelContext.tsx';
import { useActionEnv } from '../hooks/actions.ts';
import { useMilestonePage } from '../hooks/useMilestonePage.ts';
import { checkFile, formatSize, hashFile, MAX_FILE_BYTES, shortSha, type FileCheck } from '../lib/delivery.ts';
import { rise, stateChange, staggerParent } from '../motion.ts';
import flow from './Flow.module.css';
import styles from './Milestone.module.css';

const row = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: stateChange },
  exit: { opacity: 0, scale: 0.98, transition: { ...stateChange, duration: 0.22 } },
};

type Page = ReturnType<typeof useMilestonePage>;
type Released = { signature: string };

export function Review() {
  const page = useMilestonePage();
  const [released, setReleased] = useState<Released | null>(null);
  const { fund, ms, msRaw, raw, wallet, vn } = page;

  if (page.missing) return <Message title="Contract not found" text="This contract does not exist on devnet, or it was closed." />;
  // Wait for the key and notes too, so the key and integrity blocks never flash and shift the page
  if (!fund || !ms || !msRaw || !raw || !wallet || !page.content.ready) {
    return (
      <main id="main" className={flow.page} aria-busy="true">
        <p className={flow.caption}>{page.error ? 'Could not read this contract. We try again every few seconds.' : 'Reading the contract from the chain…'}</p>
      </main>
    );
  }
  if (released) return <Done page={page} released={released} />;
  const back = `/contract/${fund.address}`;
  if (fund.role !== 'client') return <Message title={`Review milestone ${page.index + 1}`} text="Only the client of this contract reviews its deliveries." back={back} />;
  // D18: the Vietnam view has no client actions
  if (vn) return <Message title={`Review milestone ${page.index + 1}`} text="Reviewing and releasing are client actions, which the Vietnam view does not offer. Switch the money view in the N.E.D app if you live outside Vietnam." back={back} />;
  if (!canApprove(raw, new PublicKey(wallet), page.index)) {
    return <Message title={`Review milestone ${page.index + 1}`} text={`Milestone ${page.index + 1} is ${ms.statusLabel.toLowerCase()}. There is nothing to review.`} back={back} />;
  }
  return <Form page={page} onReleased={setReleased} />;
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

function Crumb({ page }: { page: Page }) {
  return (
    <nav aria-label="Breadcrumb" className={flow.crumb}>
      <Link to="/">Workspace</Link> <span aria-hidden>/</span> <Link to={`/contract/${page.address}`}>{page.fund?.title}</Link> <span aria-hidden>/</span> Milestone{' '}
      {page.index + 1}
    </nav>
  );
}

function Form({ page, onReleased }: { page: Page; onReleased(r: Released): void }) {
  const { now, content, index, raw } = page;
  const fund = page.fund!;
  const ms = page.ms!;
  const msRaw = page.msRaw!;
  const { confirm } = useWalletPanel();
  const { env, status } = useActionEnv();
  const [ticks, setTicks] = useState<Record<number, boolean>>({});
  const [checks, setChecks] = useState<Record<number, FileCheck['kind']>>({});
  const [dropNote, setDropNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const other = partyName(fund);
  const delivery = ms.delivery?.content;
  const matches = Boolean(ms.delivery?.matches);
  const noKey = !content.hasKey;
  const criteria = ms.criteria ?? [];
  const ticked = criteria.filter((_, i) => ticks[i]).length;
  const submittedAt = msRaw.submittedAt;
  const onTime = submittedAt > 0 && submittedAt <= msRaw.submitBy;
  const left = msRaw.reviewBy - now;
  const window = Math.max(1, msRaw.reviewBy - submittedAt);
  const partner = fund.destination?.kind === 'payoutPartner';
  const amount = formatUsdc(msRaw.amount);

  const compare = async (files: File[]) => {
    setDropNote('');
    const listed = delivery?.files ?? [];
    for (const file of files) {
      if (file.size > MAX_FILE_BYTES) {
        setDropNote(`${file.name} is larger than 200 MB, so it cannot be one of the listed files.`);
        continue;
      }
      const sha256 = await hashFile(file);
      const result = checkFile({ name: file.name, sha256 }, listed);
      if (result.kind === 'unknown') setDropNote(`${file.name} (${shortSha(sha256)}) is not one of the files ${other} listed.`);
      else setChecks((c) => ({ ...c, [result.index]: result.kind }));
    }
  };

  const release = async () => {
    setError('');
    const ok = await confirm({
      title: `Release ${amount}`,
      rows: [
        { label: 'Contract', value: fund.title },
        { label: 'Milestone', value: `${index + 1}${ms.name ? ` · ${ms.name}` : ''}` },
        { label: 'To', value: other, sub: partner ? 'Through the payout partner, paid out in VND (simulated)' : 'Their N.E.D wallet' },
        { label: 'Amount', value: amount, mono: true },
        { label: 'Delivery', value: matches ? 'Same delivery that was submitted ✓' : 'Not checked', sub: `Fingerprint ${ms.evidence ?? '—'}` },
        { label: 'Network fee', value: '~0.000005 SOL', sub: 'devnet test SOL' },
        { label: 'N.E.D fee', value: 'None during the pilot' },
      ],
      note: { tone: 'info', text: `This cannot be undone. The money leaves the contract vault for ${other} as soon as you confirm.` },
      confirmLabel: 'Release',
    });
    if (!ok) return;
    setBusy(true);
    try {
      const result = await runFundAction(env, page.address, 'approve', index);
      await page.refresh();
      onReleased({ signature: result.signature });
    } catch (err) {
      setError(describeActionError(err));
    } finally {
      setBusy(false);
    }
  };

  const timeline: { title: string; when: string; dot: string }[] = [
    { title: 'Contract created · brief saved', when: raw ? formatDeadline(raw.createdAt) : '', dot: 'var(--accent)' },
    { title: `${other} accepted${partner ? ' · VND payout' : ' · own wallet'}`, when: 'before the lock', dot: 'var(--accent)' },
    { title: `You locked ${fund.totalLabel}`, when: 'money in the program vault', dot: 'var(--accent)' },
    { title: `Milestone ${index + 1} submitted`, when: `${formatDeadline(submittedAt)} · ${onTime ? 'on time' : 'late'}`, dot: 'var(--info-dot)' },
    { title: 'Review deadline', when: `${formatDeadline(msRaw.reviewBy)} · then anyone can release`, dot: '#c9c9d2' },
  ];

  return (
    <m.main id="main" className={flow.page} {...row}>
      <Crumb page={page} />
      <div className={flow.head}>
        <div>
          <h1 className={flow.h1}>Review milestone {index + 1}</h1>
          <div className={styles.sub}>
            {fund.title}
            {ms.name ? ` · ${ms.name}` : ''} · by {other}
          </div>
        </div>
        <span role="timer" className={`${styles.timer} ${left < window * 0.1 ? styles.timerWarn : styles.timerInfo}`}>
          <Icon name="release" size={14} />
          {left > 0 ? (
            <>
              Auto-release in <strong>{formatCountdown(left)}</strong> unless you release it sooner
            </>
          ) : (
            'Review time is over · anyone can release'
          )}
        </span>
      </div>

      <div className={flow.grid}>
        <m.div className={flow.main} variants={staggerParent} initial="hidden" animate="shown">
          {noKey ? (
            <m.div variants={rise} custom={0}>
              <KeyMissing content={content} text="Open N.E.D on a device you used for this contract before, and this computer unlocks by itself. Or paste the contract link." />
            </m.div>
          ) : null}
          <m.section variants={rise} custom={0} aria-labelledby="rv-del" className={flow.card} style={{ gap: 0 }}>
            <div className={styles.from}>
              <Avatar seed={fund.counterparty.wallet} size={40} decorative />
              <div className={styles.fromText}>
                <h2 id="rv-del" className={flow.h2}>
                  Delivery from {other}
                </h2>
                <div className={flow.caption}>Submitted {formatDeadline(submittedAt)} · recorded by the chain clock</div>
              </div>
              <span className={onTime ? styles.onTime : styles.late}>
                <Icon name={onTime ? 'check' : 'lock'} size={12} width={2.6} />
                {onTime ? 'On time' : 'Late'} · deadline {formatDeadline(msRaw.submitBy)}
              </span>
            </div>
            {delivery ? (
              <>
                {delivery.note ? <blockquote className={styles.quote}>{delivery.note}</blockquote> : null}
                {delivery.links.length ? (
                  <>
                    <div className={styles.sectionLabel}>Links</div>
                    <ul className={flow.list}>
                      {delivery.links.map((url) => (
                        <li key={url}>
                          <a href={url} target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                            <Icon name="external" size={14} color="var(--caption)" />
                            <span className={styles.linkText}>
                              <span className={styles.linkLabel}>{linkLabel(url)}</span>
                              <span className={styles.linkUrl}>{url.replace(/^https?:\/\/(www\.)?/, '')}</span>
                            </span>
                            <Icon name="chevronRight" size={14} color="var(--caption)" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
                {delivery.files.length ? (
                  <>
                    <div className={styles.sectionLabel}>Files listed by {other}</div>
                    <ul className={flow.list}>
                      {delivery.files.map((f, i) => {
                        const c = checks[i];
                        return (
                          <li key={`${f.sha256}-${i}`} className={flow.item} style={{ padding: '10px 12px' }}>
                            <Icon name="contracts" size={14} color="var(--caption)" />
                            <span className={styles.linkText}>
                              <span className={styles.linkLabel}>{f.name}</span>
                              <span className={flow.caption} style={{ fontSize: 12 }}>
                                {formatSize(f.size)} · fingerprint <span className={flow.mono} style={{ fontSize: 12, fontWeight: 400 }}>{shortSha(f.sha256)}</span>
                              </span>
                            </span>
                            <span aria-live="polite" className={`${styles.fileChip} ${c === 'same' ? styles.chipSame : c === 'different' ? styles.chipDiff : styles.chipIdle}`}>
                              {c === 'same' ? 'Same file ✓' : c === 'different' ? 'Different file' : 'Not checked'}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                    <FileDrop compact label={`Drop a file ${other} shared to check it is the same`} onFiles={(f) => void compare(f)} />
                    {dropNote ? (
                      <p className={flow.hint} role="status">
                        {dropNote}
                      </p>
                    ) : null}
                  </>
                ) : null}
              </>
            ) : (
              <p className={flow.hint} style={{ marginTop: 12 }}>
                {noKey ? 'Open N.E.D on a device you used for this contract before to unlock it here, or paste the contract link above.' : 'The delivery saved with this contract could not be read.'}
              </p>
            )}
          </m.section>

          <m.section
            variants={rise}
            custom={1}
            aria-labelledby="rv-int"
            className={`${styles.integrity} ${noKey ? styles.intIdle : matches ? styles.intOk : styles.intBad}`}
          >
            <h2 id="rv-int" className={styles.intTitle}>
              <Icon name={noKey ? 'lock' : matches ? 'check' : 'close'} size={18} width={2.6} />
              {noKey ? 'Delivery not opened on this computer' : matches ? 'Same delivery that was submitted ✓' : 'Does not match what was submitted'}
            </h2>
            <p className={styles.intBody}>
              {noKey
                ? 'Unlock this computer (open N.E.D on a device you used before, or paste the contract link) to compare the delivery with the fingerprint saved on-chain.'
                : matches
                  ? `The links, file fingerprints and note match the fingerprint saved on-chain on ${formatDeadline(submittedAt)}. This proves the delivery is the one submitted; it cannot prove that what a link points to has not changed since, so prefer fixed-version links.`
                  : `The delivery saved with the contract does not match the fingerprint saved on-chain at submit. Ask ${other} which version is final before you release.`}
            </p>
            <div className={styles.intGrid}>
              <div>
                <div className={styles.muted}>Saved on-chain at submit</div>
                <div className={styles.intHash}>{ms.evidence ?? '—'}</div>
              </div>
              <div>
                <div className={styles.muted}>This delivery now</div>
                <div className={styles.intHash}>{delivery ? shortHash(deliveryEvidence(delivery)) : '—'}</div>
              </div>
            </div>
          </m.section>

          {criteria.length ? (
            <m.section variants={rise} custom={2} aria-labelledby="rv-check" className={flow.card}>
              <div>
                <div className={flow.labelRow}>
                  <h2 id="rv-check" className={flow.h2}>
                    Done when…
                  </h2>
                  <span className={ticked === criteria.length ? styles.countOk : styles.countWarn}>
                    {ticked} of {criteria.length} met
                  </span>
                </div>
                <p className={flow.hint}>From your brief (fingerprint {fund.briefHash}). Ticks help you decide; they are not saved on-chain.</p>
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

        <m.aside aria-label="Decide" className={flow.aside} variants={staggerParent} initial="hidden" animate="shown">
          <m.div variants={rise} custom={1} className={flow.card} style={{ gap: 0 }}>
            <div className={flow.caption}>Release for milestone {index + 1}</div>
            <div className={styles.amountBig}>
              {amount.replace(' USDC', '')}
              <span className={styles.amountUnit}> USDC</span>
            </div>
            <div className={flow.caption}>{partner ? `To the payout partner for ${other} · paid out in VND (simulated)` : `To ${other}’s N.E.D wallet`}</div>
          </m.div>
          <m.div variants={rise} custom={2} className={flow.card} style={{ gap: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Timeline</div>
            <ol className={styles.timeline}>
              {timeline.map((t, i) => (
                <li key={t.title} className={styles.tlItem}>
                  <span className={styles.tlRail} aria-hidden>
                    <span className={styles.tlDot} style={{ background: t.dot }} />
                    {i < timeline.length - 1 ? <span className={styles.tlLine} /> : null}
                  </span>
                  <span className={styles.tlText}>
                    <span className={styles.tlTitle}>{t.title}</span>
                    <span className={styles.tlWhen}>{t.when}</span>
                  </span>
                </li>
              ))}
            </ol>
          </m.div>
          <div className={flow.createBox}>
            <button type="button" className={flow.create} onClick={() => void release()} disabled={busy}>
              {busy ? status || 'Releasing…' : `Release ${amount}`}
            </button>
            {error ? (
              <p className={flow.error} role="alert">
                {error}
              </p>
            ) : null}
          </div>
          <div className={styles.help}>
            <strong>Need changes?</strong> Talk to {other} before {formatDeadline(msRaw.reviewBy)}. After that, anyone can release this milestone.
          </div>
        </m.aside>
      </div>
    </m.main>
  );
}

function Done({ page, released }: { page: Page; released: Released }) {
  const { fund, msRaw, index } = page;
  if (!fund || !msRaw) return null;
  const other = partyName(fund);
  const partner = fund.destination?.kind === 'payoutPartner';
  const next = fund.milestones.find((x) => x.status === 'pending' || x.status === 'submitted');
  return (
    <m.main id="main" className={flow.page} {...row}>
      <Crumb page={page} />
      <div className={flow.created}>
        <div className={flow.createdMain}>
          <div className={flow.okDot} aria-hidden>
            <Icon name="check" size={26} color="var(--success-ink)" width={2.6} />
          </div>
          <h1 className={flow.createdTitle}>Milestone {index + 1} released</h1>
          <p className={flow.noticeText}>
            {formatUsdc(msRaw.amount)} went from the contract to{' '}
            {partner ? `the payout partner for ${other}, who receives VND in a bank account (simulated in the demo).` : `${other}’s N.E.D wallet.`}
          </p>
          <div className={styles.rowsBox}>
            <div className={styles.doneRow}>
              <span>Still locked</span>
              <span className={`${styles.doneValue} ${flow.mono}`}>{fund.lockedLabel}</span>
            </div>
            <div className={styles.doneRow}>
              <span>Next</span>
              <span className={styles.doneValue}>
                {next ? `Milestone ${next.index + 1}${next.name ? ` · ${next.name}` : ''} · ${next.statusLabel}` : 'Every milestone is settled. Close the contract to get the rent back.'}
              </span>
            </div>
          </div>
          <div className={flow.actions}>
            <a href={txExplorerUrl(released.signature)} target="_blank" rel="noopener noreferrer" className={flow.ghost}>
              View on Explorer
            </a>
            <Link to={`/contract/${fund.address}`} className={flow.plainLink}>
              Back to the contract
            </Link>
            <Link to="/" className={flow.plainLink}>
              Back to Workspace
            </Link>
          </div>
        </div>
      </div>
    </m.main>
  );
}
