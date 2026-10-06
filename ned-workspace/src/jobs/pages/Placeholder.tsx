// Placeholder pages of the Jobs route tree (S5 frame only; Overview and Find jobs come next, then S6).
import hub from '../hub.module.css';
import { SectionHeading } from '../components/SectionHeading.tsx';

export function JobsPlaceholder({ title }: { title: string }) {
  return (
    <div className={hub.container} style={{ paddingTop: 56, paddingBottom: 72 }}>
      <SectionHeading title={title} sub="This page is being built." />
    </div>
  );
}
