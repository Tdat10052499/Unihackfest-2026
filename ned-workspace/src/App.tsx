// Routes: / Overview, /contracts, /contract/:fund (read-only), /contract/:fund/submit and /review?i= (W4), /new (W3),
// /sign-in (?next= returns to a page on this site), the N.E.D Jobs site /jobs/* (D28, behind FEATURES.jobs), and the invite link /c/:fund — outside the layout, so it decides phone vs computer before anything else.
import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useSearchParams } from 'react-router';
import { useAuth } from './auth/AuthProvider.tsx';
import { Layout } from './components/Layout.tsx';
import { FEATURES } from './config.ts';
import { JobsLayout } from './jobs/JobsLayout.tsx';
import { Find as JobsFind } from './jobs/pages/Find.tsx';
import { Overview as JobsOverview } from './jobs/pages/Overview.tsx';
import { Applicants } from './jobs/pages/Applicants.tsx';
import { JobDetail } from './jobs/pages/JobDetail.tsx';
import { PostJob } from './jobs/pages/PostJob.tsx';
import { safeNext } from './lib/next.ts';

// Dev only: fixture contract states for screenshots (S7); not in normal builds
const StatesPage = import.meta.env.VITE_DEV_TOOLS === '1' ? lazy(() => import('./dev/StatesPage.tsx').then((m) => ({ default: m.StatesPage }))) : null;
const HubFrame = import.meta.env.VITE_DEV_TOOLS === '1' ? lazy(() => import('./dev/HubFrame.tsx').then((m) => ({ default: m.HubFrame }))) : null;
import { hasPendingInvite } from './hooks/keyStore.ts';
import { Contract } from './pages/Contract.tsx';
import { Contracts } from './pages/Contracts.tsx';
import { InviteRouter, PendingInvite } from './pages/InviteRouter.tsx';
import { Overview } from './pages/Overview.tsx';
import { SignIn } from './pages/SignIn.tsx';

// The editor, submit and review pages load on first visit (W5 bundle split): Overview and the contract page stay in
// the first download.
const NewContract = lazy(() => import('./pages/NewContract.tsx').then((m) => ({ default: m.NewContract })));
const Submit = lazy(() => import('./pages/Submit.tsx').then((m) => ({ default: m.Submit })));
const Review = lazy(() => import('./pages/Review.tsx').then((m) => ({ default: m.Review })));

function Loading() {
  return (
    <main id="main" style={{ padding: 48, textAlign: 'center', color: 'var(--caption)' }} aria-busy="true">
      Loading…
    </main>
  );
}

function Starting() {
  return (
    <main id="main" style={{ padding: 48, textAlign: 'center', color: 'var(--caption)' }} aria-busy="true">
      Opening your wallet…
    </main>
  );
}

function SignedIn({ children }: { children: ReactNode }) {
  const { status, walletAddress } = useAuth();
  if (status === 'initializing' || status === 'setting-up') return <Starting />;
  if (status !== 'ready' || !walletAddress) return <Navigate to="/sign-in" replace />;
  return children;
}

function SignedOut({ children }: { children: ReactNode }) {
  const { status, walletAddress } = useAuth();
  const [params] = useSearchParams();
  if (status === 'ready' && walletAddress) {
    // An invite opened before sign-in: PendingInvite imports it and opens the contract
    return hasPendingInvite() ? <Starting /> : <Navigate to={safeNext(params.get('next'))} replace />;
  }
  return children;
}

const signedIn = (page: ReactNode) => <SignedIn>{page}</SignedIn>;
const lazyPage = (page: ReactNode) => signedIn(<Suspense fallback={<Loading />}>{page}</Suspense>);

export function App() {
  return (
    <BrowserRouter>
      <PendingInvite />
      <Routes>
        <Route path="c/:fund" element={<InviteRouter />} />
        {HubFrame ? <Route path="dev/hub" element={<Suspense fallback={<Loading />}><HubFrame /></Suspense>} /> : null}
        {FEATURES.jobs ? (
          // N.E.D Jobs (D28): its own layout; readable signed out. Static paths before :job.
          <Route path="jobs" element={<JobsLayout />}>
            <Route index element={<JobsOverview />} />
            <Route path="find" element={<JobsFind />} />
            <Route path="new" element={<PostJob />} />
            <Route path=":job" element={<JobDetail />} />
            <Route path=":job/applicants" element={<Applicants />} />
          </Route>
        ) : (
          <Route path="jobs/*" element={<Navigate to="/" replace />} />
        )}
        <Route element={<Layout />}>
          <Route index element={signedIn(<Overview />)} />
          <Route path="contracts" element={signedIn(<Contracts />)} />
          <Route path="contract/:fund" element={signedIn(<Contract />)} />
          <Route path="contract/:fund/submit" element={lazyPage(<Submit />)} />
          <Route path="contract/:fund/review" element={lazyPage(<Review />)} />
          <Route path="new" element={lazyPage(<NewContract />)} />
          {StatesPage ? <Route path="dev/states" element={<Suspense fallback={<Loading />}><StatesPage /></Suspense>} /> : null}
          <Route
            path="sign-in"
            element={
              <SignedOut>
                <SignIn />
              </SignedOut>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
