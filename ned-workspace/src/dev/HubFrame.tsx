// Dev only (VITE_DEV_TOOLS=1): the Jobs hub v4 frame (header, footer, motion) with a fixture viewer, for screenshots
// without a Google sign-in. /dev/hub?as=guest|client|vn[&cta=1]. Nothing here signs or reads the chain.
import { useSearchParams } from 'react-router';
import { CLIENT } from './states.ts';
import { FOOT, JobsFooter, JobsHeader } from '../jobs/JobsLayout.tsx';
import { HubButton, Reveal, SectionHeading } from '../jobs/components/index.ts';
import hub from '../jobs/hub.module.css';
import '../jobs/motion.css';

export function HubFrame() {
  const [params] = useSearchParams();
  const as = params.get('as') ?? 'client';
  const vn = as === 'vn';
  const wallet = as === 'guest' ? null : CLIENT.toBase58();
  return (
    <div className={`${hub.hub} hb-root`}>
      <JobsHeader wallet={wallet} name={wallet ? '@mia' : null} vn={vn} status={wallet ? 'ready' : 'signed-out'} next="%2Fjobs" onOpenWallet={() => {}} />
      <main id="main" className={hub.main}>
        <div className={hub.container} style={{ paddingTop: 72, paddingBottom: 72, display: 'flex', flexDirection: 'column', gap: 48 }}>
          <SectionHeading level={1} size="page" title="Find jobs, " tone="already funded" sub="Dev frame for the v4 header, footer and motion." />
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Reveal key={i} style={{ height: 220, borderRadius: 22, background: '#F5F5F7', display: 'grid', placeItems: 'center', color: '#6B6B76' }}>
              Section {i}
            </Reveal>
          ))}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <HubButton variant="purple" arrow>
              Lock budget
            </HubButton>
            <HubButton variant="dark">Find jobs</HubButton>
            <HubButton variant="white">White</HubButton>
            <HubButton variant="ghost">Ghost</HubButton>
          </div>
          <p style={{ margin: 0, color: '#6B6B76' }}>{vn ? FOOT.vn : FOOT.intl}</p>
        </div>
      </main>
      <JobsFooter vn={vn} client={Boolean(wallet) && !vn} cta={params.get('cta') === '1'} />
    </div>
  );
}
