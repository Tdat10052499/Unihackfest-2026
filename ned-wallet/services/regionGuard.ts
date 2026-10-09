// V1 (compliance fix list): the Vietnam view never sends, receives or lists crypto. One guard for every host (GitHub
// Pages and the Workspace's /wallet): these routes go to Home when the region is not 'intl'. A wallet that has not
// chosen a region yet counts as the Vietnam view (product-spec 4.2: "I live in Vietnam" is the default).
import type { Region } from './milestone/view';

/**
 * V1's four routes and Add USDC (test USDC for a client to lock), plus the hidden swap and xStocks screens (crypto trading, never in the Vietnam view), and the
 * on-chain transfer detail (D2, CL pre-pitch-check 7 Oct: it shows token amounts)
 */
export const VN_BLOCKED_ROUTES = ['/send', '/receive', '/add-usdc', '/history', '/scan-qr', '/swap', '/xstocks', '/notification-detail'] as const;

/** The app path without a base URL or a trailing slash ("/wallet/send/" → "/send") */
export function appPath(pathname: string, base = ''): string {
  let p = pathname || '/';
  if (base && (p === base || p.startsWith(`${base}/`))) p = p.slice(base.length) || '/';
  return p.length > 1 ? p.replace(/\/+$/, '') : p;
}

export function blockedForRegion(pathname: string, region: Region | null): boolean {
  if (region === 'intl') return false;
  const p = appPath(pathname);
  return VN_BLOCKED_ROUTES.some((r) => p === r || p.startsWith(`${r}/`));
}

/**
 * D2: the bell's on-chain transfer sync lists token amounts, so it runs only in the international view. A wallet that
 * has not chosen a region counts as the Vietnam view, as everywhere else.
 */
export const syncsOnChainActivity = (region: Region | null): boolean => region === 'intl';

/** D2: a saved bell entry from the on-chain transfer sync (received / sent, with an amount and a transaction) */
export const isTokenTransferNotice = (n: { type?: string; txHash?: string }): boolean =>
  (n.type === 'RECEIVE_MONEY' || n.type === 'TRANSFER') && Boolean(n.txHash);
