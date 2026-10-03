// Chain-based clock (unix seconds), ticking every second; offset re-synced every minute (as in ned-wallet).
import { useEffect, useState } from 'react';
import { getChainNow } from '@ned/core/milestone/queries.ts';

const RESYNC_MS = 60_000;
let offset = 0;
let lastSync = 0;
let syncing: Promise<void> | null = null;

function sync(): Promise<void> {
  syncing ??= getChainNow()
    .then((chain) => {
      offset = chain - Date.now() / 1000;
      lastSync = Date.now();
    })
    .catch(() => undefined)
    .finally(() => {
      syncing = null;
    });
  return syncing;
}

export function useChainTime(): number {
  const read = () => Math.floor(Date.now() / 1000 + offset);
  const [now, setNow] = useState(read);
  useEffect(() => {
    let alive = true;
    const tick = () => alive && setNow(read());
    const timer = setInterval(() => {
      tick();
      if (Date.now() - lastSync > RESYNC_MS) void sync().then(tick);
    }, 1000);
    if (Date.now() - lastSync > RESYNC_MS) void sync().then(tick);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);
  return now;
}

/** Current chain time without React (for actions); syncs first if the offset is stale */
export async function chainNowSeconds(): Promise<number> {
  if (Date.now() - lastSync > RESYNC_MS) await sync();
  return Math.floor(Date.now() / 1000 + offset);
}
