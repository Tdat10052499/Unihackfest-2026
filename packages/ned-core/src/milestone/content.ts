// Brief and delivery content (build-plan B1, product-spec 5.1, decision D15). Only hashes go into the account:
// brief_hash = SHA-256(canonical brief JSON), evidence = SHA-256(canonical delivery JSON). The JSON itself travels
// encrypted in post_note data (notes.ts). Canonical = fixed key order, strings trimmed and NFC-normalised, empty
// list entries dropped, no whitespace, so every device computes the same bytes for the same content.
import { sha256 } from '@noble/hashes/sha2.js';
import { UserFacingError } from '../chain/errors.ts';
import { isFixedVersion } from './links.ts';
import { NOTE_MAX_LEN, NOTE_MAX_PARTS } from './layout.ts';

export const CONTENT_VERSION = 1;
export const LIMITS = {
  scopeChars: 1500,
  references: 5,
  criteriaPerMilestone: 6,
  links: 5,
  files: 10,
  noteChars: 500,
  /** Review note (D27): reason for requesting changes */
  reasonChars: 500,
  /** Not in the spec: keep one milestone name and one criterion to a readable line */
  nameChars: 80,
  criterionChars: 200,
  urlChars: 500,
  fileNameChars: 200,
  /** F1: the promised final files */
  finals: 10,
  finalNameChars: 120,
} as const;

/**
 * Largest delivery JSON that fits one encrypted note: NOTE_MAX_PARTS parts of NOTE_MAX_LEN bytes minus the per-part
 * overhead (version 1 + set ID 4 + nonce 24 + tag 16). Same number as notes.ts NOTE_MAX_PLAINTEXT, written here
 * because notes.ts imports this file.
 */
export const DELIVERY_MAX_BYTES = (NOTE_MAX_LEN - (1 + 4 + 24 + 16)) * NOTE_MAX_PARTS;

/** What the client writes (non-ui-plan 3.1 BriefDraft) */
export interface BriefDraft {
  scope: string;
  references: string[];
  /** Same length and order as the contract's milestones */
  milestones: { name: string; criteria: string[] }[];
}

export type DeliveryStage = 'revision' | 'handover';

/** A file named by its fingerprint: the files never leave the device, only these three fields do */
export interface FileFingerprint {
  name: string;
  size: number;
  sha256: string;
}

/** What the freelancer delivers (non-ui-plan 3.1 DeliveryDraft); files are hashed on the device, never uploaded */
export interface DeliveryDraft {
  links: string[];
  /** The preview or proof files (fingerprints only); for a hand-over, the final files handed over */
  files: FileFingerprint[];
  note: string;
  /**
   * F1: the promised list, the final files the freelancer will hand over after release (fingerprints only). Set on a
   * first delivery or a revision; left out of the canonical JSON when empty, so older deliveries hash as before.
   */
  finals?: FileFingerprint[];
  /**
   * D27: a revised version after changes were requested, or the final files after release. Absent for the first
   * delivery, and then left out of the canonical JSON, so the evidence hash of a normal delivery does not change.
   */
  stage?: DeliveryStage;
}

/** What the client writes when requesting changes (D27, review note kind 3) */
export interface ReviewDraft {
  /** Indices of the milestone's done-when points that are not met; at least one */
  unmet: number[];
  /** Up to 500 characters */
  reason: string;
}

/** The brief as hashed: the draft plus the on-chain title, so a brief cannot be reused for another contract title */
export interface Brief extends BriefDraft {
  v: number;
  title: string;
}
export interface Delivery extends DeliveryDraft {
  v: number;
}
export interface Review extends ReviewDraft {
  v: number;
}

const encoder = new TextEncoder();
const clean = (s: string) => String(s ?? '').normalize('NFC').trim();
const list = (items: string[] | undefined) => (items ?? []).map(clean).filter(Boolean);

export function normaliseBrief(title: string, draft: BriefDraft): Brief {
  return {
    v: CONTENT_VERSION,
    title: clean(title),
    scope: clean(draft.scope),
    references: list(draft.references),
    milestones: draft.milestones.map((m) => ({ name: clean(m.name), criteria: list(m.criteria) })),
  };
}

const fingerprint = (f: FileFingerprint): FileFingerprint => ({ name: clean(f.name), size: Math.floor(Number(f.size)), sha256: clean(f.sha256).toLowerCase() });

export function normaliseDelivery(draft: DeliveryDraft): Delivery {
  const finals = (draft.finals ?? []).map(fingerprint);
  return {
    v: CONTENT_VERSION,
    links: list(draft.links),
    files: (draft.files ?? []).map(fingerprint),
    note: clean(draft.note),
    ...(finals.length ? { finals } : {}),
    ...(draft.stage ? { stage: draft.stage } : {}),
  };
}

export function normaliseReview(draft: ReviewDraft): Review {
  return { v: CONTENT_VERSION, unmet: [...new Set(draft.unmet.map((i) => Math.floor(Number(i))))].sort((a, b) => a - b), reason: clean(draft.reason) };
}

// Fixed key order: build the JSON from explicit lists, never from Object.keys of the input
export function canonicalBrief(title: string, draft: BriefDraft): string {
  const b = normaliseBrief(title, draft);
  return JSON.stringify({
    v: b.v,
    title: b.title,
    scope: b.scope,
    references: b.references,
    milestones: b.milestones.map((m) => ({ name: m.name, criteria: m.criteria })),
  });
}

export function canonicalDelivery(draft: DeliveryDraft): string {
  const d = normaliseDelivery(draft);
  return JSON.stringify({
    v: d.v,
    links: d.links,
    files: d.files.map((f) => ({ name: f.name, size: f.size, sha256: f.sha256 })),
    // F1: only when non-empty, so every delivery made before keeps its canonical form and its on-chain fingerprint
    ...(d.finals?.length ? { finals: d.finals.map((f) => ({ name: f.name, size: f.size, sha256: f.sha256 })) } : {}),
    note: d.note,
    // only when present: a first delivery hashes exactly as before D27
    ...(d.stage ? { stage: d.stage } : {}),
  });
}

export function canonicalReview(draft: ReviewDraft): string {
  const r = normaliseReview(draft);
  return JSON.stringify({ v: r.v, unmet: r.unmet, reason: r.reason });
}

export const contentBytes = (canonicalJson: string) => encoder.encode(canonicalJson);
export const hashBytes = (bytes: Uint8Array): Uint8Array => sha256(bytes);
export const hashContent = (canonicalJson: string): Uint8Array => sha256(contentBytes(canonicalJson));
export const equalBytes = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((x, i) => x === b[i]);
export const briefHash = (title: string, draft: BriefDraft) => hashContent(canonicalBrief(title, draft));
export const deliveryEvidence = (draft: DeliveryDraft) => hashContent(canonicalDelivery(draft));
export const reviewHash = (draft: ReviewDraft) => hashContent(canonicalReview(draft));

export const PREVIEW_LINK_NEEDED = 'Add a preview link the client can open (Google Drive, Figma, YouTube, Loom or an image link).';
export const REVIEW_REASON_NEEDED = 'Say what is missing and what would make it acceptable.';
export const FINALS_NEEDED = 'List the final files you will hand over after release. Only their fingerprints are shared now.';
export const PREVIEW_IS_FINAL = 'The preview and the final files must be different files.';
export const HANDOVER_LINK_NEEDED = (client: string) => `Add the link where ${client} can download the final files.`;
export const HANDOVER_CHANGE_NOTE = 'Explain what changed from the files you promised.';
export const DELIVERY_TOO_LONG = 'The delivery is too long to save. Shorten the note or the file names.';
/** Shortest note that explains a hand-over that differs from the promised list */
export const HANDOVER_NOTE_MIN = 10;
export const DONE_WHEN_NEEDED = 'Add at least one done-when point, so the work can be checked.';
/** Shortest reason when the milestone has no done-when points to pick from */
export const REVIEW_REASON_MIN = 10;

export interface ContentProblem {
  field: string;
  message: string;
}

const chars = (s: string) => [...clean(s)].length;
const isUrl = (s: string) => /^https?:\/\/\S+$/i.test(clean(s));

/** Limits of build-plan B1; `milestoneCount` = number of milestones in the contract */
export function validateBrief(draft: BriefDraft, milestoneCount: number): ContentProblem[] {
  const out: ContentProblem[] = [];
  if (!clean(draft.scope)) out.push({ field: 'scope', message: 'Describe the work in the scope.' });
  if (chars(draft.scope) > LIMITS.scopeChars) out.push({ field: 'scope', message: `Keep the scope under ${LIMITS.scopeChars.toLocaleString('en-US')} characters.` });
  const refs = list(draft.references);
  if (refs.length > LIMITS.references) out.push({ field: 'references', message: `Add up to ${LIMITS.references} references.` });
  refs.forEach((r, i) => {
    if (!isUrl(r) || r.length > LIMITS.urlChars) out.push({ field: `references.${i}`, message: 'A reference must be a link starting with https://.' });
  });
  if (draft.milestones.length !== milestoneCount) out.push({ field: 'milestones', message: 'Every milestone needs a name and its done-when list.' });
  draft.milestones.forEach((m, i) => {
    if (!clean(m.name)) out.push({ field: `milestones.${i}.name`, message: `Name milestone ${i + 1}.` });
    if (chars(m.name) > LIMITS.nameChars) out.push({ field: `milestones.${i}.name`, message: `Keep the name of milestone ${i + 1} under ${LIMITS.nameChars} characters.` });
    const criteria = list(m.criteria);
    // R1: only drafts are checked here; a brief already on Solana with an empty list still decodes
    if (!criteria.length) out.push({ field: `milestones.${i}.criteria`, message: DONE_WHEN_NEEDED });
    if (criteria.length > LIMITS.criteriaPerMilestone) out.push({ field: `milestones.${i}.criteria`, message: `Add up to ${LIMITS.criteriaPerMilestone} done-when points per milestone.` });
    criteria.forEach((c, j) => {
      if (chars(c) > LIMITS.criterionChars) out.push({ field: `milestones.${i}.criteria.${j}`, message: `Keep each done-when point under ${LIMITS.criterionChars} characters.` });
    });
  });
  return out;
}

/**
 * R1 + F1 rules of a delivery draft:
 * - first delivery or revision: at least one preview link; the promised list of final files (1–10, unique, names up
 *   to 120 characters) unless a link is a fixed version (a Figma version or a Git commit); no file both preview and
 *   promised;
 * - hand-over (after release): a link where the client downloads; `files` are the final files handed over; when they
 *   differ from `acceptedFinals` (the promised list of the accepted version), a note of at least 10 characters.
 * Only drafts are checked: decoding and the canonical JSON of older deliveries do not change.
 */
export function validateDelivery(draft: DeliveryDraft, acceptedFinals?: readonly FileFingerprint[], client = 'the client'): ContentProblem[] {
  const out: ContentProblem[] = [];
  const links = list(draft.links);
  const files = draft.files ?? [];
  const finals = draft.finals ?? [];
  const checkFiles = (field: 'files' | 'finals', items: readonly FileFingerprint[], nameChars: number) =>
    items.forEach((f, i) => {
      if (!/^[0-9a-f]{64}$/i.test(clean(f.sha256))) out.push({ field: `${field}.${i}`, message: 'A file fingerprint is missing.' });
      if (!clean(f.name) || chars(f.name) > nameChars) out.push({ field: `${field}.${i}`, message: 'A file name is missing or too long.' });
      if (!Number.isFinite(Number(f.size)) || Number(f.size) < 0) out.push({ field: `${field}.${i}`, message: 'A file size is not valid.' });
    });

  if (draft.stage === 'handover') {
    if (!links.length) out.push({ field: 'links', message: HANDOVER_LINK_NEEDED(client) });
    // nothing promised (an older delivery or a fixed-version link): nothing to compare, no reason needed
    if (acceptedFinals?.length) {
      const changed = compareHandover(acceptedFinals, files).some((r) => r.state !== 'same');
      if (changed && chars(draft.note) < HANDOVER_NOTE_MIN) out.push({ field: 'note', message: HANDOVER_CHANGE_NOTE });
    }
  } else {
    if (!links.length) out.push({ field: 'links', message: PREVIEW_LINK_NEEDED });
    if (!finals.length && !links.some(isFixedVersion)) out.push({ field: 'finals', message: FINALS_NEEDED });
    if (finals.length > LIMITS.finals) out.push({ field: 'finals', message: `List up to ${LIMITS.finals} final files.` });
    const shas = finals.map((f) => clean(f.sha256).toLowerCase());
    if (new Set(shas).size !== shas.length) out.push({ field: 'finals', message: 'A final file is listed twice.' });
    const preview = new Set(files.map((f) => clean(f.sha256).toLowerCase()));
    if (shas.some((h) => preview.has(h))) out.push({ field: 'finals', message: PREVIEW_IS_FINAL });
    checkFiles('finals', finals, LIMITS.finalNameChars);
  }
  if (links.length > LIMITS.links) out.push({ field: 'links', message: `Add up to ${LIMITS.links} links.` });
  links.forEach((l, i) => {
    if (!isUrl(l) || l.length > LIMITS.urlChars) out.push({ field: `links.${i}`, message: 'A link must start with https://.' });
  });
  if (files.length > LIMITS.files) out.push({ field: 'files', message: `Add up to ${LIMITS.files} files.` });
  checkFiles('files', files, LIMITS.fileNameChars);
  if (chars(draft.note) > LIMITS.noteChars) out.push({ field: 'note', message: `Keep the note under ${LIMITS.noteChars} characters.` });
  if (contentBytes(canonicalDelivery(draft)).length > DELIVERY_MAX_BYTES) out.push({ field: 'note', message: DELIVERY_TOO_LONG });
  return out;
}

export type FileMatch = 'same' | 'missing' | 'extra' | 'different';
export interface FileResult {
  state: FileMatch;
  /** the promised file (same, missing, different) or the received one (extra) */
  file: FileFingerprint;
  /** different: the received file with the promised name and another fingerprint */
  received?: FileFingerprint;
}

const sha = (f: FileFingerprint) => clean(f.sha256).toLowerCase();

/**
 * F1: the hand-over against the promised list, by fingerprint (the name is only shown). Each promised file is
 * 'same' or 'missing'; each received file that is not promised is 'extra'.
 */
export function compareHandover(promised: readonly FileFingerprint[], received: readonly FileFingerprint[]): FileResult[] {
  const got = new Set(received.map(sha));
  const want = new Set(promised.map(sha));
  return [
    ...promised.map((f): FileResult => ({ state: got.has(sha(f)) ? 'same' : 'missing', file: f })),
    ...received.filter((f) => !want.has(sha(f))).map((f): FileResult => ({ state: 'extra', file: f })),
  ];
}

/**
 * F1: files the client downloaded and hashed on their device, against the promised list. As compareHandover, plus
 * 'different' when a received file carries a promised name with another fingerprint (that pair is not also missing
 * and extra).
 */
export function checkDownload(promised: readonly FileFingerprint[], hashed: readonly FileFingerprint[]): FileResult[] {
  const got = new Set(hashed.map(sha));
  const want = new Set(promised.map(sha));
  const used = new Set<FileFingerprint>();
  const out: FileResult[] = promised.map((f) => {
    if (got.has(sha(f))) return { state: 'same', file: f };
    const sameName = hashed.find((h) => !used.has(h) && !want.has(sha(h)) && clean(h.name) === clean(f.name));
    if (sameName) {
      used.add(sameName);
      return { state: 'different', file: f, received: sameName };
    }
    return { state: 'missing', file: f };
  });
  for (const h of hashed) if (!want.has(sha(h)) && !used.has(h)) out.push({ state: 'extra', file: h });
  return out;
}

/**
 * `criteriaCount` = number of done-when points of the milestone in the brief. With points, the client picks at least
 * one that is not met. Without points (an older brief), no point can be picked, so the reason carries the request:
 * 10–500 characters after trimming (R1).
 */
export function validateReview(draft: ReviewDraft, criteriaCount: number): ContentProblem[] {
  const out: ContentProblem[] = [];
  const unmet = draft.unmet ?? [];
  if (criteriaCount === 0) {
    if (unmet.length) out.push({ field: 'unmet', message: 'A done-when point is not valid.' });
    if (chars(draft.reason) < REVIEW_REASON_MIN) out.push({ field: 'reason', message: REVIEW_REASON_NEEDED });
  } else {
    if (!unmet.length) out.push({ field: 'unmet', message: 'Choose at least one done-when point that is not met.' });
    if (unmet.some((i) => !Number.isInteger(i) || i < 0 || i >= criteriaCount)) out.push({ field: 'unmet', message: 'A done-when point is not valid.' });
  }
  if (chars(draft.reason) > LIMITS.reasonChars) out.push({ field: 'reason', message: `Keep the reason under ${LIMITS.reasonChars} characters.` });
  return out;
}

/** Throws the first problem as a user-facing sentence */
export function assertContent(problems: ContentProblem[]): void {
  if (problems.length) throw new UserFacingError(problems[0].message);
}

/** Parses decrypted JSON back into a Brief / Delivery; null if it is not one */
export function parseBrief(json: string): Brief | null {
  try {
    const o = JSON.parse(json);
    if (o?.v !== CONTENT_VERSION || typeof o.title !== 'string' || typeof o.scope !== 'string' || !Array.isArray(o.milestones)) return null;
    return o as Brief;
  } catch {
    return null;
  }
}

export function parseDelivery(json: string): Delivery | null {
  try {
    const o = JSON.parse(json);
    if (o?.v !== CONTENT_VERSION || !Array.isArray(o.links) || !Array.isArray(o.files) || typeof o.note !== 'string') return null;
    if (o.stage !== undefined && o.stage !== 'revision' && o.stage !== 'handover') return null;
    if (o.finals !== undefined && !Array.isArray(o.finals)) return null;
    return o as Delivery;
  } catch {
    return null;
  }
}

export function parseReview(json: string): Review | null {
  try {
    const o = JSON.parse(json);
    if (o?.v !== CONTENT_VERSION || !Array.isArray(o.unmet) || !o.unmet.every(Number.isInteger) || typeof o.reason !== 'string') return null;
    return o as Review;
  } catch {
    return null;
  }
}
