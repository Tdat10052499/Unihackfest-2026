// Payout reference for the Vietnam path (decision D13): SHA-256 of the partner's recipient ID.
// Demo: a made-up ID `demo-<username>-001`; at launch, the ID the partner issues after KYC.
import { sha256 } from '@noble/hashes/sha2.js';

export function payoutReference(recipientId: string): Uint8Array {
  return sha256(new TextEncoder().encode(recipientId));
}

export const demoRecipientId = (username: string) => `demo-${username}-001`;
