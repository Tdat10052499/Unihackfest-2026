/** Tokens API can return an application error even with HTTP 200. */
export function parseTokenResponse<T>(body: unknown): T[] {
  if (Array.isArray(body)) return body as T[];
  if (body && typeof body === 'object') {
    const error = body as { status?: unknown; message?: unknown; error?: unknown };
    const message = typeof error.message === 'string' ? error.message : error.error;
    if (typeof message === 'string') {
      throw new Error(`Jupiter Tokens API (${String(error.status ?? 'error')}): ${message}`);
    }
  }
  throw new Error('Jupiter Tokens API returned an unexpected response; expected a token array.');
}

export async function loadStockTokens<T extends { tags?: string[] }>(
  load: (path: string) => Promise<T[]>,
  onFallback?: () => void,
): Promise<T[]> {
  try {
    return await load('/tag?query=stocks');
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes('Invalid tag provided')) throw error;
    onFallback?.();
    // Search is bounded discovery, not an exhaustive replacement for the stocks tag.
    const tokens = await load('/search?query=xStock');
    return tokens.filter((token) => token.tags?.includes('xstocks'));
  }
}
