// Page frame: top bar + content (max 1,280 px), or the phone gate below 900 px.
import { Outlet } from 'react-router';
import { PhoneGate, useNarrowScreen } from './PhoneGate.tsx';
import { TopBar } from './TopBar.tsx';

export function Layout() {
  if (useNarrowScreen()) return <PhoneGate />;
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <TopBar />
      <Outlet />
    </>
  );
}
