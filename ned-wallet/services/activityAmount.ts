// D2 (CL pre-pitch-check 7 Oct): a SOL balance change is shown in SOL, never priced as dollars ("* 150" is gone).
// Pure, so the node tests can check it without the RPC.

/** "+0.5000 SOL" / "-0.0100 SOL" */
export function solActivityAmount(sol: number): string {
  const sign = sol < 0 ? '-' : '+';
  return `${sign}${Math.abs(sol).toFixed(4)} SOL`;
}
