// Dev only (VITE_DEV_TOOLS=1): the Jobs hub v4 frame (header, footer, motion) with a fixture viewer, for screenshots
// without a Google sign-in. /dev/hub?as=guest|client|vn[&cta=1][&page=overview|find][&state=loading|error|empty]. Nothing
// here signs or reads the chain; page=overview fills the real Overview view with the board's sample jobs.
import { useSearchParams } from 'react-router';
import { CLIENT } from './states.ts';
import { HUB_JOBS, HUB_NAMES, HUB_NOW, hubMine } from './hubFixtures.ts';
import { FindView } from '../jobs/pages/Find.tsx';
import { FREELANCER } from './states.ts';
import { OverviewView } from '../jobs/pages/Overview.tsx';
import { FOOT, JobsFooter, JobsHeader } from '../jobs/JobsLayout.tsx';
import { HubButton, Reveal, SectionHeading } from '../jobs/components/index.ts';
import hub from '../jobs/hub.module.css';
import '../jobs/motion.css';

export function HubFrame() {
  const [params] = useSearchParams();
  const as = params.get('as') ?? 'client';
  const vn = as === 'vn';
  const me = vn ? FREELANCER : CLIENT;
  const wallet = as === 'guest' ? null : me.toBase58();
  const mine = hubMine(me);
  const page = params.get('page');
  return (
    <div className={`${hub.hub} hb-root`}>
      <JobsHeader wallet={wallet} name={wallet ? (vn ? '@vinh' : '@mia') : null} vn={vn} status={wallet ? 'ready' : 'signed-out'} next="%2Fjobs" onOpenWallet={() => {}} />
      {page === 'find' ? (
        <main id="main" className={hub.main}>
          <FindView
            open={params.get('state') === 'loading' ? null : params.get('state') === 'empty' ? [] : HUB_JOBS}
            openLoading={params.get('state') === 'loading'}
            openError={false}
            onRetry={() => {}}
            applications={wallet ? mine.apps : []}
            listings={wallet && !vn ? mine.listings : []}
            signedIn={Boolean(wallet)}
            vn={vn || as === 'guest'}
            me={wallet}
            names={{ ...HUB_NAMES, [CLIENT.toBase58()]: '@mia', [FREELANCER.toBase58()]: '@vinh' }}
            now={HUB_NOW}
          />
        </main>
      ) : page === 'overview' ? (
        <main id="main" className={hub.main}>
          <OverviewView
            jobs={params.get('state') === 'loading' || params.get('state') === 'error' ? null : params.get('state') === 'empty' ? [] : HUB_JOBS}
            loading={params.get('state') === 'loading'}
            error={params.get('state') === 'error'}
            onRetry={() => {}}
            vn={vn || as === 'guest'}
            client={Boolean(wallet) && !vn}
            signedIn={Boolean(wallet)}
            names={HUB_NAMES}
            now={HUB_NOW}
          />
        </main>
      ) : (
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
      )}
      <JobsFooter vn={vn || (as === 'guest' && page !== null)} client={Boolean(wallet) && !vn} cta={params.get('cta') === '1' || page === 'overview'} />
    </div>
  );
}
