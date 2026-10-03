// Small text helpers shared by the contract screens
export const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;

/** Review window as words: "3 days", "2 h", "1 min (devnet demo)" */
export function windowText(seconds: number): string {
  if (seconds >= 86_400) {
    const d = Math.round(seconds / 86_400);
    return `${d} day${d === 1 ? '' : 's'}`;
  }
  if (seconds >= 3600) return `${Math.round(seconds / 3600)} h`;
  const m = Math.max(1, Math.round(seconds / 60));
  return `${m} min${m <= 5 ? ' (devnet demo)' : ''}`;
}
