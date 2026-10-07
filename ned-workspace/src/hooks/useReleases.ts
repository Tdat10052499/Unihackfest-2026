// Releases of one contract read from its transactions (core records.ts): the release time and signature of each
// milestone, and whether it was Accept & release or Release now. Read once a milestone is released; F2 uses it for
// "since {release time}", the 48-hour reminder and the receipt.
import { useQuery } from '@tanstack/react-query';
import { getConnection } from '@ned/core/config.ts';
import type { FundAccount } from '@ned/core/milestone/decode.ts';
import { readFundReleases, type ReleaseRecord } from '@ned/core/milestone/records.ts';

export function useReleases(address: string | undefined, raw: FundAccount | null | undefined): ReleaseRecord[] {
  const released = raw?.milestones.filter((m) => m.status === 'Released').length ?? 0;
  return (
    useQuery({
      queryKey: ['releases', address, released],
      enabled: Boolean(address && raw && released > 0),
      staleTime: 60_000,
      queryFn: () => readFundReleases(getConnection(), address!, raw!),
    }).data ?? []
  );
}
