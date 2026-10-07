// /contract/:fund/review?i=<milestone> (WebReview board; U1, U2, U4, D27, C4, R2). Two columns from 1024 px, one below:
// left (about 2/3) "What {name} delivered" with the version switcher, one tab per link, the PreviewFrame (loads only after
// "Load preview"), the note and the listed files (fingerprints only, no drop zone); right (about 1/3, sticky) the release
// timer, "What to check" (local ticks), the integrity line and the decision card (Accept & release or Request changes
// only). The freelancer, and anyone after the decision, sees the same page read-only; after release a "Final files"
// block checks dropped files against the committed fingerprints.
import { useState } from 'react';
import { Link } from 'react-router';
import { m } from 'motion/react';
import { PublicKey } from '@solana/web3.js';
import { describeActionError, ReviewNotSavedError, runFundAction, runPostReview, runRequestChanges } from '@ned/core/actions.ts';
import { deliveryEvidence, LIMITS, REVIEW_REASON_NEEDED, validateReview, type DeliveryDraft, type ReviewDraft } from '@ned/core/milestone/content.ts';
import type { FundAccount } from '@ned/core/milestone/decode.ts';
import { shortHash } from '@ned/core/milestone/evidence.ts';
import { formatCountdown, formatDeadline, formatUsdc } from '@ned/core/milestone/format.ts';
import { isFixedVersion, linkLabel } from '@ned/core/milestone/links.ts';
import { previewEmbed } from '@ned/core/milestone/embed.ts';
import type { DeliveryEntry } from '@ned/core/milestone/notes.ts';
import { txExplorerUrl } from '@ned/core/milestone/records.ts';
import { canApprove, canRequestChanges } from '@ned/core/milestone/rules.ts';
import { DISPUTED_STATUS_LINE, type FundView, type MilestoneView } from '@ned/core/milestone/view.ts';
import { Avatar } from '../components/Avatar.tsx';
import { partyName } from '../components/ContractsTable.tsx';
import { FileDrop } from '../components/FileDrop.tsx';
import { Icon } from '../components/icons.tsx';
import { KeyMissing } from '../components/KeyMissing.tsx';
import { PreviewFrame } from '../components/PreviewFrame.tsx';
import { useWalletPanel } from '../components/WalletPanelContext.tsx';
import { FEATURES } from '../config.ts';
import { useActionEnv } from '../hooks/actions.ts';
import type { ContractContentState } from '../hooks/useContractContent.ts';
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

export const REQUEST_INFO = (name: string) =>
  `The amount stays locked. It does not come back to you. ${name} can send a revised version. You can accept it, or you can both agree a split.`;
export const NO_POINTS = 'The brief has no done-when points for this milestone. Judge the preview against the brief.';
export const NOT_READY = (name: string, deadline: number) =>
  `Not ready? Tell ${name} before ${formatDeadline(deadline)}. If you don't review by then, this milestone can be released to them.`;

type Released = { signature: string };

export function Review() {
  const page = useMilestonePage();
  const { fund, ms, msRaw, raw, wallet, vn } = page;
  const { confirm } = useWalletPanel();
  const { env, status } = useActionEnv();
  const [released, setReleased] = useState<Released | null>(null);

  if (page.missing) return <Message title="Contract not found" text="This contract does not exist on devnet, or it was closed." />;
  // Wait for the key and notes too, so the key and integrity blocks never flash and shift the page
  if (!fund || !ms || !msRaw || !raw || !wallet || !page.content.ready) {
    return (
      <main id="main" className={flow.page} aria-busy="true">
        <p className={flow.caption}>{page.error ? 'Could not read this contract. We try again every few seconds.' : 'Reading the contract from the chain…'}</p>
      </main>
    );
  }
  if (released) return <Done fund={fund} raw={raw} index={page.index} released={released} />;
  const back = `/contract/${fund.address}`;
  const party = raw.client.toBase58() === wallet || raw.freelancer.toBase58() === wallet;
  if (!party) return <Message title={`Milestone ${page.index + 1}`} text="Only the client and the freelancer of this contract see its deliveries." back={back} />;
  if (msRaw.submittedAt === 0) return <Message title={`Milestone ${page.index + 1}`} text={`Milestone ${page.index + 1} has no delivery yet.`} back={back} />;

  const other = partyName(fund);
  const release = async (): Promise<void> => {
    const amount = formatUsdc(msRaw.amount);
    const partner = fund.destination?.kind === 'payoutPartner';
    const ok = await confirm({
      title: `Release ${amount}`,
      rows: [
        { label: 'Contract', value: fund.title },
        { label: 'Milestone', value: `${page.index + 1}${ms.name ? ` · ${ms.name}` : ''}` },
        { label: 'To', value: other, sub: partner ? 'Through the payout partner, sent as VND (simulated)' : 'Their N.E.D wallet' },
        { label: 'Amount', value: amount, mono: true },
        { label: 'Network fee', value: '~0.000005 SOL', sub: 'devnet test SOL' },
        { label: 'N.E.D fee', value: 'None during the pilot' },
      ],
      note: { tone: 'info', text: `This cannot be undone. The money leaves the contract vault for ${other} as soon as you confirm.` },
      confirmLabel: 'Release',
    });
    if (!ok) throw new Error('cancelled');
    const result = await runFundAction(env, page.address, 'approve', page.index);
    await page.refresh();
    setReleased({ signature: result.signature });
  };
  const requestChanges = async (review: ReviewDraft, retry: boolean) => {
    if (retry) await runPostReview(env, page.address, page.index, review);
    else await runRequestChanges(env, page.address, page.index, review);
    await page.refresh();
  };
  return (
    <ReviewView
      fund={fund}
      raw={raw}
      index={page.index}
      now={page.now}
      vn={vn}
      me={wallet}
      content={page.content}
      p1={FEATURES.dispute}
      status={status}
      onRelease={release}
      onRequestChanges={requestChanges}
    />
  );
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

export interface ReviewViewProps {
  fund: FundView;
  raw: FundAccount;
  index: number;
  now: number;
  vn: boolean;
  me: string;
  content: Pick<ContractContentState, 'hasKey' | 'importKey' | 'contentStatus'>;
  /** FEATURES.dispute: Request changes and the D27 parts */
  p1: boolean;
  status: string;
  onRelease(): Promise<void>;
  onRequestChanges(review: ReviewDraft, retry: boolean): Promise<void>;
}

export function ReviewView(p: ReviewViewProps) {
  const { fund, raw, index, now } = p;
  const ms = fund.milestones[index] as MilestoneView;
  const msRaw = raw.milestones[index];
  const me = new PublicKey(p.me);
  const client = fund.role === 'client';
  const other = partyName(fund);
  // D18: the Vietnam view has no client actions
  const canDecide = client && !p.vn && canApprove(raw, me, index);
  const canRequest = canDecide && p.p1 && canRequestChanges(raw, me, index, now);
  const versions: DeliveryEntry[] = (ms.history?.deliveries ?? []).filter((d) => d.stage !== 'handover');
  const handovers = (ms.history?.deliveries ?? []).filter((d) => d.stage === 'handover');
  const [version, setVersion] = useState(Math.max(0, versions.length - 1));
  const shown: { content?: DeliveryDraft; entry?: DeliveryEntry } = versions[version] ? { content: versions[version].content, entry: versions[version] } : { content: ms.delivery?.content };
  const isRevision = shown.entry?.stage === 'revision';
  const criteria = ms.criteria ?? [];
  const [ticks, setTicks] = useState<Record<number, boolean>>({});
  const ticked = criteria.filter((_, i) => ticks[i]).length;
  const [sheet, setSheet] = useState(false);
  const { ensureConsent } = useWalletPanel();
  const [busy, setBusy] = useState<'' | 'release' | 'request'>('');
  const [error, setError] = useState('');
  const [retry, setRetry] = useState<ReviewDraft | null>(null);
  // "Load preview" clicks, remembered for this page only (nothing stored)
  const [loaded, setLoaded] = useState<ReadonlySet<string>>(() => new Set());
  const review = ms.history?.reviews.at(-1);
  const amount = formatUsdc(msRaw.amount);
  const partner = fund.destination?.kind === 'payoutPartner';

  const release = async () => {
    setError('');
    setBusy('release');
    try {
      await p.onRelease();
    } catch (err) {
      if ((err as Error)?.message !== 'cancelled') setError(describeActionError(err));
    } finally {
      setBusy('');
    }
  };
  const request = async (draft: ReviewDraft, again: boolean) => {
    setError('');
    setBusy('request');
    try {
      await p.onRequestChanges(draft, again);
      setSheet(false);
      setRetry(null);
    } catch (err) {
      if (err instanceof ReviewNotSavedError) {
        setRetry(draft);
        setSheet(false);
      }
      setError(describeActionError(err));
    } finally {
      setBusy('');
    }
  };

  const title = client ? (canDecide ? `Review milestone ${index + 1}` : `Milestone ${index + 1} · delivery`) : 'What you delivered';
  const timer =
    ms.status === 'submitted' && now <= ms.reviewBy
      ? { warn: ms.reviewBy - now < 3_600, text: `Release opens in ${formatCountdown(ms.reviewBy + 1 - now)} if not reviewed` }
      : { warn: ms.status === 'disputed' || ms.status === 'submitted', text: ms.statusLabel };

  return (
    <m.main id="main" className={flow.page} {...row}>
      <nav aria-label="Breadcrumb" className={flow.crumb}>
        <Link to="/">Workspace</Link> <span aria-hidden>/</span> <Link to={`/contract/${fund.address}`}>{fund.title}</Link> <span aria-hidden>/</span> Milestone {index + 1}
      </nav>
      <div className={flow.head}>
        <div>
          <h1 className={flow.h1}>{title}</h1>
          <div className={styles.sub}>
            {fund.title}
            {ms.name ? ` · ${ms.name}` : ''} · {client ? `by ${other}` : `for ${other}`}
          </div>
        </div>
      </div>

      {!p.content.hasKey ? (
        <KeyMissing content={p.content as ContractContentState} text="Open N.E.D on a device you used for this contract before, and this computer unlocks by itself. Or paste the contract link." />
      ) : null}

      {review && (ms.status === 'disputed' || ms.status === 'submitted') ? (
        <div className={styles.requestBox} data-testid="last-review">
          <div className={styles.requestTitle}>{client ? 'Your request' : `${other} requested changes`} · {review.time ? formatDeadline(review.time) : ''}</div>
          {review.content.unmet.length ? (
            <ul className={styles.unmet}>
              {review.content.unmet.map((i) => (
                <li key={i}>{criteria[i] ?? `Done-when point ${i + 1}`}</li>
              ))}
            </ul>
          ) : null}
          {review.content.reason ? <p style={{ margin: '6px 0 0' }}>{review.content.reason}</p> : null}
        </div>
      ) : null}

      <m.div className={styles.reviewGrid} variants={staggerParent} initial="hidden" animate="shown">
        <m.section variants={rise} custom={0} aria-labelledby="rv-del" className={`${flow.card} ${styles.reviewMain}`}>
          <div className={styles.from}>
            <Avatar seed={client ? fund.counterparty.wallet : p.me} size={40} decorative />
            <div className={styles.fromText}>
              <h2 id="rv-del" className={flow.h2}>
                {client ? `What ${other} delivered` : 'What you delivered'}
              </h2>
              <div className={flow.caption}>
                {isRevision && shown.entry?.time ? `Revised version · sent ${formatDeadline(shown.entry.time)}` : `Submitted ${formatDeadline(msRaw.submittedAt)}`}
              </div>
            </div>
            {!isRevision ? <span className={msRaw.submittedAt <= msRaw.submitBy ? styles.onTime : styles.late}>{msRaw.submittedAt <= msRaw.submitBy ? 'on time' : 'late'}</span> : null}
          </div>
          {versions.length > 1 ? (
            <div className={styles.versions} role="tablist" aria-label="Versions">
              {versions.map((v, i) => (
                <button key={v.signature} type="button" role="tab" aria-selected={version === i} className={`${styles.version} ${version === i ? styles.versionOn : ''}`} onClick={() => setVersion(i)}>
                  Version {i + 1}
                  {v.stage === 'revision' ? ' (revised)' : ''}
                </button>
              ))}
            </div>
          ) : null}
          <DeliveryBody delivery={shown.content} other={other} hasKey={p.content.hasKey} review loaded={loaded} onLoad={(url) => setLoaded((l) => new Set(l).add(url))} />
        </m.section>

        <m.aside variants={rise} custom={1} aria-label="Decide" className={styles.reviewSide}>
          <span role="timer" className={`${styles.timer} ${timer.warn ? styles.timerWarn : styles.timerInfo}`}>
            <Icon name="release" size={14} />
            {timer.text}
          </span>

          <section aria-labelledby="rv-check" className={flow.card}>
            <div className={flow.labelRow}>
              <h2 id="rv-check" className={flow.h2}>
                What to check
              </h2>
              {criteria.length ? <span className={ticked === criteria.length ? styles.countOk : styles.countWarn}>{ticked} of {criteria.length} met</span> : null}
            </div>
            {criteria.length ? (
              <>
                <p className={flow.hint}>The done-when points of the brief (fingerprint {fund.briefHash}). Ticks help you decide; they are not saved.</p>
                {criteria.map((c, i) => (
                  <label key={c} className={styles.check}>
                    <input type="checkbox" checked={Boolean(ticks[i])} onChange={() => setTicks({ ...ticks, [i]: !ticks[i] })} />
                    <span>{c}</span>
                  </label>
                ))}
              </>
            ) : (
              <p className={flow.hint} data-testid="no-points">
                {p.content.hasKey ? NO_POINTS : 'Unlock this computer to read the brief.'}
              </p>
            )}
          </section>

          <Integrity ms={ms} delivery={shown.content} isRevision={isRevision} other={other} hasKey={p.content.hasKey} />

          {canDecide ? (
            <section aria-label="Decision" className={flow.card}>
              <div className={flow.caption}>Release for milestone {index + 1}</div>
              <div className={styles.amountBig}>
                {amount.replace(' USDC', '')}
                <span className={styles.amountUnit}> USDC</span>
              </div>
              <div className={flow.caption}>{partner ? `To the payout partner for ${other} · sent as VND (simulated)` : `To ${other}’s N.E.D wallet`}</div>
              <div className={styles.decide}>
                <button type="button" className={flow.create} onClick={() => void release()} disabled={Boolean(busy)}>
                  {busy === 'release' ? p.status || 'Releasing…' : 'Accept & release'}
                </button>
                {canRequest ? (
                  <button type="button" className={styles.secondaryBtn} onClick={() => ensureConsent() && setSheet(true)} disabled={Boolean(busy)}>
                    Request changes
                  </button>
                ) : null}
                {retry ? (
                  <button type="button" className={styles.secondaryBtn} onClick={() => void request(retry, true)} disabled={Boolean(busy)}>
                    Save the review again
                  </button>
                ) : null}
              </div>
              {error && !sheet ? (
                <p className={flow.error} role="alert">
                  {error}
                </p>
              ) : null}
              <p className={flow.hint} data-testid="bottom-line">
                {ms.status === 'disputed' ? DISPUTED_STATUS_LINE : NOT_READY(other, ms.reviewBy)}
              </p>
            </section>
          ) : (
            <p className={flow.hint} data-testid="bottom-line">
              {ms.status === 'disputed'
                ? DISPUTED_STATUS_LINE
                : client && p.vn && ms.status === 'submitted'
                  ? 'Reviewing and releasing are client actions, which the Vietnam view does not offer.'
                  : `Milestone ${index + 1} · ${ms.statusLabel}.`}
            </p>
          )}
        </m.aside>
      </m.div>

      {ms.status === 'released' ? <FinalFiles first={versions[0]?.content ?? ms.delivery?.content} committedAt={msRaw.submittedAt} handovers={handovers} client={client} other={other} /> : null}

      {sheet ? <RequestSheet criteria={criteria} other={other} busy={busy === 'request'} status={p.status} error={error} onCancel={() => setSheet(false)} onSubmit={(d) => void request(d, false)} /> : null}
    </m.main>
  );
}

/**
 * A delivery's links, note and files. `review` (R2): one tab per link, the PreviewFrame, the note and the listed files
 * as a quiet list (fingerprints only, no drop zone). Without it (final files after release): link cards and the
 * optional "check a file you received".
 */
function DeliveryBody({
  delivery,
  other,
  hasKey,
  review = false,
  loaded,
  onLoad,
}: {
  delivery?: DeliveryDraft;
  other: string;
  hasKey: boolean;
  review?: boolean;
  loaded?: ReadonlySet<string>;
  onLoad?(url: string): void;
}) {
  const [checks, setChecks] = useState<Record<number, FileCheck['kind']>>({});
  const [note, setNote] = useState('');
  const [tab, setTab] = useState(0);
  if (!delivery) {
    return <p className={flow.hint} style={{ marginTop: 12 }}>{hasKey ? 'The delivery saved with this contract could not be read.' : 'Unlock this computer to read the delivery.'}</p>;
  }
  const compare = async (files: File[]) => {
    setNote('');
    for (const file of files) {
      if (file.size > MAX_FILE_BYTES) {
        setNote(`${file.name} is larger than 200 MB, so it cannot be one of the listed files.`);
        continue;
      }
      const sha256 = await hashFile(file);
      const result = checkFile({ name: file.name, sha256 }, delivery.files);
      if (result.kind === 'unknown') setNote(`${file.name} (${shortSha(sha256)}) is not one of the files ${other} listed.`);
      else setChecks((c) => ({ ...c, [result.index]: result.kind }));
    }
  };
  if (review) {
    const url = delivery.links[Math.min(tab, delivery.links.length - 1)];
    return (
      <>
        {delivery.links.length > 1 ? (
          <div className={styles.linkTabs} role="tablist" aria-label="Links">
            {delivery.links.map((l, i) => (
              <button key={l} type="button" role="tab" aria-selected={tab === i} className={`${styles.linkTab} ${tab === i ? styles.linkTabOn : ''}`} onClick={() => setTab(i)}>
                {tabLabel(l)}
              </button>
            ))}
          </div>
        ) : null}
        {url ? (
          <PreviewFrame key={url} url={url} name={other} loaded={loaded?.has(url)} onLoad={() => onLoad?.(url)} />
        ) : (
          <p className={flow.hint}>This delivery has no link, only file fingerprints. Ask {other} for a preview link.</p>
        )}
        {delivery.note ? <blockquote className={styles.quote}>{delivery.note}</blockquote> : null}
        {delivery.files.length ? (
          <details className={styles.optional} data-testid="files-listed">
            <summary>Files listed (fingerprints only)</summary>
            <ul className={flow.list} style={{ marginTop: 10 }}>
              {delivery.files.map((f, i) => (
                <li key={`${f.sha256}-${i}`} className={styles.fileRow}>
                  <span className={styles.linkLabel}>{f.name}</span>
                  <span className={flow.caption} style={{ fontSize: 12 }}>
                    {formatSize(f.size)} · <span className={flow.mono} style={{ fontSize: 12, fontWeight: 400 }}>{shortSha(f.sha256)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </>
    );
  }
  return (
    <>
      {delivery.links.length ? (
        <ul className={flow.list} style={{ marginTop: 12 }}>
          {delivery.links.map((url) => (
            <li key={url}>
              <a href={url} target="_blank" rel="noopener noreferrer" className={styles.linkCard} data-testid="link-card">
                <Icon name="external" size={14} color="var(--caption)" />
                <span className={styles.linkMain}>
                  <span className={styles.linkLabel}>
                    {linkLabel(url)} {isFixedVersion(url) ? <span className={styles.fixed}>Fixed version</span> : null}
                  </span>
                  <span className={styles.linkUrl}>{url.replace(/^https?:\/\/(www\.)?/, '')}</span>
                </span>
                <span className={styles.open}>Open</span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}
      {delivery.note ? <blockquote className={styles.quote}>{delivery.note}</blockquote> : null}
      {delivery.files.length ? (
        <details className={styles.optional}>
          <summary>Optional · Check a file you received</summary>
          <ul className={flow.list} style={{ marginTop: 10 }}>
            {delivery.files.map((f, i) => (
              <li key={`${f.sha256}-${i}`} className={flow.item} style={{ padding: '10px 12px' }}>
                <Icon name="contracts" size={14} color="var(--caption)" />
                <span className={styles.linkText}>
                  <span className={styles.linkLabel}>{f.name}</span>
                  <span className={flow.caption} style={{ fontSize: 12 }}>
                    {formatSize(f.size)} · fingerprint <span className={flow.mono} style={{ fontSize: 12, fontWeight: 400 }}>{shortSha(f.sha256)}</span>
                  </span>
                </span>
                {checks[i] ? (
                  <span aria-live="polite" className={`${styles.fileChip} ${checks[i] === 'same' ? styles.chipSame : styles.chipDiff}`}>
                    {checks[i] === 'same' ? 'Same file ✓' : 'Different file'}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
          <FileDrop compact label={`Drop a file ${other} shared to check it is the same`} onFiles={(f) => void compare(f)} />
          {note ? (
            <p className={flow.hint} role="status">
              {note}
            </p>
          ) : null}
        </details>
      ) : null}
    </>
  );
}

/** "Figma · version 2214", "GitHub · commit …", the preview provider ("Google Drive"), else the host */
function tabLabel(url: string): string {
  const label = linkLabel(url);
  const embed = previewEmbed(url);
  return embed.kind === 'frame' && !label.includes('·') ? embed.provider : label;
}

function Integrity({ ms, delivery, isRevision, other, hasKey }: { ms: MilestoneView; delivery?: DeliveryDraft; isRevision: boolean; other: string; hasKey: boolean }) {
  if (!hasKey) return <p className={flow.hint} style={{ marginTop: 12 }}>DeliveryDraft not opened on this computer.</p>;
  if (isRevision)
    return (
      <p className={flow.hint} style={{ marginTop: 12 }} data-testid="integrity">
        Revised version, signed by {other} and timestamped on Solana. Only the first delivery has an on-chain fingerprint.
      </p>
    );
  const matches = Boolean(ms.delivery?.matches);
  return (
    <p className={`${styles.finalResult} ${matches ? styles.finalOk : styles.finalBad}`} data-testid="integrity">
      {matches ? 'Same delivery that was submitted ✓' : `Does not match what was submitted (fingerprint ${ms.evidence ?? '—'}, now ${delivery ? shortHash(deliveryEvidence(delivery)) : '—'}). Ask ${other} which version is final.`}
    </p>
  );
}

function FinalFiles({ first, committedAt, handovers, client, other }: { first?: DeliveryDraft; committedAt: number; handovers: DeliveryEntry[]; client: boolean; other: string }) {
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const check = async (files: File[]) => {
    const file = files[0];
    if (!file || !first) return;
    const sha256 = await hashFile(file);
    const hit = checkFile({ name: file.name, sha256 }, first.files);
    setResult(hit.kind === 'same' ? { ok: true, text: `Matches the file committed on ${formatDeadline(committedAt)} ✓` } : { ok: false, text: 'Not one of the committed files' });
  };
  return (
    <section aria-labelledby="rv-final" className={flow.card} data-testid="final-files">
      <h2 id="rv-final" className={flow.h2}>
        Final files
      </h2>
      {handovers.length ? (
        handovers.map((h) => (
          <div key={h.signature}>
            <div className={flow.caption}>{h.time ? `Handed over ${formatDeadline(h.time)}` : 'Handed over'}</div>
            <DeliveryBody delivery={h.content} other={other} hasKey />
          </div>
        ))
      ) : (
        <p className={flow.hint}>{client ? `${other} has not handed over the final files yet.` : 'Share the final files now from the contract page.'}</p>
      )}
      {client && first?.files.length ? (
        <>
          <FileDrop compact label="Check a file against the fingerprints committed at submit" multiple={false} onFiles={(f) => void check(f)} />
          {result ? (
            <p className={`${styles.finalResult} ${result.ok ? styles.finalOk : styles.finalBad}`} role="status">
              {result.text}
            </p>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function RequestSheet({ criteria, other, busy, status, error, onCancel, onSubmit }: { criteria: string[]; other: string; busy: boolean; status: string; error: string; onCancel(): void; onSubmit(d: ReviewDraft): void }) {
  const [unmet, setUnmet] = useState<number[]>([]);
  const [reason, setReason] = useState('');
  const chars = [...reason.trim()].length;
  const points = criteria.length > 0;
  const draft: ReviewDraft = { unmet: [...unmet].sort((a, b) => a - b), reason };
  // R1: the same check as the core; without done-when points the reason carries the request (10–500 characters)
  const ok = validateReview(draft, criteria.length).length === 0;
  return (
    <div className={styles.sheetBackdrop}>
      <div className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="rq-title">
        <h2 id="rq-title" className={styles.sheetTitle}>
          Request changes
        </h2>
        <p className={flow.hint}>{points ? 'Tick the done-when points that are not met. At least one is required.' : REVIEW_REASON_NEEDED}</p>
        {points
          ? criteria.map((c, i) => (
              <label key={c} className={styles.check}>
                <input type="checkbox" checked={unmet.includes(i)} onChange={() => setUnmet(unmet.includes(i) ? unmet.filter((x) => x !== i) : [...unmet, i])} />
                <span>{c}</span>
              </label>
            ))
          : null}
        <label className={flow.label} htmlFor="rq-reason">
          {points ? 'Reason' : 'Reason (required)'}
        </label>
        <textarea
          id="rq-reason"
          className={flow.textarea}
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="What is missing, and what would make it acceptable."
          aria-required={!points}
          aria-describedby="rq-count"
        />
        <span id="rq-count" className={chars > LIMITS.reasonChars || (!points && chars > 0 && chars < 10) ? flow.countOver : flow.count}>
          {chars}/{LIMITS.reasonChars}
          {!points ? ' · at least 10' : ''}
        </span>
        <p className={styles.info}>{REQUEST_INFO(other)}</p>
        {error ? (
          <p className={flow.error} role="alert">
            {error}
          </p>
        ) : null}
        <div className={styles.sheetButtons}>
          <button type="button" className={flow.ghostBtn} onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={flow.primaryBtn} disabled={!ok || busy} onClick={() => onSubmit(draft)}>
            {busy ? status || 'Sending…' : 'Request changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Done({ fund, raw, index, released }: { fund: FundView; raw: FundAccount; index: number; released: Released }) {
  const other = partyName(fund);
  const partner = fund.destination?.kind === 'payoutPartner';
  const next = fund.milestones.find((x) => x.status === 'pending' || x.status === 'submitted');
  return (
    <m.main id="main" className={flow.page} {...row}>
      <div className={flow.created}>
        <div className={flow.createdMain}>
          <div className={flow.okDot} aria-hidden>
            <Icon name="check" size={26} color="var(--success-ink)" width={2.6} />
          </div>
          <h1 className={flow.createdTitle}>Milestone {index + 1} released</h1>
          <p className={flow.noticeText}>
            {formatUsdc(raw.milestones[index].amount)} went from the contract to{' '}
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
          </div>
        </div>
      </div>
    </m.main>
  );
}
