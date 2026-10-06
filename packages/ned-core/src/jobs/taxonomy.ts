// Job categories and skills (funded-jobs-plan.md section 6.1). APPEND ONLY: listings store these indices on-chain
// (category u8 at offset 42, skills u64 bitmask at 43), so never reorder, remove or reuse an index. `id` is the URL
// slug used by search.ts; never change an id either, because shared links hold it.
import { JOB_CATEGORY_COUNT } from './layout.ts';

export interface JobCategory {
  index: number;
  id: string;
  label: string;
}

export interface JobSkill {
  /** Bit position in the skills mask (0–63) */
  index: number;
  id: string;
  label: string;
  /** JobCategory.index */
  category: number;
}

export const JOB_CATEGORIES: readonly JobCategory[] = [
  { index: 0, id: 'design', label: 'Design' },
  { index: 1, id: 'development', label: 'Development' },
  { index: 2, id: 'writing', label: 'Writing & Translation' },
  { index: 3, id: 'marketing', label: 'Marketing' },
  { index: 4, id: 'video', label: 'Video & Animation' },
  { index: 5, id: 'data', label: 'Data & AI' },
  { index: 6, id: 'admin', label: 'Admin & Support' },
  { index: 7, id: 'other', label: 'Other' },
];

const s = (index: number, id: string, label: string, category: number): JobSkill => ({ index, id, label, category });

export const JOB_SKILLS: readonly JobSkill[] = [
  // Design
  s(0, 'logo-brand', 'Logo & brand', 0),
  s(1, 'ui-ux', 'UI/UX', 0),
  s(2, 'illustration', 'Illustration', 0),
  s(3, 'figma', 'Figma', 0),
  s(4, 'web-design', 'Web design', 0),
  s(5, 'print', 'Print & packaging', 0),
  // Development
  s(6, 'frontend', 'Web front end', 1),
  s(7, 'backend', 'Back end', 1),
  s(8, 'mobile', 'Mobile', 1),
  s(9, 'solana', 'Solana programs', 1),
  s(10, 'wordpress', 'WordPress', 1),
  s(11, 'automation', 'Scripts & automation', 1),
  // Writing & Translation
  s(12, 'en-vi', 'English ↔ Vietnamese', 2),
  s(13, 'copywriting', 'Copywriting', 2),
  s(14, 'technical-writing', 'Technical writing', 2),
  s(15, 'blog', 'Blog & articles', 2),
  s(16, 'proofreading', 'Proofreading', 2),
  // Marketing
  s(17, 'social-media', 'Social media', 3),
  s(18, 'seo', 'SEO', 3),
  s(19, 'ads', 'Paid ads', 3),
  s(20, 'email', 'Email marketing', 3),
  s(21, 'community', 'Community', 3),
  // Video & Animation
  s(22, 'video-editing', 'Video editing', 4),
  s(23, 'motion', 'Motion graphics', 4),
  s(24, '3d', '3D', 4),
  s(25, 'subtitles', 'Subtitles', 4),
  // Data & AI
  s(26, 'data-analysis', 'Data analysis', 5),
  s(27, 'dashboards', 'Dashboards', 5),
  s(28, 'machine-learning', 'Machine learning', 5),
  s(29, 'data-entry', 'Data entry', 5),
  s(30, 'prompting', 'AI prompts & workflows', 5),
  // Admin & Support
  s(31, 'virtual-assistant', 'Virtual assistant', 6),
  s(32, 'customer-support', 'Customer support', 6),
  s(33, 'research', 'Research', 6),
  s(34, 'spreadsheets', 'Spreadsheets', 6),
  // Other
  s(35, 'audio', 'Audio & voice', 7),
  s(36, 'music', 'Music', 7),
  s(37, 'photography', 'Photography', 7),
  s(38, 'consulting', 'Consulting', 7),
  s(39, 'teaching', 'Tutoring', 7),
];

if (JOB_CATEGORIES.length !== JOB_CATEGORY_COUNT) throw new Error('JOB_CATEGORIES must match JOB_CATEGORY_COUNT');
if (JOB_SKILLS.length > 64) throw new Error('At most 64 skills fit the u64 mask');

export const categoryById = (id: string) => JOB_CATEGORIES.find((c) => c.id === id);
export const categoryLabel = (index: number) => JOB_CATEGORIES[index]?.label ?? 'Other';
export const skillById = (id: string) => JOB_SKILLS.find((k) => k.id === id);
export const skillsOfCategory = (category: number) => JOB_SKILLS.filter((k) => k.category === category);

/** u64 mask from skill indices; throws on an index outside 0–63 */
export function skillsMask(indices: readonly number[]): bigint {
  let mask = 0n;
  for (const i of indices) {
    if (!Number.isInteger(i) || i < 0 || i > 63) throw new Error(`Skill index ${i} is out of range`);
    mask |= 1n << BigInt(i);
  }
  return mask;
}

/** Skill indices set in a mask, ascending */
export function skillsFromMask(mask: bigint): number[] {
  const out: number[] = [];
  for (let i = 0; i < 64; i++) if ((mask >> BigInt(i)) & 1n) out.push(i);
  return out;
}

/** Known skills of a listing (unknown bits from a newer app version are skipped) */
export const listingSkills = (mask: bigint): JobSkill[] => skillsFromMask(mask).flatMap((i) => JOB_SKILLS.filter((k) => k.index === i));
