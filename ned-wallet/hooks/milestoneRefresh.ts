// Tiny pub/sub so an action refreshes every mounted useFund / useFunds without a global store.
type Listener = (address?: string) => void;
const listeners = new Set<Listener>();

export function onFundChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** `address` undefined = a new contract or an unknown one: refresh everything */
export function emitFundChanged(address?: string): void {
  listeners.forEach((l) => l(address));
}
