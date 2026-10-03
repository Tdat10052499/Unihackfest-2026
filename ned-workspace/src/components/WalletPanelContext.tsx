// Open state of the wallet panel and its confirm API. Every signing action goes through confirm(request) first
// (workspace-plan section 3): the panel shows the request like a wallet extension's approve window, and the promise
// resolves true on Confirm, false on Cancel, Escape, a click outside or closing the panel.
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';

export interface ConfirmRow {
  label: string;
  value: string;
  sub?: string;
  mono?: boolean;
}

export interface ConfirmRequest {
  /** "Create contract", "Lock 20.00 USDC", "Approve milestone 1" … */
  title: string;
  rows: ConfirmRow[];
  note?: { text: string; tone: 'info' | 'warning' | 'success' | 'purple' };
  confirmLabel: string;
}

interface WalletPanelValue {
  open: boolean;
  setOpen(open: boolean): void;
  toggle(): void;
  /** The top-bar button: focus returns here when the panel closes */
  triggerRef: RefObject<HTMLButtonElement | null>;
  /** The request on show, if any */
  request: ConfirmRequest | null;
  /** Shows the request in the panel; resolves true when the user confirms */
  confirm(request: ConfirmRequest): Promise<boolean>;
  /** The panel's answer to the request on show */
  answer(ok: boolean): void;
}

const WalletPanelContext = createContext<WalletPanelValue | null>(null);

export function WalletPanelProvider({ children }: { children: ReactNode }) {
  const [open, setOpenState] = useState(false);
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const pending = useRef<((ok: boolean) => void) | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const answer = useCallback((ok: boolean) => {
    const resolve = pending.current;
    pending.current = null;
    setRequest(null);
    setOpenState(false);
    resolve?.(ok);
  }, []);

  const setOpen = useCallback(
    (next: boolean) => {
      // Closing the panel while a request waits is a Cancel
      if (!next && pending.current) answer(false);
      else setOpenState(next);
    },
    [answer]
  );
  const toggle = useCallback(() => setOpen(!open), [open, setOpen]);

  const confirm = useCallback((next: ConfirmRequest) => {
    pending.current?.(false); // one request at a time
    return new Promise<boolean>((resolve) => {
      pending.current = resolve;
      setRequest(next);
      setOpenState(true);
    });
  }, []);

  const value = useMemo(() => ({ open, setOpen, toggle, triggerRef, request, confirm, answer }), [open, setOpen, toggle, request, confirm, answer]);
  return <WalletPanelContext.Provider value={value}>{children}</WalletPanelContext.Provider>;
}

export function useWalletPanel(): WalletPanelValue {
  const value = useContext(WalletPanelContext);
  if (!value) throw new Error('useWalletPanel must be used inside <WalletPanelProvider>');
  return value;
}
