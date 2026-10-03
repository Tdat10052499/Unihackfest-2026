// Open state of the wallet panel and its confirm API. Every signing action will go through
// confirm(request) (workspace-plan section 3); the confirm state itself arrives in W4.
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';

export interface ConfirmRow {
  label: string;
  value: string;
  sub?: string;
}

export interface ConfirmRequest {
  /** "Lock 20.00 USDC", "Approve milestone 1" … */
  title: string;
  rows: ConfirmRow[];
  note?: { text: string; tone: 'info' | 'warning' | 'success' };
  confirmLabel: string;
}

interface WalletPanelValue {
  open: boolean;
  setOpen(open: boolean): void;
  toggle(): void;
  /** The top-bar button: focus returns here when the panel closes */
  triggerRef: RefObject<HTMLButtonElement | null>;
  /** Shows the request in the panel; resolves true when the user confirms. W1: not built yet, always false */
  confirm(request: ConfirmRequest): Promise<boolean>;
}

const WalletPanelContext = createContext<WalletPanelValue | null>(null);

export function WalletPanelProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const toggle = useCallback(() => setOpen((o) => !o), []);
  const confirm = useCallback(async (request: ConfirmRequest) => {
    console.warn('[wallet panel] confirm state arrives in W4; declined:', request.title);
    return false;
  }, []);
  const value = useMemo(() => ({ open, setOpen, toggle, triggerRef, confirm }), [open, toggle, confirm]);
  return <WalletPanelContext.Provider value={value}>{children}</WalletPanelContext.Provider>;
}

export function useWalletPanel(): WalletPanelValue {
  const value = useContext(WalletPanelContext);
  if (!value) throw new Error('useWalletPanel must be used inside <WalletPanelProvider>');
  return value;
}
