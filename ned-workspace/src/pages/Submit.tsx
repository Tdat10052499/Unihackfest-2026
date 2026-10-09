// /contract/:fund/submit?i=<milestone>[&mode=revision|handover] (WebSubmit board; U2, U5, U6, D27). Links with the
// fixed-version hint and the U6 link checks, optional files fingerprinted on this computer (nothing uploaded), a note,
// the brief's "Done when" as a local self-check, the "Before you submit" guide, three optional ticks, and the work
// type. For Design, the preview file is checked here (source format, resolution, the N.E.D watermark marker) and
// "Add watermark" makes a marked preview; Submit waits for the checks or the override tick. D27 modes: a revised
// version on a Disputed milestone, the final files on a Released one (delivery notes, not on-chain fingerprints).
import { useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { AnimatePresence, m } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { PublicKey } from '@solana/web3.js';
import { describeActionError, runHandover, runSendRevision, runSubmit } from '@ned/core/actions.ts';
import { USD_VND_RATE_DATE } from '@ned/core/constants.ts';
import { jobForFund } from '@ned/core/jobs/queries.ts';
import { compareHandover, deliveryEvidence, LIMITS, validateDelivery, type DeliveryDraft } from '@ned/core/milestone/content.ts';
import { acceptedVersion } from '@ned/core/milestone/handover.ts';
import type { FundAccount } from '@ned/core/milestone/decode.ts';
import { shortHash } from '@ned/core/milestone/evidence.ts';
import { formatCountdown, formatDeadline, formatUsdc, usdcFromUnits, vndFromUnits } from '@ned/core/milestone/format.ts';
import { isFixedVersion, linkLabel, looksUnversioned } from '@ned/core/milestone/links.ts';
import { txExplorerUrl } from '@ned/core/milestone/records.ts';
import { canHandover, canSendRevision, canSubmit } from '@ned/core/milestone/rules.ts';
import type { FundView, MilestoneView } from '@ned/core/milestone/view.ts';
import { partyName } from '../components/ContractsTable.tsx';
import { FileDrop } from '../components/FileDrop.tsx';
import { PreviewFrame } from '../components/PreviewFrame.tsx';
import { HANDOVER_CHIP } from '../components/FinalFilesCard.tsx';
import { Icon } from '../components/icons.tsx';
import { KeyMissing } from '../components/KeyMissing.tsx';
import { useWalletPanel } from '../components/WalletPanelContext.tsx';
import { useActionEnv } from '../hooks/actions.ts';
import type { ContractContentState } from '../hooks/useContractContent.ts';
import { useMilestonePage } from '../hooks/useMilestonePage.ts';
import { chainNowSeconds } from '../hooks/useChainTime.ts';
import { fileProblem, formatSize, hashFile, PROGRESS_FROM_BYTES, shortSha, type FileFingerprint } from '../lib/delivery.ts';
import { addWatermark, checkPreview, linkWarning, MESSAGES, OVERRIDE_LABEL, previewName, type PreviewCheck } from '../lib/preview.ts';
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

export type SubmitMode = 'submit' | 'revision' | 'handover';
export type WorkType = 'design' | 'writing' | 'code' | 'video' | 'other';
export const WORK_TYPES: { id: WorkType; label: string }[] = [
  { id: 'design', label: 'Design' },
  { id: 'writing', label: 'Writing & translation' },
  { id: 'code', label: 'Code' },
  { id: 'video', label: 'Video' },
  { id: 'other', label: 'Other' },
];
/** Job category (taxonomy index) → work type: Design, Development, Writing & Translation, …, Video & Animation */
export const workTypeForCategory = (category: number): WorkType => (category === 0 ? 'design' : category === 1 ? 'code' : category === 2 ? 'writing' : category === 4 ? 'video' : 'other');

export const GUIDE_TITLE = 'Before you submit: what to share, what to keep private';
export const QUICK_CHECK = [
  'My links open with the access I chose (try a private window).',
  'Nothing secret or personal is in the links, note or file names.',
  'Each done-when point is covered.',
];
export const PREVIEW_LINK_HINT = 'Upload your watermarked preview to Google Drive (Anyone with the link · Viewer), Figma, YouTube or Loom, and paste the link.';
// F-8 (CL pre-pitch-check 8.2): no automatic reveal, no "only the client"
export const FINALS_HINT = (_client: string) => 'Keep these files. Before release, only their names, sizes and fingerprints are shared. You hand the files over after release.';
export const FIXED_FINAL = 'Your fixed version link is the final work.';
export const HANDOVER_LINK_HINT = 'Share with download access (Google Drive: Anyone with the link · Viewer). Keep the link working for at least 30 days. Anyone with this link, or with the contract link, can download the files.';
export const HANDOVER_TOO_EARLY = 'Final files can be handed over only after the milestone is released.';
export const WHAT_THEY_SEE = (name: string) => `This is what ${name} will see`;
// F-9 (CL pre-pitch-check 8.2)
export const FILES_HINT = (_name: string) => 'Fingerprints of the preview files, saved in the encrypted delivery. The files stay on your computer.';

interface Reading {
  name: string;
  size: number;
  share: number;
}
type Done = { signature: string; evidence: string; at: number; mode: SubmitMode };

export function Submit() {
  const page = useMilestonePage();
  const [params] = useSearchParams();
  const mode: SubmitMode = params.get('mode') === 'revision' ? 'revision' : params.get('mode') === 'handover' ? 'handover' : 'submit';
  const [done, setDone] = useState<Done | null>(null);
  const { fund, ms, msRaw, raw, wallet, now } = page;
  const { confirm } = useWalletPanel();
  const { env, status } = useActionEnv();
  // A contract made from a job: the work type starts from the job's category (local only)
  const job = useQuery({
    queryKey: ['jobForFund-category', page.address],
    enabled: Boolean(page.address),
    staleTime: Infinity,
    queryFn: async () => (await jobForFund(page.address!))?.category ?? null,
  }).data;

  if (page.missing) return <Message title="Contract not found" text="This contract does not exist on devnet, or it was closed." />;
  // Wait for the key and notes too, so the key and integrity blocks never flash and shift the page
  if (!fund || !ms || !msRaw || !raw || !wallet || !page.content.ready) {
    return (
      <main id="main" className={flow.page} aria-busy="true">
        <p className={flow.caption}>{page.error ? 'Could not read this contract. We try again every few seconds.' : 'Reading the contract from the chain…'}</p>
      </main>
    );
  }
  if (done) return <DoneView fund={fund} raw={raw} index={page.index} vn={page.vn} done={done} />;
  const me = new PublicKey(wallet);
  const back = `/contract/${fund.address}`;
  const n = page.index + 1;
  if (mode === 'revision' && !canSendRevision(raw, me, page.index))
    return <Message title="Send revised version" text={fund.role !== 'freelancer' ? 'Only the freelancer sends a revised version.' : `Milestone ${n} is ${ms.statusLabel.toLowerCase()}. A revised version is sent while changes are requested.`} back={back} />;
  if (mode === 'handover' && !canHandover(raw, me, page.index))
    return <Message title="Hand over final files" text={fund.role !== 'freelancer' ? 'Only the freelancer hands over the final files.' : `Milestone ${n} is ${ms.statusLabel.toLowerCase()}. Final files are handed over after release.`} back={back} />;
  if (mode === 'submit' && !canSubmit(raw, me, page.index, now)) {
    const why =
      fund.role !== 'freelancer'
        ? 'Only the freelancer of this contract can submit work.'
        : msRaw.status !== 'Pending'
          ? `Milestone ${n} is ${ms.statusLabel.toLowerCase()}.`
          : raw.state !== 'Funded'
            ? 'The client has not locked the money yet. You can submit once it is locked.'
            : 'The submission deadline of this milestone has passed.';
    return <Message title={`Submit milestone ${n}`} text={why} back={back} />;
  }

  const other = partyName(fund);
  const send = async (delivery: DeliveryDraft, summary: { fingerprint: string; links: number; files: number; finals?: number }) => {
    const pay = money(msRaw.amount, page.vn);
    const title = mode === 'revision' ? 'Send revised version' : mode === 'handover' ? 'Hand over final files' : `Submit milestone ${n}`;
    const ok = await confirm({
      title,
      rows: [
        { label: 'Contract', value: fund.title },
        { label: 'For', value: other },
        ...(mode === 'submit' ? [{ label: 'Amount', value: `${pay.big}${pay.unit}`, sub: pay.sub }] : [{ label: 'Milestone', value: String(n) }]),
        { label: 'Delivery', value: `${summary.links} ${summary.links === 1 ? 'link' : 'links'} · ${summary.files} ${summary.files === 1 ? 'file' : 'files'}` },
        // F2: the promised list is part of what the client accepts
        ...(mode !== 'handover' ? [{ label: 'Final files promised', value: summary.finals ? String(summary.finals) : 'The fixed version link', sub: 'Names, sizes and fingerprints only' }] : []),
        mode === 'submit'
          ? { label: 'Delivery fingerprint', value: summary.fingerprint, sub: 'Saved on-chain with the chain clock', mono: true }
          : { label: 'Saved as', value: 'An encrypted note', sub: 'Signed by you and timestamped on Solana' },
        // A4: no SOL amount in the Vietnam view
        page.vn
          ? { label: 'Network fee', value: 'Test SOL on devnet', sub: 'it has no value' }
          : { label: 'Network fee', value: '~0.000005 SOL per transaction', sub: 'devnet test SOL' },
        { label: 'N.E.D fee', value: 'None during the pilot' },
      ],
      note: {
        tone: mode === 'submit' ? 'warning' : 'info',
        text:
          mode === 'submit'
            ? `You cannot edit a delivery after submitting. ${other} reads it with the contract key; only the fingerprint is public.`
            : `${other} reads it with the contract key. The fingerprint saved at submit does not change.`,
      },
      confirmLabel: mode === 'revision' ? 'Send' : mode === 'handover' ? 'Hand over' : 'Submit',
    });
    if (!ok) return;
    if (mode === 'submit') {
      const result = await runSubmit(env, page.address, page.index, delivery);
      const at = await chainNowSeconds();
      await page.refresh();
      setDone({ signature: result.signature, evidence: result.evidence, at, mode });
    } else {
      const result = mode === 'revision' ? await runSendRevision(env, page.address, page.index, delivery) : await runHandover(env, page.address, page.index, delivery);
      const at = await chainNowSeconds();
      await page.refresh();
      setDone({ signature: result.noteSignatures.at(-1) ?? '', evidence: result.evidence, at, mode });
    }
  };
  return (
    <SubmitView
      fund={fund}
      raw={raw}
      index={page.index}
      now={now}
      vn={page.vn}
      content={page.content}
      mode={mode}
      initialType={job !== undefined && job !== null ? workTypeForCategory(job) : undefined}
      status={status}
      onSend={send}
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

/** "≈ 260,000 VND" + "$10.00 · estimate · rate of 2 Oct" in the Vietnam view, else USDC */
function money(units: bigint, vn: boolean) {
  return vn
    ? { big: `≈ ${vndFromUnits(units).toLocaleString('en-US')}`, unit: ' VND', sub: `$${usdcFromUnits(units)} · estimate · rate of ${rateDay}` }
    : { big: usdcFromUnits(units), unit: ' USDC', sub: 'devnet test money' };
}

export interface SubmitViewProps {
  fund: FundView;
  raw: FundAccount;
  index: number;
  now: number;
  vn: boolean;
  content: Pick<ContractContentState, 'hasKey' | 'content' | 'importKey' | 'contentStatus'>;
  mode: SubmitMode;
  /** From the job's category, when the contract came from a job */
  initialType?: WorkType;
  status: string;
  onSend(delivery: DeliveryDraft, summary: { fingerprint: string; links: number; files: number; finals?: number }): Promise<void>;
  /** Injected in tests; the browser tool otherwise */
  makeWatermark?: (file: Blob, title: string, fund: string) => Promise<Blob>;
  /** Saves the marked preview; an <a download> otherwise */
  download?: (blob: Blob, name: string) => void;
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

interface Preview {
  name: string;
  file: Blob;
  check: PreviewCheck;
  /** An object URL of a marked preview, for the thumbnail */
  url?: string;
  sha256: string;
}

export function SubmitView(p: SubmitViewProps) {
  const { fund, raw, index, now, vn, content, mode } = p;
  const ms = fund.milestones[index] as MilestoneView;
  const msRaw = raw.milestones[index];
  const [type, setType] = useState<WorkType>(p.initialType ?? 'other');
  const [links, setLinks] = useState<string[]>([]);
  const [linkDraft, setLinkDraft] = useState('');
  const [linkError, setLinkError] = useState('');
  const [files, setFiles] = useState<FileFingerprint[]>([]);
  // F2: the promised list (final files hashed on this computer, never uploaded)
  const [finals, setFinals] = useState<FileFingerprint[]>([]);
  const [finalsError, setFinalsError] = useState('');
  const [reading, setReading] = useState<Reading[]>([]);
  const [fileError, setFileError] = useState('');
  const [note, setNote] = useState('');
  const [ticks, setTicks] = useState<Record<number, boolean>>({});
  const [quick, setQuick] = useState<Record<number, boolean>>({});
  const [preview, setPreview] = useState<Preview | null>(null);
  const [marking, setMarking] = useState(false);
  const [override, setOverride] = useState(false);
  const [guide, setGuide] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const other = partyName(fund);
  const criteria = ms.criteria ?? [];
  const allFiles = useMemo(() => (preview ? [...files.filter((f) => f.sha256 !== preview.sha256), { name: preview.name, size: preview.file.size, sha256: preview.sha256 }] : files), [files, preview]);
  const delivery: DeliveryDraft = useMemo(
    () => ({ links, files: allFiles, note, ...(mode !== 'handover' && finals.length ? { finals } : {}) }),
    [links, allFiles, note, finals, mode]
  );
  const accepted = acceptedVersion(ms.history);
  const promised = accepted?.content.finals ?? [];
  const fixedLink = links.some(isFixedVersion);
  const handoverCompare = mode === 'handover' && promised.length ? compareHandover(promised, allFiles) : [];
  const handoverChanged = handoverCompare.some((r) => r.state !== 'same');
  // Checked with its stage (R1): a first delivery or a revision needs a preview link, a hand-over a link or a file. The
  // stage is added here for the check only; the actions add it to the saved note themselves.
  const problems = validateDelivery(mode === 'submit' ? delivery : { ...delivery, stage: mode }, mode === 'handover' ? promised : undefined, other);
  const empty = mode === 'handover' ? !links.length && !allFiles.length : !links.length;
  const fingerprint = empty ? '—' : shortHash(deliveryEvidence(delivery));
  const left = msRaw.submitBy - now;
  const pay = money(msRaw.amount, vn);
  const ticked = criteria.filter((_, i) => ticks[i]).length;
  const noKey = !content.hasKey;
  // U6 gate: Design previews (not the final files) must pass the checks, or the freelancer ticks the override
  const designGate = type === 'design' && mode !== 'handover';
  const previewOk = Boolean(preview && preview.check.problems.length === 0);
  const gated = designGate && !previewOk && !override;
  const review = ms.history?.reviews.at(-1);
  const n = index + 1;

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
        if (list.some((f) => f.sha256 === sha256)) setFileError(`${file.name} is already in the list.`);
        else {
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

  const addFinals = async (picked: File[]) => {
    setFinalsError('');
    let list = finals;
    for (const file of picked) {
      const problem = fileProblem(file, list);
      if (problem) {
        setFinalsError(problem);
        continue;
      }
      try {
        const sha256 = await hashFile(file);
        if (list.some((f) => f.sha256 === sha256)) setFinalsError(`${file.name} is already in the list.`);
        else {
          list = [...list, { name: file.name, size: file.size, sha256 }];
          setFinals(list);
        }
      } catch {
        setFinalsError(`Could not read ${file.name}.`);
      }
    }
  };

  const takePreview = async (file: Blob, name: string) => {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const check = checkPreview(name, bytes, fund.address);
    const sha256 = await hashFile(file);
    setPreview((old) => {
      if (old?.url) URL.revokeObjectURL(old.url);
      return { name, file, check, sha256, ...(check.marked && typeof URL.createObjectURL === 'function' ? { url: URL.createObjectURL(file) } : {}) };
    });
  };

  const watermark = async () => {
    if (!preview) return;
    setMarking(true);
    setError('');
    try {
      const marked = await (p.makeWatermark ?? addWatermark)(preview.file, fund.title, fund.address);
      const name = previewName(preview.name);
      (p.download ?? downloadBlob)(marked, name);
      await takePreview(marked, name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the watermark.');
    } finally {
      setMarking(false);
    }
  };

  const submit = async () => {
    setError('');
    if (problems.length) return setError(problems[0].message);
    if (noKey) return setError('This computer cannot open the contract yet. Open N.E.D on a device you used for this contract before, or paste the contract link.');
    if (gated) return setError('Check the preview first, or tick the box above if you added your own watermark.');
    setBusy(true);
    try {
      await p.onSend(delivery, { fingerprint, links: links.length, files: allFiles.length, finals: finals.length });
    } catch (err) {
      setError(describeActionError(err));
    } finally {
      setBusy(false);
    }
  };

  // F2: final files only after release (canHandover); the money must have left the program first
  if (mode === 'handover' && ms.status !== 'released')
    return (
      <main id="main" className={flow.page}>
        <div className={flow.notice} data-testid="handover-too-early">
          <h1 className={flow.noticeTitle}>Hand over final files</h1>
          <p className={flow.noticeText}>{HANDOVER_TOO_EARLY}</p>
        </div>
      </main>
    );

  const title = mode === 'revision' ? 'Send revised version' : mode === 'handover' ? 'Hand over final files' : `Submit milestone ${n}`;
  const button = mode === 'revision' ? 'Send revised version' : mode === 'handover' ? 'Hand over final files' : `Submit milestone ${n}`;

  return (
    <m.main id="main" className={flow.page} {...row}>
      <nav aria-label="Breadcrumb" className={flow.crumb}>
        <Link to="/">Workspace</Link> <span aria-hidden>/</span> <Link to={`/contract/${fund.address}`}>{fund.title}</Link> <span aria-hidden>/</span> Milestone {n}
      </nav>
      <div className={flow.head}>
        <div>
          <h1 className={flow.h1}>{title}</h1>
          <div className={styles.sub}>
            {mode === 'submit' ? '' : `Milestone ${n} · `}
            {fund.title}
            {ms.name ? ` · ${ms.name}` : ''} · for {other}
          </div>
        </div>
        {mode === 'submit' ? (
          <span role="timer" className={`${styles.timer} ${left < 86_400 ? styles.timerWarn : styles.timerInfo}`}>
            <Icon name="lock" size={14} />
            Submit by {formatDeadline(msRaw.submitBy)} · <strong>{formatCountdown(left)}</strong> left
          </span>
        ) : (
          <span className={`${styles.timer} ${styles.timerInfo}`}>{ms.statusLabel}</span>
        )}
      </div>
      <button type="button" className={styles.guideLink} onClick={() => setGuide(true)}>
        {GUIDE_TITLE}
      </button>

      {mode === 'revision' ? (
        <div className={styles.modeInfo} data-testid="mode-info">
          {other} asked for changes. Your revised version is encrypted for {other}, signed by you and timestamped on Solana. The fingerprint saved at submit does not
          change; {other} can accept it, ask again, or you can both agree a split.
        </div>
      ) : mode === 'handover' ? (
        <div className={styles.modeInfo} data-testid="mode-info">
          Share the final files now. {other} can check them against the fingerprints you committed when you submitted.
        </div>
      ) : null}
      {mode === 'revision' && review ? (
        <div className={styles.requestBox}>
          <div className={styles.requestTitle}>What {other} asked for</div>
          <ul className={styles.unmet}>
            {review.content.unmet.map((i) => (
              <li key={i}>{criteria[i] ?? `Done-when point ${i + 1}`}</li>
            ))}
          </ul>
          {review.content.reason ? <p style={{ margin: '6px 0 0' }}>{review.content.reason}</p> : null}
        </div>
      ) : null}

      <div className={flow.grid}>
        <m.div className={flow.main} variants={staggerParent} initial="hidden" animate="shown">
          {noKey ? (
            <m.div variants={rise} custom={0}>
              <KeyMissing
                content={content as ContractContentState}
                text="Open N.E.D on a device you used for this contract before (your phone, for example), and this computer unlocks by itself. Or paste the contract link."
              />
            </m.div>
          ) : null}

          <m.section variants={rise} custom={0} aria-labelledby="sb-type" className={flow.card}>
            <h2 id="sb-type" className={flow.h2}>
              Work type
            </h2>
            <div role="radiogroup" aria-labelledby="sb-type" className={styles.types}>
              {WORK_TYPES.map((t) => (
                <button key={t.id} type="button" role="radio" aria-checked={type === t.id} className={`${styles.type} ${type === t.id ? styles.typeOn : ''}`} onClick={() => setType(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>
            <p className={flow.hint}>Only changes the checks on this page. It is not saved and does not change the brief.</p>
          </m.section>

          {designGate ? (
            <m.section variants={rise} custom={0} aria-labelledby="sb-preview" className={flow.card} data-testid="preview-check">
              <div>
                <h2 id="sb-preview" className={flow.h2}>
                  Preview for review
                </h2>
                <p className={flow.hint}>
                  Drop the preview image you will upload to Google Drive. It is checked here and never leaves your computer; its fingerprint goes into the delivery.
                </p>
              </div>
              <FileDrop compact multiple={false} label="Drop the preview image (PNG or JPG)" onFiles={(f) => void takePreview(f[0], f[0].name)} />
              {preview ? (
                <>
                  <div className={flow.caption}>
                    {preview.name}
                    {preview.check.size ? ` · ${preview.check.size.width} × ${preview.check.size.height} px` : ''} · {formatSize(preview.file.size)}
                  </div>
                  {preview.check.problems.map((k) => (
                    <div key={k} className={styles.problem} role="status" data-testid={`problem-${k}`}>
                      <Icon name="lock" size={14} />
                      <span>{MESSAGES[k]}</span>
                    </div>
                  ))}
                  {preview.check.problems.length === 0 ? (
                    <div className={styles.passed} role="status" data-testid="preview-passed">
                      <Icon name="check" size={14} width={2.6} />
                      N.E.D watermark found for this contract · ready to share
                    </div>
                  ) : null}
                  {preview.check.problems.some((k) => k === 'watermark' || k === 'size') && !preview.check.problems.includes('source') && !preview.check.problems.includes('unreadable') ? (
                    <button type="button" className={flow.primaryBtn} onClick={() => void watermark()} disabled={marking} style={{ alignSelf: 'flex-start' }}>
                      {marking ? 'Adding the watermark…' : 'Add watermark'}
                    </button>
                  ) : null}
                  {preview.url ? <img src={preview.url} alt={`Watermarked preview ${preview.name}`} className={styles.thumb} /> : null}
                  {previewOk ? <p className={flow.hint}>{preview.name.endsWith('-preview.png') ? `Saved to your downloads as ${preview.name}. ` : ''}Upload this file to Google Drive and paste its link below.</p> : null}
                </>
              ) : null}
              <label className={styles.check}>
                <input type="checkbox" checked={override} onChange={() => setOverride(!override)} />
                <span>{OVERRIDE_LABEL}</span>
              </label>
            </m.section>
          ) : null}

          <m.section variants={rise} custom={0} aria-labelledby="sb-links" className={flow.card}>
            <div>
              <h2 id="sb-links" className={flow.h2}>
                {mode === 'handover' ? (
                  <>
                    Download link <span className={styles.required}>· required</span>
                  </>
                ) : (
                  <>
                    Preview link <span className={styles.required}>· required</span>
                  </>
                )}
              </h2>
              <p className={flow.hint}>
                {mode === 'handover' ? HANDOVER_LINK_HINT : PREVIEW_LINK_HINT}
              </p>
            </div>
            <ul className={flow.list}>
              <AnimatePresence initial={false}>
                {links.map((url) => {
                  const warn = linkWarning(url);
                  return (
                    <m.li key={url} layout="position" className={flow.item} {...row}>
                      <Icon name="external" size={14} color="var(--caption)" />
                      <span className={styles.linkText}>
                        <span className={styles.linkLabel}>{linkLabel(url)}</span>
                        <span className={styles.linkUrl}>{url}</span>
                        {warn ? (
                          <span className={`${styles.linkNote} ${warn.tone === 'info' ? styles.linkNoteInfo : ''}`} data-testid="link-warning">
                            {warn.message}
                          </span>
                        ) : null}
                      </span>
                      {isFixedVersion(url) ? <span className={styles.fixed}>Fixed version</span> : null}
                      <button type="button" className={flow.remove} aria-label={`Remove ${linkLabel(url)}`} onClick={() => setLinks(links.filter((l) => l !== url))}>
                        <Icon name="close" size={14} color="var(--caption)" />
                      </button>
                    </m.li>
                  );
                })}
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
            {mode !== 'handover' && links[0] ? (
              <div className={styles.seePreview} data-testid="submit-preview">
                <div className={styles.seeTitle}>{WHAT_THEY_SEE(other)}</div>
                <PreviewFrame key={links[0]} url={links[0]} name={other} />
              </div>
            ) : null}
          </m.section>

          {mode !== 'handover' ? (
            <m.section variants={rise} custom={1} aria-labelledby="sb-finals" className={flow.card} data-testid="finals-section">
              <div>
                <h2 id="sb-finals" className={flow.h2}>
                  Final files you will hand over after release{' '}
                  <span className={fixedLink ? styles.optionalTag : styles.required}>· {fixedLink ? 'optional' : 'required'}</span>
                </h2>
                <p className={flow.hint}>{fixedLink ? FIXED_FINAL : FINALS_HINT(other)}</p>
              </div>
              <FileDrop label="Choose the final files · read on this computer, never uploaded" onFiles={(f) => void addFinals(f)} />
              <ul className={flow.list} aria-label="Final files you will hand over">
                {finals.map((f) => (
                  <li key={f.sha256} className={flow.item}>
                    <Icon name="contracts" size={14} color="var(--caption)" />
                    <span className={styles.linkText}>
                      <span className={styles.linkLabel}>{f.name}</span>
                      <span className={flow.caption} style={{ fontSize: 12 }}>
                        {formatSize(f.size)} · fingerprint <span className={flow.mono} style={{ fontSize: 12, fontWeight: 400 }}>{shortSha(f.sha256)}</span>
                      </span>
                    </span>
                    <button type="button" className={flow.remove} aria-label={`Remove ${f.name}`} onClick={() => setFinals(finals.filter((x) => x.sha256 !== f.sha256))}>
                      <Icon name="close" size={14} color="var(--caption)" />
                    </button>
                  </li>
                ))}
              </ul>
              {finalsError ? (
                <p className={flow.error} role="alert">
                  {finalsError}
                </p>
              ) : null}
            </m.section>
          ) : null}

          <m.section variants={rise} custom={1} aria-labelledby="sb-files" className={flow.card}>
            <div>
              <div className={styles.filesHead}>
                <h2 id="sb-files" className={flow.h2}>
                  {mode === 'handover' ? 'Final files you hand over' : 'Preview files'}
                </h2>
                <span className={flow.caption}>· fingerprints only{mode === 'handover' ? ', checked against your promised list' : ''}</span>
              </div>
              <p className={flow.hint}>
                {mode === 'handover' ? `Choose the files you share at the link above, so ${other} can check them against what you promised.` : FILES_HINT(other)} Up to 200 MB each.
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
                {allFiles.map((f) => (
                  <m.li key={f.sha256} layout="position" className={flow.item} {...row}>
                    <Icon name="contracts" size={14} color="var(--caption)" />
                    <span className={styles.linkText}>
                      <span className={styles.linkLabel}>{f.name}</span>
                      <span className={flow.caption} style={{ fontSize: 12 }}>
                        {formatSize(f.size)} · fingerprint <span className={flow.mono} style={{ fontSize: 12, fontWeight: 400 }}>{shortSha(f.sha256)}</span>
                        {preview?.sha256 === f.sha256 ? ' · the checked preview' : ''}
                      </span>
                    </span>
                    {preview?.sha256 === f.sha256 ? null : (
                      <button type="button" className={flow.remove} aria-label={`Remove ${f.name}`} onClick={() => setFiles(files.filter((x) => x.sha256 !== f.sha256))}>
                        <Icon name="close" size={14} color="var(--caption)" />
                      </button>
                    )}
                  </m.li>
                ))}
              </AnimatePresence>
            </ul>
            {fileError ? (
              <p className={flow.error} role="alert">
                {fileError}
              </p>
            ) : null}
            {mode === 'handover' && promised.length ? (
              <div data-testid="handover-compare">
                <div className={styles.sectionLabel}>What you promised (Version {accepted?.index})</div>
                <ul className={flow.list}>
                  {handoverCompare.map((r) => (
                    <li key={`${r.state}-${r.file.sha256}`} className={styles.finalRow}>
                      <span className={styles.linkText}>
                        <span className={styles.linkLabel}>{r.file.name}</span>
                        <span className={flow.caption} style={{ fontSize: 12 }}>
                          {formatSize(r.file.size)} · <span className={flow.mono} style={{ fontSize: 12, fontWeight: 400 }}>{shortSha(r.file.sha256)}</span>
                        </span>
                      </span>
                      <span className={`${styles.fileChip} ${r.state === 'same' ? styles.chipSame : styles.chipDiff}`}>{HANDOVER_CHIP[r.state as 'same' | 'missing' | 'extra']}</span>
                    </li>
                  ))}
                </ul>
                {handoverChanged ? <p className={styles.warnHint}>Something differs from what you promised. Explain what changed in the note below (at least 10 characters).</p> : null}
              </div>
            ) : null}
          </m.section>

          <m.section variants={rise} custom={2} aria-labelledby="sb-note-h" className={flow.card}>
            <div className={flow.labelRow}>
              <h2 id="sb-note-h" className={flow.h2}>
                <label htmlFor="sb-note">{mode === 'handover' && handoverChanged ? `What changed from the files you promised (required)` : `Note to ${other}`}</label>
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
              placeholder={mode === 'revision' ? 'What changed in this version.' : mode === 'handover' ? 'What is in the final files and where to find each one.' : 'What is in this delivery and where to look first.'}
            />
          </m.section>

          {criteria.length && mode !== 'handover' ? (
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
          {mode === 'submit' ? (
            <m.div variants={rise} custom={1} className={flow.card} style={{ gap: 0 }}>
              <div className={flow.caption}>Comes to you after release</div>
              <div className={styles.amountBig}>
                {pay.big}
                <span className={styles.amountUnit}>{pay.unit}</span>
              </div>
              <div className={flow.caption}>
                {pay.sub}
                {fund.destination ? ` · ${fund.destination.kind === 'payoutPartner' ? 'to your bank via the payout partner' : 'to your N.E.D account'}` : ''}
              </div>
            </m.div>
          ) : null}
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
              <span className={flow.fpLabel}>{mode === 'submit' ? 'Delivery fingerprint' : 'Not on-chain'}</span>
              <span className={flow.mono} aria-live="polite">
                {mode === 'submit' ? fingerprint : 'signed note'}
              </span>
            </div>
            <p className={flow.fpText}>
              {mode === 'submit'
                ? `Made from your links, file fingerprints and note. Only this goes on-chain; the delivery itself is encrypted with the contract key, so only you and ${other} can read it.`
                : `Saved as an encrypted note in the contract's history, signed by you and timestamped. The fingerprint saved at submit stays the same.`}
            </p>
          </m.div>
          {mode === 'submit' ? (
            <m.div variants={rise} custom={4} className={flow.rules}>
              <div className={flow.rulesTitle}>How on-time is decided</div>
              The program accepts a submit only up to {formatDeadline(msRaw.submitBy)} and records the time from the chain clock, not from your computer. After that,
              the milestone can be refunded to {other}.
            </m.div>
          ) : null}
          <div className={styles.quick} aria-label="Quick check">
            <div className={styles.quickTitle}>Quick check</div>
            {QUICK_CHECK.map((q, i) => (
              <label key={q} className={styles.check}>
                <input type="checkbox" checked={Boolean(quick[i])} onChange={() => setQuick({ ...quick, [i]: !quick[i] })} />
                <span>{q}</span>
              </label>
            ))}
          </div>
          <div className={flow.createBox}>
            <button type="button" className={flow.create} onClick={() => void submit()} disabled={busy || gated} aria-disabled={empty || noKey || gated}>
              {busy ? p.status || 'Sending…' : button}
            </button>
            <p className={error ? flow.error : flow.createHint} aria-live="polite">
              {error ||
                (gated
                  ? 'Check the preview above first, or tick the box if you added your own watermark.'
                  : mode === 'submit'
                    ? 'Opens your wallet to confirm. You cannot edit a delivery after submitting.'
                    : 'Opens your wallet to confirm.')}
            </p>
          </div>
        </m.aside>
      </div>
      {guide ? <GuideSheet other={other} onClose={() => setGuide(false)} /> : null}
    </m.main>
  );
}

/** U5 + the U6 Drive guide and the per-type table */
export function GuideSheet({ other, onClose }: { other: string; onClose(): void }) {
  return (
    <div className={styles.sheetBackdrop} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="guide-title" style={{ maxWidth: 680 }}>
        <h2 id="guide-title" className={styles.sheetTitle}>
          {GUIDE_TITLE}
        </h2>
        <div className={styles.guide}>
          <h3>What happens to what you submit</h3>
          <ul>
            <li>Your links and note are encrypted with the contract key. N.E.D has no key; anyone holding the contract link can read them.</li>
            <li>A fingerprint of the delivery is saved on Solana. It proves what you submitted and reveals nothing about it.</li>
            <li>Files never leave your device. N.E.D keeps only their fingerprints.</li>
            <li>A link is only as private as its sharing setting.</li>
          </ul>
          <h3>Do</h3>
          <ul>
            <li>Link to one fixed version (a Figma version, a Git commit, a shared file version).</li>
            <li>Give view-only or comment-only access.</li>
            <li>Share previews (watermarked or lower resolution) if you prefer to hand over final files after release.</li>
            <li>Say which done-when point each part covers.</li>
            <li>Keep your own copy of everything you submit.</li>
            <li>List your final files when you submit. Hand them over after release, with a link that allows download.</li>
          </ul>
          <h3>Don't</h3>
          <ul>
            <li>Put passwords, API keys, private keys or recovery phrases in links, the note or file names.</li>
            <li>Include personal data: ID numbers, phone numbers, home addresses, bank details, yours or anyone else's.</li>
            <li>Include client data you don't need to show.</li>
            <li>Use links that let anyone edit or delete your work.</li>
          </ul>
          <h3>Share a preview on Google Drive</h3>
          <ol>
            <li>Upload the watermarked preview, not the final file.</li>
            <li>Share → General access → Anyone with the link → Viewer.</li>
            <li>In the sharing settings (gear icon), untick “Viewers and commenters can see the option to download, print and copy”.</li>
            <li>Copy the link of the file, not the folder, and paste it here.</li>
            <li>Open the link in a private window to check what {other} will see.</li>
          </ol>
          <p style={{ margin: 0 }}>Drive shows the file owner's Google name to anyone with the link. Use a work account if you don't want to show your personal one.</p>
          <table className={styles.guideTable}>
            <thead>
              <tr>
                <th>Work type</th>
                <th>Share for review</th>
                <th>Keep until release</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Design</td>
                <td>Watermarked preview (N.E.D can add it), up to 1200 px</td>
                <td>Source files (.ai, .svg, .fig) and full-size exports</td>
              </tr>
              <tr>
                <td>Writing &amp; translation</td>
                <td>A view-only Google Doc with download and copy turned off, or an excerpt</td>
                <td>The editable file</td>
              </tr>
              <tr>
                <td>Code</td>
                <td>A deployed demo link, a screen recording, test results</td>
                <td>Repository access and source code</td>
              </tr>
              <tr>
                <td>Video</td>
                <td>A watermarked, lower-resolution version on Drive or as an unlisted video</td>
                <td>The master file</td>
              </tr>
            </tbody>
          </table>
          <h3>Quick check</h3>
          <ul>
            {QUICK_CHECK.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </div>
        <div className={styles.sheetButtons}>
          <button type="button" className={flow.primaryBtn} onClick={onClose} autoFocus>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

function DoneView({ fund, raw, index, vn, done }: { fund: FundView; raw: FundAccount; index: number; vn: boolean; done: Done }) {
  const msRaw = raw.milestones[index];
  const ms = fund.milestones[index];
  const at = done.mode === 'submit' ? msRaw.submittedAt || done.at : done.at;
  const pay = money(msRaw.amount, vn);
  const other = partyName(fund);
  const partner = fund.destination?.kind === 'payoutPartner';
  const title = done.mode === 'revision' ? 'Revised version sent' : done.mode === 'handover' ? 'Final files handed over' : 'Submitted · in review';
  return (
    <m.main id="main" className={flow.page} {...row}>
      <div className={flow.created}>
        <div className={flow.createdMain}>
          <div className={`${flow.okDot} ${done.mode === 'handover' ? '' : styles.okDotWarn}`} aria-hidden>
            <Icon name={done.mode === 'handover' ? 'check' : 'review'} size={26} color={done.mode === 'handover' ? 'var(--success-ink)' : 'var(--warning-ink)'} width={2.4} />
          </div>
          <h1 className={flow.createdTitle}>{title}</h1>
          <p className={flow.noticeText}>
            {done.mode === 'revision'
              ? `${other} sees the revised version on the contract. The amount stays locked until you both agree.`
              : done.mode === 'handover'
                ? `${other} can check the final files against the fingerprints you committed at submit.`
                : `${other} sees your delivery in the Workspace and on the phone. If ${other} does not review it by ${formatDeadline(msRaw.reviewBy)}, anyone can release it ${partner ? 'to your bank in VND' : 'to your N.E.D account'}.`}
          </p>
          <div className={styles.rowsBox}>
            <div className={styles.doneRow}>
              <span>Recorded at</span>
              <span className={styles.doneValue}>{formatDeadline(at)} · chain clock</span>
            </div>
            {done.mode === 'submit' ? (
              <>
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
              </>
            ) : null}
          </div>
          <div className={flow.actions}>
            {done.signature ? (
              <a href={txExplorerUrl(done.signature)} target="_blank" rel="noopener noreferrer" className={flow.ghost}>
                View on Explorer
              </a>
            ) : null}
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
