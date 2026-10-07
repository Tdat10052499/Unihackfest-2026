// Brief and delivery content (build-plan B1, product-spec 5.1, decision D15). Only hashes go into the account:
// brief_hash = SHA-256(canonical brief JSON), evidence = SHA-256(canonical delivery JSON). The JSON itself travels
// encrypted in post_note data (notes.ts). Canonical = fixed key order, strings trimmed and NFC-normalised, empty
// list entries dropped, no whitespace, so every device computes the same bytes for the same content.
import { sha256 } from '@noble/hashes/sha2.js';
import { UserFacingError } from '../chain/errors.ts';

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
} as const;

/** What the client writes (non-ui-plan 3.1 BriefDraft) */
export interface BriefDraft {
  scope: string;
  references: string[];
  /** Same length and order as the contract's milestones */
  milestones: { name: string; criteria: string[] }[];
}

export type DeliveryStage = 'revision' | 'handover';

/** What the freelancer delivers (non-ui-plan 3.1 DeliveryDraft); files are hashed on the device, never uploaded */
export interface DeliveryDraft {
  links: string[];
  files: { name: string; size: number; sha256: string }[];
  note: string;
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

export function normaliseDelivery(draft: DeliveryDraft): Delivery {
  return {
    v: CONTENT_VERSION,
    links: list(draft.links),
    files: (draft.files ?? []).map((f) => ({ name: clean(f.name), size: Math.floor(Number(f.size)), sha256: clean(f.sha256).toLowerCase() })),
    note: clean(draft.note),
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
 * R1: a first delivery or a revised version is reviewed through a preview, so it needs at least one link the client
 * can open; the hand-over after release keeps "a link or a file". Only the draft check changes: decoding, the
 * canonical JSON and deliveryEvidence are as before, so older files-only deliveries still decode and match.
 */
export function validateDelivery(draft: DeliveryDraft): ContentProblem[] {
  const out: ContentProblem[] = [];
  const links = list(draft.links);
  const files = draft.files ?? [];
  if (draft.stage === 'handover') {
    if (!links.length && !files.length) out.push({ field: 'links', message: 'Add a link or a file to your delivery.' });
  } else if (!links.length) out.push({ field: 'links', message: PREVIEW_LINK_NEEDED });
  if (links.length > LIMITS.links) out.push({ field: 'links', message: `Add up to ${LIMITS.links} links.` });
  links.forEach((l, i) => {
    if (!isUrl(l) || l.length > LIMITS.urlChars) out.push({ field: `links.${i}`, message: 'A link must start with https://.' });
  });
  if (files.length > LIMITS.files) out.push({ field: 'files', message: `Add up to ${LIMITS.files} files.` });
  files.forEach((f, i) => {
    if (!/^[0-9a-f]{64}$/i.test(clean(f.sha256))) out.push({ field: `files.${i}`, message: 'A file fingerprint is missing.' });
    if (!clean(f.name) || chars(f.name) > LIMITS.fileNameChars) out.push({ field: `files.${i}`, message: 'A file name is missing or too long.' });
    if (!Number.isFinite(Number(f.size)) || Number(f.size) < 0) out.push({ field: `files.${i}`, message: 'A file size is not valid.' });
  });
  if (chars(draft.note) > LIMITS.noteChars) out.push({ field: 'note', message: `Keep the note under ${LIMITS.noteChars} characters.` });
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
