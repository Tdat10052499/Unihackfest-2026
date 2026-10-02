// Chain-based clock (unix seconds) that ticks every second. Countdowns and rules use chain time, never the
// device clock alone: the offset to the latest block time is re-synced every minute.
import { useEffect, useState } from 'react';
import { getChainNow } from '../services/milestone/queries';

const RESYNC_MS = 60_000;
let offsetSeconds = 0;
let lastSync = 0;
let syncing: Promise<void> | null = null;

function sync(): Promise<void> {
  syncing ??= getChainNow()
    .then((chain) => {
      offsetSeconds = chain - Date.now() / 1000;
      lastSync = Date.now();
    })
    .catch(() => undefined)
    .finally(() => {
      syncing = null;
    });
  return syncing;
}

/** Current chain time without React (for actions); syncs first if the offset is stale */
export async function chainNowSeconds(): Promise<number> {
  if (Date.now() - lastSync > RESYNC_MS) await sync();
  return Math.floor(Date.now() / 1000 + offsetSeconds);
}

export function useChainTime(): number {
  const read = () => Math.floor(Date.now() / 1000 + offsetSeconds);
  const [now, setNow] = useState(read);
  useEffect(() => {
    let alive = true;
    const tick = () => alive && setNow(read());
    if (Date.now() - lastSync > RESYNC_MS) void sync().then(tick);
    const timer = setInterval(() => {
      tick();
      if (Date.now() - lastSync > RESYNC_MS) void sync().then(tick);
    }, 1000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);
  return now;
}
