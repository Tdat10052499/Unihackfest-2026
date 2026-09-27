import path from 'node:path';
import dotenv from 'dotenv';
import { loadStockTokens, parseTokenResponse } from '../services/jupiter/tokenResponse';

dotenv.config({ path: path.resolve(process.cwd(), '.env'), quiet: true });

type Token = {
  id?: string;
  name?: string;
  symbol?: string;
  isVerified?: boolean | null;
  liquidity?: number | null;
  usdPrice?: number | null;
  tags?: string[];
};

const apiKey = process.env.EXPO_PUBLIC_JUPITER_API_KEY;

async function main() {
  if (!apiKey) {
    console.error('Missing EXPO_PUBLIC_JUPITER_API_KEY in ned-wallet/.env');
    process.exitCode = 1;
    return;
  }

  const tokens = await loadStockTokens<Token>(async (endpoint) => {
    const response = await fetch(`https://api.jup.ag/tokens/v2${endpoint}`, {
      headers: { 'x-api-key': apiKey! },
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error(`Jupiter Tokens API returned HTTP ${response.status}`);
    const body: unknown = await response.json();
    console.log(`Endpoint: ${endpoint} · HTTP ${response.status} · JSON ${Array.isArray(body) ? 'array' : 'object'}`);
    return parseTokenResponse<Token>(body);
  }, () => console.log('stocks tag rejected: falling back to search xStock + xstocks tag (not exhaustive).'));

  const endsInX = tokens.filter((token) => token.symbol?.endsWith('x'));
  const verified = endsInX.filter((token) => token.isVerified === true);
  const liquid = verified.filter((token) => (token.liquidity ?? 0) >= 10_000);

  console.log(`Tokens received: ${tokens.length}`);
  console.log(`After symbol endsWith "x": ${endsInX.length}`);
  console.log(`After isVerified === true: ${verified.length}`);
  console.log(`After liquidity >= $10,000: ${liquid.length}`);
  console.log('First 3 raw response samples:');
  for (const token of tokens.slice(0, 3)) {
    console.log(
      JSON.stringify({
        symbol: token.symbol ?? null,
        isVerified: token.isVerified ?? null,
        liquidity: token.liquidity ?? null,
        usdPrice: token.usdPrice ?? null,
        tags: token.tags ?? null,
      }),
    );
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Jupiter diagnosis failed');
  process.exitCode = 1;
});
