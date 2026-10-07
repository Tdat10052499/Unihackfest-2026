// Category tile (appendix H.8): icon on its tint, label and the live count of open jobs. One link to Find jobs with
// the category in the URL.
import { Link } from 'react-router';
import { JOB_CATEGORIES } from '@ned/core/jobs/taxonomy.ts';
import { filtersToQuery } from '@ned/core/jobs/search.ts';
import { HubIcon } from './HubIcon.tsx';
import { CATEGORY_LOOK, openJobsLabel } from './categoryLook.ts';

export { CATEGORY_LOOK, openJobsLabel };
import hub from '../hub.module.css';
import styles from './components.module.css';


export function CategoryTile({ category, count, selected = false, loading = false }: { category: number; count: number; selected?: boolean; loading?: boolean }) {
  const cat = JOB_CATEGORIES[category];
  const look = CATEGORY_LOOK[category] ?? CATEGORY_LOOK[7];
  if (!cat) return null;
  const query = filtersToQuery({ cat: cat.id });
  return (
    <Link
      to={`/jobs/find?${query}`}
      className={`${styles.tile} ${hub.liftSmall} ${selected ? styles.tileOn : ''}`}
      aria-label={loading ? cat.label : `${cat.label}, ${openJobsLabel(count)}`}
      aria-current={selected ? 'true' : undefined}
    >
      <span className={styles.tileIcon} style={{ background: look.tint }}>
        <HubIcon name={look.icon} size={20} width={2} color={look.ink} />
      </span>
      <span>
        <span className={styles.tileLabel}>{cat.label}</span>
        <span className={`${styles.tileCount} ${count === 0 ? styles.tileEmpty : ''}`}>{loading ? '…' : openJobsLabel(count)}</span>
      </span>
    </Link>
  );
}
