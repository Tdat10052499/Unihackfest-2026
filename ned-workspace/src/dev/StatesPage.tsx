// Dev only (VITE_DEV_TOOLS=1): every S7 contract state, as the client or the freelancer, on the real Contract and
// Review / Submit views with fixture data. /dev/states?s=<scenario>&role=client|freelancer&page=contract|review|submit
// [&mode=revision|handover][&type=design]&vn=1; review also takes &links=<url>,<url> and &points=0 (R2).
// Nothing here signs or reads the chain.
import { Link, useSearchParams } from 'react-router';
import type { ReleaseRecord } from '@ned/core/milestone/records.ts';
import { ContractView } from '../pages/Contract.tsx';
import { ReviewView } from '../pages/Review.tsx';
import { SubmitView, type SubmitMode, type WorkType } from '../pages/Submit.tsx';
import { CLIENT, FREELANCER, SCENARIOS, scenarioView } from './states.ts';

const noop = async () => {};

export function StatesPage() {
  const [params] = useSearchParams();
  const s = SCENARIOS.find((x) => x.id === params.get('s')) ?? null;
  const role = params.get('role') === 'freelancer' ? 'freelancer' : 'client';
  const vn = params.get('vn') === '1';
  if (!s)
    return (
      <main id="main" style={{ padding: 32 }}>
        <h1>Contract states (dev)</h1>
        <ul>
          {SCENARIOS.map((x) => (
            <li key={x.id}>
              {x.label}: <Link to={`?s=${x.id}&role=client`}>client</Link> · <Link to={`?s=${x.id}&role=freelancer`}>freelancer</Link> ·{' '}
              <Link to={`?s=${x.id}&role=client&page=review`}>review (client)</Link> · <Link to={`?s=${x.id}&role=freelancer&page=review`}>review (freelancer)</Link>
            </li>
          ))}
        </ul>
      </main>
    );
  const fund = scenarioView(s, role, vn ? 'vn' : 'intl');
  // F2 screenshots: &release=<hours before now> gives milestone 1 a release time (waiting, late after 48 h)
  const releaseHours = params.get('release');
  const releases: ReleaseRecord[] =
    releaseHours !== null ? [{ id: `${s.fund.address.toBase58()}:0`, fund: s.fund.address.toBase58(), index: 0, title: '', client: '', amountUnits: '8000000', releasedAt: s.now - Number(releaseHours) * 3600, signature: '5Re1ease', destination: 'payoutPartner', by: 'approve' }] : [];
  const content = { hasKey: true, ready: true, contentStatus: 'ok' as const, content: s.content, importKey: async () => false };
  const me = (role === 'client' ? CLIENT : FREELANCER).toBase58();
  if (params.get('page') === 'submit') {
    const mode = (params.get('mode') ?? 'submit') as SubmitMode;
    const type = (params.get('type') ?? undefined) as WorkType | undefined;
    return <SubmitView fund={fund} raw={s.fund} index={0} now={s.now} vn={vn} content={content} mode={mode} {...(type ? { initialType: type } : {})} status="" onSend={noop} />;
  }
  if (params.get('page') === 'review') {
    // R2 screenshots: &links=<url>,<url> replaces the delivery links; &points=0 gives the milestone no done-when points
    const links = params.get('links')?.split(',').filter(Boolean);
    const m0 = fund.milestones[0];
    const swap = <T extends { links: string[] }>(d: T | undefined) => (d && links ? { ...d, links } : d);
    fund.milestones[0] = {
      ...m0,
      ...(params.get('points') === '0' ? { criteria: [] } : {}),
      ...(m0.delivery ? { delivery: { ...m0.delivery, content: swap(m0.delivery.content) } } : {}),
      ...(m0.history ? { history: { ...m0.history, deliveries: m0.history.deliveries.map((d) => ({ ...d, content: swap(d.content)! })) } } : {}),
    } as typeof m0;
    return <ReviewView fund={fund} raw={s.fund} index={0} now={s.now} vn={vn} me={me} content={content} p1 status="" onRelease={noop} onRequestChanges={noop} {...(releases[0] ? { release: releases[0] } : {})} />;
  }
  return <ContractView fund={fund} raw={s.fund} content={content} vn={vn} isParty p1 actions={{ run: noop, busy: null, status: '', error: '' }} releases={releases} now={s.now} />;
}
