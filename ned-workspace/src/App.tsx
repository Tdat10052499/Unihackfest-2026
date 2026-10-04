// Routes: / Overview, /contracts, /contract/:fund (read-only), /contract/:fund/submit and /review?i= (W4), /new (W3),
// /sign-in, and the invite link /c/:fund — outside the layout, so it decides phone vs computer before anything else.
import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { useAuth } from './auth/AuthProvider.tsx';
import { Layout } from './components/Layout.tsx';
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
const KeyCheck = lazy(() => import('./pages/KeyCheck.tsx').then((m) => ({ default: m.KeyCheck })));
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
  if (status === 'ready' && walletAddress) {
    // An invite opened before sign-in: PendingInvite imports it and opens the contract
    return hasPendingInvite() ? <Starting /> : <Navigate to="/" replace />;
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
        <Route element={<Layout />}>
          <Route index element={signedIn(<Overview />)} />
          <Route path="contracts" element={signedIn(<Contracts />)} />
          <Route path="contract/:fund" element={signedIn(<Contract />)} />
          <Route path="contract/:fund/submit" element={lazyPage(<Submit />)} />
          <Route path="contract/:fund/review" element={lazyPage(<Review />)} />
          <Route path="new" element={lazyPage(<NewContract />)} />
          {/* spike S0 (key-sync-plan.md), temporary */}
          <Route path="key-check" element={lazyPage(<KeyCheck />)} />
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
