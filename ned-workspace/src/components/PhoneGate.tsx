// Below 900 px the Workspace sends people to the phone app (D16 host rule): QR + link to the mobile origin.
import { useSyncExternalStore } from 'react';
import QRCode from 'react-qr-code';
import { env } from '../config.ts';
import { DevnetBadge } from './DevnetBadge.tsx';
import { PhoneIcon } from './icons.tsx';
import { Logo } from './Logo.tsx';
import styles from './PhoneGate.module.css';

const QUERY = '(max-width: 899px)';

export function useNarrowScreen(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(QUERY);
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    () => window.matchMedia(QUERY).matches,
    () => false
  );
}

export function PhoneGate() {
  return (
    <main className={styles.gate}>
      <div className={styles.card}>
        <Logo size={40} />
        <h1 className={styles.title}>Use the N.E.D app on your phone</h1>
        <p className={styles.text}>The Workspace is made for a computer screen. On a phone, the N.E.D app has the same wallet and the same contracts.</p>
        <div className={styles.qr}>
          <QRCode value={env.mobileOrigin} size={168} fgColor="#111116" bgColor="#F4F4F6" title="QR code to open the N.E.D app" />
        </div>
        <a className={styles.open} href={env.mobileOrigin}>
          <PhoneIcon size={18} />
          Open the N.E.D app
        </a>
        <DevnetBadge />
        <p className={styles.note}>Scan with your phone camera, or open the link on this phone.</p>
      </div>
    </main>
  );
}
