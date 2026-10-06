// Category tile (appendix H.8): icon on its tint, label and the live count of open jobs. One link to Find jobs with
// the category in the URL.
import { Link } from 'react-router';
import { JOB_CATEGORIES } from '@ned/core/jobs/taxonomy.ts';
import { filtersToQuery } from '@ned/core/jobs/search.ts';
import { HubIcon, type HubIconName } from './HubIcon.tsx';
import hub from '../hub.module.css';
import styles from './components.module.css';

/** Icon, ink and tint per category index (taxonomy order) */
export const CATEGORY_LOOK: readonly { icon: HubIconName; ink: string; tint: string }[] = [
  { icon: 'design', ink: '#7B2FBE', tint: '#F2EAFB' },
  { icon: 'development', ink: '#C2410C', tint: '#FFE4CF' },
  { icon: 'writing', ink: '#127A3A', tint: '#E7F6EC' },
  { icon: 'marketing', ink: '#B4235A', tint: '#FCE7EF' },
  { icon: 'video', ink: '#3730A3', tint: '#EEEFFE' },
  { icon: 'data', ink: '#0E7490', tint: '#E0F4F8' },
  { icon: 'admin', ink: '#8A5300', tint: '#FFF5E1' },
  { icon: 'other', ink: '#4B4B57', tint: '#EFEFF3' },
];

export const openJobsLabel = (n: number) => (n === 0 ? 'No open jobs yet' : n === 1 ? '1 open job' : `${n} open jobs`);

export function CategoryTile({ category, count, selected = false }: { category: number; count: number; selected?: boolean }) {
  const cat = JOB_CATEGORIES[category];
  const look = CATEGORY_LOOK[category] ?? CATEGORY_LOOK[7];
  if (!cat) return null;
  const query = filtersToQuery({ cat: cat.id });
  return (
    <Link
      to={`/jobs/find?${query}`}
      className={`${styles.tile} ${hub.liftSmall} ${selected ? styles.tileOn : ''}`}
      aria-label={`${cat.label}, ${openJobsLabel(count)}`}
      aria-current={selected ? 'true' : undefined}
    >
      <span className={styles.tileIcon} style={{ background: look.tint }}>
        <HubIcon name={look.icon} size={20} width={2} color={look.ink} />
      </span>
      <span>
        <span className={styles.tileLabel}>{cat.label}</span>
        <span className={`${styles.tileCount} ${count === 0 ? styles.tileEmpty : ''}`}>{openJobsLabel(count)}</span>
      </span>
    </Link>
  );
}
