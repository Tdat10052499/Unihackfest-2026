// Final files of a released milestone (F2; prompts-final-files.md), for both sides, in Review and on the contract
// page. It replaces the old FinalFiles block, which compared against the first delivery (usually the preview, G2):
// the promised list now comes from the accepted version. States: waiting (late after 48 hours, a reminder only),
// handed over (Download per link, the note, the promised list with chips, "Check your download", "Save receipt"),
// and no final files after a refund or a split. N.E.D cannot force a hand-over; the card says what was promised.
import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { getProgramId } from '@ned/core/config.ts';
import { checkDownload, compareHandover, type FileFingerprint, type FileResult } from '@ned/core/milestone/content.ts';
import type { FundAccount } from '@ned/core/milestone/decode.ts';
import { formatDeadline } from '@ned/core/milestone/format.ts';
import { acceptedVersion, buildReceipt, handoverStatus } from '@ned/core/milestone/handover.ts';
import { isFixedVersion, linkLabel } from '@ned/core/milestone/links.ts';
import type { ReleaseRecord } from '@ned/core/milestone/records.ts';
import type { MilestoneView } from '@ned/core/milestone/view.ts';
import { formatSize, hashFile, shortSha } from '../lib/delivery.ts';
import { downloadHref, lateHours, receiptName, saveJson } from '../lib/finalFiles.ts';
import { FileDrop } from './FileDrop.tsx';
import { Icon } from './icons.tsx';
import flow from '../pages/Flow.module.css';
import styles from '../pages/Milestone.module.css';

export const NO_ENFORCEMENT = (name: string) => `After release, N.E.D cannot make ${name} hand over the files. Check this list before you accept.`;
export const LINKS_EXPIRE = (name: string) => `Download and keep your own copy. These links are hosted by ${name} and can stop working.`;
export const FIXED_IS_FINAL = 'The fixed version link above is the final work.';
export const CHECK_CHIP: Record<FileResult['state'], string> = {
  same: 'Same as promised before you accepted ✓',
  different: 'Different from what was promised',
  extra: 'Not in the promised list',
  missing: 'Not in your download',
};
export const HANDOVER_CHIP: Record<'same' | 'missing' | 'extra', string> = { same: 'Same as promised', missing: 'Missing', extra: 'Extra' };

export interface FinalFilesCardProps {
  fundAddress: string;
  title: string;
  raw: FundAccount;
  ms: MilestoneView;
  role: 'client' | 'freelancer';
  /** the other party's name */
  other: string;
  now: number;
  release?: ReleaseRecord;
  /** the freelancer's hand-over page, when canHandover */
  handoverHref?: string;
  /** tests: replaces the browser download */
  onSave?(name: string, data: unknown): void;
}

function FileList({ files, chips, muted = false }: { files: FileFingerprint[]; chips?: (f: FileFingerprint) => { text: string; ok: boolean } | null; muted?: boolean }) {
  return (
    <ul className={flow.list} data-testid="promised-list">
      {files.map((f) => {
        const chip = chips?.(f);
        return (
          <li key={f.sha256} className={`${styles.finalRow} ${muted ? styles.finalMuted : ''}`}>
            <Icon name="contracts" size={14} color="var(--caption)" />
            <span className={styles.linkText}>
              <span className={styles.linkLabel}>{f.name}</span>
              <span className={flow.caption} style={{ fontSize: 12 }}>
                {formatSize(f.size)} · <span className={flow.mono} style={{ fontSize: 12, fontWeight: 400 }}>{shortSha(f.sha256)}</span>
              </span>
            </span>
            {chip ? <span className={`${styles.fileChip} ${chip.ok ? styles.chipSame : styles.chipDiff}`}>{chip.text}</span> : null}
          </li>
        );
      })}
    </ul>
  );
}

export function FinalFilesCard(p: FinalFilesCardProps) {
  const { ms, raw, role, other, now } = p;
  const index = ms.index;
  const status = handoverStatus(raw, index, ms.history, p.release?.releasedAt || undefined, now);
  const accepted = acceptedVersion(ms.history);
  const promised = accepted?.content.finals ?? [];
  const fixed = Boolean(accepted?.content.links.some(isFixedVersion));
  const handover = ms.history?.deliveries.filter((d) => d.stage === 'handover').at(-1);
  // Check results stay on this page only
  const [check, setCheck] = useState<{ at: number; results: FileResult[] } | null>(null);
  const [checking, setChecking] = useState(false);
  const folder = useRef<HTMLInputElement>(null);
  const client = role === 'client';
  const from = client ? other : 'you';

  if (status === 'not-due') return null;
  if (status === 'not-applicable') {
    const split = raw.milestones[index]?.status === 'Cancelled';
    return (
      <section aria-labelledby={`ff-${index}`} className={flow.card} data-testid="final-files" data-state="none">
        <h2 id={`ff-${index}`} className={flow.h2}>
          Final files
        </h2>
        <p className={flow.hint}>No final files: this milestone was {split ? 'split' : 'refunded'}.</p>
        {split ? <p className={flow.hint}>Agree which files are handed over as part of the split.</p> : null}
      </section>
    );
  }

  const runCheck = async (list: File[]) => {
    setChecking(true);
    const hashed: FileFingerprint[] = [];
    for (const f of list) hashed.push({ name: f.name, size: f.size, sha256: await hashFile(f) });
    setCheck({ at: Math.floor(Date.now() / 1000), results: checkDownload(promised, hashed) });
    setChecking(false);
  };
  const saveReceipt = () => {
    if (!accepted) return;
    const receipt = buildReceipt({
      fund: p.fundAddress,
      title: p.title,
      index,
      ...(ms.name ? { milestoneName: ms.name } : {}),
      accepted,
      ...(handover ? { handover } : {}),
      ...(p.release ? { release: p.release } : {}),
      ...(check ? { check } : {}),
      programId: getProgramId().toBase58(),
      cluster: 'devnet',
    });
    (p.onSave ?? saveJson)(receiptName(p.fundAddress, index), receipt);
  };

  if (status === 'waiting' || status === 'late') {
    const since = p.release?.releasedAt ? ` · since ${formatDeadline(p.release.releasedAt)}` : '';
    return (
      <section aria-labelledby={`ff-${index}`} className={`${flow.card} ${status === 'late' ? styles.finalLate : ''}`} data-testid="final-files" data-state={status}>
        <h2 id={`ff-${index}`} className={flow.h2}>
          Final files
        </h2>
        <p className={styles.finalTitle} role="status">
          {status === 'late' && p.release
            ? `Late · ${lateHours(p.release.releasedAt, now)} hours after release`
            : client
              ? `Waiting for final files from ${other}${since}`
              : `Waiting for your final files${since}`}
        </p>
        {promised.length ? (
          <>
            <p className={flow.hint}>{client ? `What ${other} promised before you accepted (Version ${accepted?.index}):` : 'What you promised (the accepted version):'}</p>
            <FileList files={promised} muted />
          </>
        ) : fixed ? (
          <p className={flow.hint}>{FIXED_IS_FINAL}</p>
        ) : null}
        {!client && p.handoverHref ? (
          <Link to={p.handoverHref} className={flow.primaryBtn} style={{ alignSelf: 'flex-start' }}>
            Hand over final files
          </Link>
        ) : null}
        {client ? <p className={flow.hint}>The time is a reminder only: N.E.D cannot make {other} hand over the files.</p> : null}
      </section>
    );
  }

  // handed over
  const compared = handover ? compareHandover(promised, handover.content.files) : [];
  const changed = compared.some((r) => r.state !== 'same');
  const byShaPromised = new Map(compared.filter((r) => r.state !== 'extra').map((r) => [r.file.sha256.toLowerCase(), r.state as 'same' | 'missing']));
  const extras = compared.filter((r) => r.state === 'extra').map((r) => r.file);
  return (
    <section aria-labelledby={`ff-${index}`} className={flow.card} data-testid="final-files" data-state="handed-over">
      <h2 id={`ff-${index}`} className={flow.h2}>
        Final files
      </h2>
      <p className={`${styles.finalTitle} ${styles.finalOk}`}>
        Handed over {handover?.time ? formatDeadline(handover.time) : ''} · for Version {accepted?.index ?? 1}
        {accepted?.time ? `, accepted ${formatDeadline(accepted.time)}` : ''}
      </p>
      <ul className={flow.list}>
        {(handover?.content.links ?? []).map((url) => {
          const d = downloadHref(url);
          return (
            <li key={url} className={styles.finalRow}>
              <Icon name="external" size={14} color="var(--caption)" />
              <span className={styles.linkText}>
                <span className={styles.linkLabel}>{linkLabel(url)}</span>
                <span className={styles.linkUrl}>{url}</span>
              </span>
              <a href={d.href} target="_blank" rel="noopener noreferrer" className={flow.primaryBtn} data-testid="download">
                Download
              </a>
            </li>
          );
        })}
      </ul>
      {handover?.content.note ? (
        <div>
          <div className={styles.sectionLabel}>{changed ? 'What changed, from ' + (client ? other : 'you') : `Note from ${from}`}</div>
          <blockquote className={styles.quote}>{handover.content.note}</blockquote>
        </div>
      ) : null}
      {promised.length ? (
        <div>
          <div className={styles.sectionLabel}>Promised before you accepted</div>
          <FileList files={promised} chips={(f) => ({ text: HANDOVER_CHIP[byShaPromised.get(f.sha256.toLowerCase()) ?? 'missing'], ok: byShaPromised.get(f.sha256.toLowerCase()) === 'same' })} />
          {extras.length ? <FileList files={extras} chips={() => ({ text: HANDOVER_CHIP.extra, ok: false })} /> : null}
        </div>
      ) : fixed ? (
        <p className={flow.hint}>{FIXED_IS_FINAL}</p>
      ) : null}

      {promised.length ? (
        <div className={styles.checkBox} data-testid="check-download">
          <div className={styles.sectionLabel}>Check your download</div>
          <p className={flow.hint}>Drop the files you downloaded. They are read on this computer and compared with the promised fingerprints; nothing is uploaded.</p>
          <FileDrop compact label="Drop files here or choose files" onFiles={(f) => void runCheck(f)} />
          <button type="button" className={styles.guideLink} onClick={() => folder.current?.click()}>
            Choose a folder
          </button>
          <input
            ref={folder}
            type="file"
            hidden
            multiple
            {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
            onChange={(e) => {
              const list = e.target.files ? [...e.target.files] : [];
              e.target.value = '';
              if (list.length) void runCheck(list);
            }}
          />
          {checking ? <p className={flow.hint}>Reading the files…</p> : null}
          {check ? (
            <ul className={flow.list} aria-live="polite" data-testid="check-results">
              {check.results.map((r) => (
                <li key={`${r.state}-${r.file.sha256}`} className={styles.finalRow}>
                  <span className={styles.linkText}>
                    <span className={styles.linkLabel}>{r.received?.name ?? r.file.name}</span>
                  </span>
                  <span className={`${styles.fileChip} ${r.state === 'same' ? styles.chipSame : styles.chipDiff}`}>{CHECK_CHIP[r.state]}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className={styles.finalActions}>
        <button type="button" className={flow.ghostBtn} onClick={saveReceipt} disabled={!accepted}>
          Save receipt
        </button>
        {!client && p.handoverHref ? (
          <Link to={p.handoverHref} className={flow.ghost}>
            Hand over again
          </Link>
        ) : null}
      </div>
      <p className={flow.hint}>{LINKS_EXPIRE(client ? other : 'you')}</p>
    </section>
  );
}
