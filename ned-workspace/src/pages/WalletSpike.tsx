// /wallet-spike — W6 step 1 (temporary, not linked): the mobile app at /wallet/ in a same-origin iframe, sized like
// the extension panel, to check whether it is signed in with the Workspace session (no second login).
import { useAuth } from '../auth/AuthProvider.tsx';

export function WalletSpike() {
  const { walletAddress } = useAuth();
  return (
    <main id="main" style={{ padding: 24, display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <div style={{ maxWidth: 360, fontSize: 14, lineHeight: 1.55 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', margin: 0 }}>Wallet extension spike (W6)</h1>
        <p>
          Workspace wallet: <strong style={{ fontFamily: 'var(--font-mono)' }}>{walletAddress?.slice(0, 4)}…{walletAddress?.slice(-4)}</strong>
        </p>
        <p>The frame on the right is the N.E.D mobile app served at /wallet on this same origin. If it shows your Home without asking you to sign in, the session is shared.</p>
      </div>
      <iframe
        title="N.E.D Wallet"
        src="/wallet/"
        style={{ width: 390, height: 'min(780px, calc(100vh - 96px))', border: 'none', borderRadius: 20, boxShadow: 'var(--shadow-pop)', background: '#fff' }}
      />
    </main>
  );
}
