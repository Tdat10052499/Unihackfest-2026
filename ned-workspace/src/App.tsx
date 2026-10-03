// Routes: / Overview, /contracts, /contract/:fund (read-only), /contract/:fund/submit and /review (W4), /new (W3),
// /sign-in, and the invite link /c/:fund — outside the layout, so it decides phone vs computer before anything else.
import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { useAuth } from './auth/AuthProvider.tsx';
import { Layout } from './components/Layout.tsx';
import { hasPendingInvite } from './hooks/keyStore.ts';
import { ComingSoon } from './pages/ComingSoon.tsx';
import { Contract } from './pages/Contract.tsx';
import { Contracts } from './pages/Contracts.tsx';
import { InviteRouter, PendingInvite } from './pages/InviteRouter.tsx';
import { NewContract } from './pages/NewContract.tsx';
import { Overview } from './pages/Overview.tsx';
import { SignIn } from './pages/SignIn.tsx';

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
          <Route path="contract/:fund/submit" element={signedIn(<ComingSoon page="submit" />)} />
          <Route path="contract/:fund/review" element={signedIn(<ComingSoon page="review" />)} />
          <Route path="new" element={signedIn(<NewContract />)} />
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
