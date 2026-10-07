// Final files after release (F1; prompts-final-files.md, D27 amended 7 Oct). The freelancer promises a list of final
// files at submit (fingerprints only), the client accepts a version, and after release the freelancer hands the files
// over with a link. Pure helpers: which version was accepted, the hand-over status (a soft 48-hour reminder; nothing is
// enforced: once released, the money has left the program), the client's receipt, and the close warning.
import type { FundAccount } from './decode.ts';
import type { DeliveryDraft, FileFingerprint, FileResult } from './content.ts';
import { handoverSent, type DeliveryEntry, type MilestoneHistory } from './notes.ts';
import type { ReleaseRecord } from './records.ts';

/** "Late" after 48 hours: a reminder for both sides, never a rule of the program */
export const HANDOVER_SOFT_SECS = 172_800;

export interface AcceptedVersion {
  /** 1-based, as "Version N" on the Review page */
  index: number;
  time?: number;
  signature: string;
  content: DeliveryDraft;
}

/**
 * The version the client accepted: the last delivery that is not a hand-over. Revisions are only possible before
 * release, so after release this is the version the money was released for.
 */
export function acceptedVersion(history: MilestoneHistory | undefined): AcceptedVersion | null {
  const versions = (history?.deliveries ?? []).filter((d) => d.stage !== 'handover');
  const last = versions.at(-1);
  if (!last) return null;
  return { index: versions.length, ...(last.time ? { time: last.time } : {}), signature: last.signature, content: last.content };
}

export type HandoverStatus = 'not-due' | 'waiting' | 'late' | 'handed-over' | 'not-applicable';

/**
 * Where the hand-over of milestone `index` stands.
 * - not-applicable: Refunded or Cancelled (refund, return to client, split): no files are owed;
 * - not-due: before release;
 * - handed-over: a hand-over note exists;
 * - waiting: released, no hand-over yet; late: 48 hours after the release time. Without a release time (the release
 *   transaction was not read) there is no countdown, so it stays waiting.
 */
export function handoverStatus(fund: FundAccount, index: number, history: MilestoneHistory | undefined, releaseTime: number | undefined, now: number): HandoverStatus {
  const m = fund.milestones[index];
  if (!m) return 'not-applicable';
  if (m.status === 'Refunded' || m.status === 'Cancelled') return 'not-applicable';
  if (m.status !== 'Released') return 'not-due';
  if (handoverSent(history)) return 'handed-over';
  if (releaseTime && now >= releaseTime + HANDOVER_SOFT_SECS) return 'late';
  return 'waiting';
}

/** The release of one milestone from the contract's release records (records.ts readFundReleases), when read */
export function releaseOf(records: readonly ReleaseRecord[], fund: string, index: number): ReleaseRecord | undefined {
  return records.find((r) => r.fund === fund && r.index === index);
}

export const RECEIPT_LINE = "Built on the client's device. Not legal advice.";

export interface ReceiptInput {
  fund: string;
  title: string;
  /** 0-based index; the receipt shows it 1-based */
  index: number;
  milestoneName?: string;
  accepted: AcceptedVersion;
  handover?: DeliveryEntry;
  release?: Pick<ReleaseRecord, 'releasedAt' | 'signature' | 'by'>;
  /** the client's local check of downloaded files, if done */
  check?: { at: number; results: FileResult[] };
  programId: string;
  cluster: string;
}

/**
 * The client's receipt for a hand-over: a plain object the app saves as JSON on the client's device. It holds what
 * was promised, what was handed over and when, the release, and the local check. Nothing here goes on-chain.
 */
export function buildReceipt(r: ReceiptInput) {
  const files = (list: readonly FileFingerprint[] | undefined) => (list ?? []).map((f) => ({ name: f.name, size: f.size, sha256: f.sha256 }));
  return {
    contract: { address: r.fund, title: r.title, milestone: r.index + 1, ...(r.milestoneName ? { milestoneName: r.milestoneName } : {}) },
    acceptedVersion: {
      version: r.accepted.index,
      time: r.accepted.time ?? null,
      signature: r.accepted.signature,
      previewLinks: [...r.accepted.content.links],
    },
    promised: files(r.accepted.content.finals),
    handover: r.handover
      ? { links: [...r.handover.content.links], files: files(r.handover.content.files), note: r.handover.content.note, time: r.handover.time ?? null, signature: r.handover.signature }
      : null,
    release: r.release ? { time: r.release.releasedAt || null, signature: r.release.signature, by: r.release.by ?? null } : null,
    check: r.check ? { at: r.check.at, results: r.check.results.map((x) => ({ state: x.state, name: x.file.name, sha256: x.file.sha256, ...(x.received ? { receivedSha256: x.received.sha256 } : {}) })) } : null,
    program: { id: r.programId, cluster: r.cluster },
    note: RECEIPT_LINE,
  };
}

/** Released milestones with no hand-over yet (0-based): the Close sheet warns about them. canClose does not change */
export function closeWarnings(fund: FundAccount, histories: Record<number, MilestoneHistory | undefined>): number[] {
  return fund.milestones.flatMap((m, i) => (m.status === 'Released' && !handoverSent(histories[i]) ? [i] : []));
}
