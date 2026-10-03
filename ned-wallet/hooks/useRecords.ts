// Records for the signed-in wallet (build-plan B5): the device cache first, then new releases from the chain.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../services/auth';
import { displayNamesFor } from '../services/identity/resolve';
import { groupByMonth, recordsCsv, type RecordMonth, type ReleaseRecord } from '../services/milestone/records';
import { onRecordsChanged, readRecords, refreshRecords } from '../services/milestone/recordsStore';
import { useFunds } from './useFunds';

const LOAD_ERROR = 'Could not check the chain for new records. Showing what this device has saved.';

export function useRecords(): {
  records: ReleaseRecord[];
  months: RecordMonth[];
  /** client wallet → "@username" or a short address */
  names: Record<string, string>;
  loading: boolean;
  error?: string;
  csv(): string;
} {
  const { walletAddress } = useAuth();
  const { raw } = useFunds('freelancer');
  const [records, setRecords] = useState<ReleaseRecord[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const rawRef = useRef(raw);
  rawRef.current = raw;

  // re-sync when a milestone of an open contract is released (not on every poll)
  const releasedKey = raw
    .map((f) => `${f.address.toBase58()}:${f.milestones.filter((m) => m.status === 'Released').length}`)
    .join(',');

  const sync = useCallback(async () => {
    if (!walletAddress) return;
    try {
      const next = await refreshRecords(walletAddress, rawRef.current);
      setRecords(next.records);
      setError(undefined);
    } catch (err) {
      console.warn('[records] sync failed', err);
      setError(LOAD_ERROR);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    if (!walletAddress) {
      setRecords([]);
      setLoading(false);
      return;
    }
    let live = true;
    void readRecords(walletAddress).then((cache) => {
      if (!live) return;
      setRecords(cache.records);
      if (cache.records.length) setLoading(false);
    });
    const off = onRecordsChanged((w, cache) => w === walletAddress && setRecords(cache.records));
    return () => {
      live = false;
      off();
    };
  }, [walletAddress]);

  useEffect(() => {
    void sync();
  }, [sync, releasedKey]);

  const clients = useMemo(() => [...new Set(records.map((r) => r.client))].sort().join(','), [records]);
  useEffect(() => {
    if (!clients) return;
    let live = true;
    displayNamesFor(clients.split(','))
      .then((n) => live && setNames(n))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [clients]);

  const months = useMemo(() => groupByMonth(records), [records]);
  const csv = useCallback(() => recordsCsv(records), [records]);
  return { records, months, names, loading, ...(error ? { error } : {}), csv };
}
