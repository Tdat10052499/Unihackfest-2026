// Routes (W1): / → Overview (signed in), /sign-in, anything else → /.
import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { useAuth } from './auth/AuthProvider.tsx';
import { Layout } from './components/Layout.tsx';
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
  if (status === 'ready' && walletAddress) return <Navigate to="/" replace />;
  return children;
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route
            index
            element={
              <SignedIn>
                <Overview />
              </SignedIn>
            }
          />
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
