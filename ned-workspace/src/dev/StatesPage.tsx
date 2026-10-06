// Dev only (VITE_DEV_TOOLS=1): every S7 contract state, as the client or the freelancer, on the real Contract and
// Review views with fixture data. /dev/states?s=<scenario>&role=client|freelancer&page=contract|review&vn=1.
// Nothing here signs or reads the chain.
import { Link, useSearchParams } from 'react-router';
import { ContractView } from '../pages/Contract.tsx';
import { ReviewView } from '../pages/Review.tsx';
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
  const content = { hasKey: true, ready: true, contentStatus: 'ok' as const, content: s.content, importKey: async () => false };
  const me = (role === 'client' ? CLIENT : FREELANCER).toBase58();
  if (params.get('page') === 'review')
    return <ReviewView fund={fund} raw={s.fund} index={0} now={s.now} vn={vn} me={me} content={content} p1 status="" onRelease={noop} onRequestChanges={noop} />;
  return <ContractView fund={fund} raw={s.fund} content={content} vn={vn} isParty p1 actions={{ run: noop, busy: null, status: '', error: '' }} />;
}
