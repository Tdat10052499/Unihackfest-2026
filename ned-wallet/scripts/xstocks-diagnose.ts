import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env'), quiet: true });

type Token = {
  id?: string;
  name?: string;
  symbol?: string;
  isVerified?: boolean | null;
  liquidity?: number | null;
  usdPrice?: number | null;
  tags?: string[] | null;
};

const apiKey = process.env.EXPO_PUBLIC_JUPITER_API_KEY;

async function main() {
  if (!apiKey) {
    console.error('Missing EXPO_PUBLIC_JUPITER_API_KEY in ned-wallet/.env');
    process.exitCode = 1;
    return;
  }

  let response: Response;
  try {
    response = await fetch('https://api.jup.ag/tokens/v2/tag?query=stocks', {
      headers: { 'x-api-key': apiKey },
    });
  } catch (error) {
    console.error('Network error calling Jupiter Tokens API:', error);
    process.exitCode = 1;
    return;
  }

  if (!response.ok) {
    console.error(`Jupiter Tokens API returned HTTP ${response.status}`);
    console.error((await response.text()).slice(0, 500));
    process.exitCode = 1;
    return;
  }

  const tokens = (await response.json()) as Token[];
  const endsInX = tokens.filter((token) => token.symbol?.endsWith('x'));
  const verified = endsInX.filter((token) => token.isVerified === true);
  const liquid = verified.filter((token) => (token.liquidity ?? 0) >= 10_000);

  console.log(`Tokens API tag=stocks returned: ${tokens.length}`);
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

void main();
