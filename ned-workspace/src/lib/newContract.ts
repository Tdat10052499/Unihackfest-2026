// Form model of /new (W3). Pure, so the checks are tested: the draft goes through the same core checks as the phone
// (rules.validateDraft for create_fund, content.validateBrief for the B1 limits), plus the add-row checks of the
// reference and "Done when" inputs.
import { LIMITS, validateBrief, type BriefDraft } from '@ned/core/milestone/content.ts';
import { MAX_MILESTONES } from '@ned/core/milestone/layout.ts';
import { validateDraft, type ContractDraft } from '@ned/core/milestone/rules.ts';

export const REVIEWS: { label: string; seconds: number }[] = [
  { label: '1 min (devnet demo)', seconds: 60 },
  { label: '3 days', seconds: 3 * 86_400 },
  { label: '7 days', seconds: 7 * 86_400 },
];

export interface MilestoneForm {
  /** stable key for the list animation */
  id: number;
  name: string;
  amount: string;
  /** <input type="datetime-local"> value, device time zone */
  submitBy: string;
  reviewSeconds: number;
  criteria: string[];
  /** text of the "Add" input */
  draft: string;
}

export interface ContractForm {
  freelancer: string | null;
  title: string;
  scope: string;
  references: string[];
  milestones: MilestoneForm[];
}

export type Problem = { field: string; message: string };

const pad = (n: number) => String(n).padStart(2, '0');

/** unix seconds → "2026-10-12T18:00" in the device time zone */
export function toLocalInput(unix: number): string {
  const d = new Date(unix * 1000);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "2026-10-12T18:00" (device time zone) → unix seconds, NaN when empty or invalid */
export function fromLocalInput(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return NaN;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? Math.floor(t / 1000) : NaN;
}

/** A new milestone: due (index + 1) weeks from now at 18:00, 3 days of review */
export function newMilestone(id: number, index: number, now: number): MilestoneForm {
  const d = new Date((now + (index + 1) * 7 * 86_400) * 1000);
  d.setHours(18, 0, 0, 0);
  return { id, name: '', amount: '', submitBy: toLocalInput(Math.floor(d.getTime() / 1000)), reviewSeconds: REVIEWS[1].seconds, criteria: [], draft: '' };
}

export const canAddMilestone = (form: ContractForm) => form.milestones.length < MAX_MILESTONES;

export const titleBytes = (title: string) => new TextEncoder().encode(title.trim()).length;

export function brief(form: ContractForm): BriefDraft {
  return {
    scope: form.scope,
    references: form.references,
    milestones: form.milestones.map((m) => ({ name: m.name, criteria: m.criteria })),
  };
}

/** The create_fund draft, or null until a freelancer is chosen */
export function draft(form: ContractForm): (ContractDraft & { brief: BriefDraft }) | null {
  if (!form.freelancer) return null;
  return {
    freelancer: form.freelancer,
    title: form.title.trim(),
    milestones: form.milestones.map((m) => ({ amountUsdc: m.amount, submitBy: fromLocalInput(m.submitBy), reviewSeconds: m.reviewSeconds })),
    brief: brief(form),
  };
}

/** Every reason Create is not possible yet, in form order (the same checks as the phone) */
export function problems(form: ContractForm, now: number, wallet?: string): Problem[] {
  const out: Problem[] = [];
  if (!form.freelancer) out.push({ field: 'freelancer', message: 'Choose the freelancer first.' });
  if (!form.title.trim()) out.push({ field: 'title', message: 'Give the contract a title.' });
  const d = draft(form);
  const onChain = d ? validateDraft(d, now, wallet).errors : [];
  const content = validateBrief(brief(form), form.milestones.length);
  const all = [...out, ...onChain, ...content];
  // one line per field, in the order of the page
  const order = (f: string) => (f === 'freelancer' ? 0 : f === 'title' ? 1 : f.startsWith('scope') ? 2 : f.startsWith('references') ? 3 : f.startsWith('milestones') ? 4 : 5);
  const seen = new Set<string>();
  return all
    .filter((p) => (seen.has(p.field) ? false : (seen.add(p.field), true)))
    .sort((a, b) => order(a.field) - order(b.field) || a.field.localeCompare(b.field, 'en', { numeric: true }));
}

const isUrl = (s: string) => /^https?:\/\/\S+$/i.test(s);

/** Adds a reference link; returns the new list or the reason it was not added */
export function addReference(list: string[], input: string): { list: string[] } | { error: string } {
  const url = input.trim();
  if (!url) return { error: 'Paste a link first.' };
  if (!isUrl(url) || url.length > LIMITS.urlChars) return { error: 'A reference must be a link starting with https://.' };
  if (list.length >= LIMITS.references) return { error: `Add up to ${LIMITS.references} references.` };
  if (list.includes(url)) return { error: 'This link is already in the list.' };
  return { list: [...list, url] };
}

/** Adds a "Done when" point to a milestone */
export function addCriterion(list: string[], input: string): { list: string[] } | { error: string } {
  const text = input.trim();
  if (!text) return { error: 'Write something you can check first.' };
  if ([...text].length > LIMITS.criterionChars) return { error: `Keep each done-when point under ${LIMITS.criterionChars} characters.` };
  if (list.length >= LIMITS.criteriaPerMilestone) return { error: `Add up to ${LIMITS.criteriaPerMilestone} done-when points per milestone.` };
  if (list.includes(text)) return { error: 'This point is already in the list.' };
  return { list: [...list, text] };
}
