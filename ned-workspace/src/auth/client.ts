// Dynamic client (singleton), web only: Google sign-in by redirect, embedded Solana wallet (WaaS).
// Same environment ID as the mobile app, so the same Google account gives the same wallet on both.
// Only src/auth imports @dynamic-labs-sdk/*.
import { createDynamicClient, type DynamicClient } from '@dynamic-labs-sdk/client';
import { addWaasSolanaExtension } from '@dynamic-labs-sdk/solana/waas';
import { env } from '../config.ts';

export const dynamicClient: DynamicClient | null = env.dynamicEnvironmentId
  ? createDynamicClient({
      autoInitialize: false,
      environmentId: env.dynamicEnvironmentId,
      metadata: { name: 'N.E.D Workspace' },
    })
  : null;

if (dynamicClient) addWaasSolanaExtension(dynamicClient);
