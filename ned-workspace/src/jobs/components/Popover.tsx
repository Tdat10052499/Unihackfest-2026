// Anchored popover of the hub v4 (V6.3: Field and Budget on Find jobs). Opens under its anchor; a click outside it
// and its anchor, or Escape, closes it, and focus goes back to the anchor. Pops in with .hb-pop.
import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import styles from './components.module.css';

export interface PopoverProps {
  open: boolean;
  onClose(): void;
  /** The control that opens it; focus returns there on close */
  anchorRef: RefObject<HTMLElement | null>;
  label: string;
  align?: 'start' | 'end';
  width?: number;
  id?: string;
  className?: string;
  children: ReactNode;
}

export function Popover({ open, onClose, anchorRef, label, align = 'start', width, id, className, children }: PopoverProps) {
  const box = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const close = () => {
      closeRef.current();
      anchorRef.current?.focus();
    };
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (box.current?.contains(t) || anchorRef.current?.contains(t)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      close();
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, anchorRef]);

  if (!open) return null;
  return (
    <div
      ref={box}
      id={id}
      role="dialog"
      aria-label={label}
      className={`${styles.popover} ${align === 'end' ? styles.popoverEnd : ''} hb-pop ${className ?? ''}`}
      style={width ? { width, maxWidth: 'calc(100vw - 32px)' } : undefined}
    >
      {children}
    </div>
  );
}
