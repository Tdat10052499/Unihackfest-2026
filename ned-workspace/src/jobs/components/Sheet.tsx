// Right-side sheet of the hub v4 (V6.4: Filters). 440 px (full width on a phone), backdrop rgba(17,17,22,.32),
// header with a round close, scrolling body, optional footer. Focus moves in and is trapped while open; Escape, the
// backdrop or the close button closes it, and focus goes back to where it was.
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { HubIcon } from './HubIcon.tsx';
import styles from './components.module.css';

export interface SheetProps {
  open: boolean;
  onClose(): void;
  title: string;
  footer?: ReactNode;
  children: ReactNode;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Sheet({ open, onClose, title, footer, children }: SheetProps) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const before = document.activeElement as HTMLElement | null;
    const items = () => Array.from(panel.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    items()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const list = items();
      if (!list.length) return;
      const first = list[0];
      const last = list[list.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !panel.current?.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !panel.current?.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      before?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className={styles.sheetLayer}>
      <div className={`${styles.sheetBackdrop} hb-backdrop`} aria-hidden data-testid="sheet-backdrop" onClick={() => closeRef.current()} />
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} className={`${styles.sheet} hb-sheet`}>
        <div className={styles.sheetHead}>
          <h2 id={titleId} className={styles.sheetTitle}>
            {title}
          </h2>
          <button type="button" className={styles.sheetClose} aria-label="Close" onClick={() => closeRef.current()}>
            <HubIcon name="close" size={16} width={2.4} />
          </button>
        </div>
        <div className={styles.sheetBody}>{children}</div>
        {footer ? <div className={styles.sheetFoot}>{footer}</div> : null}
      </div>
    </div>
  );
}
