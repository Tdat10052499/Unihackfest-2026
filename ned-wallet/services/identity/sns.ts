import { Connection, PublicKey } from '@solana/web3.js';
import { resolve, getMultiplePrimaryDomains } from '@bonfida/spl-name-service';

let mainnet: Connection | undefined;
function connection(): Connection {
  const endpoint = process.env.EXPO_PUBLIC_HELIUS_MAINNET_URL;
  if (!endpoint) throw new Error('SNS lookup requires EXPO_PUBLIC_HELIUS_MAINNET_URL.');
  return mainnet ??= new Connection(endpoint, 'confirmed');
}

// Isolated read-only Mainnet connection; never use the wallet's selected network.
export async function resolveSns(domain: string): Promise<string> {
  try { return (await resolve(connection(), domain)).toBase58(); }
  catch { throw new Error('Unable to resolve this .sol name on Mainnet. Check the name and connection, then retry.'); }
}
export async function reverseSns(wallets: string[]): Promise<(string | undefined)[]> {
  const domains = await getMultiplePrimaryDomains(connection(), wallets.map(w => new PublicKey(w)));
  return domains.map(name => name ? (/\.(sol|sns)$/.test(name) ? name : `${name}.sol`) : undefined);
}
