// Profile menu of the Jobs navbar (appendix H.6): header (@handle, money view), "Open wallet" (the wallet extension,
// D23) and "Go to Workspace" (/). Escape and a click outside close it; focus goes back to the button; ArrowUp /
// ArrowDown / Home / End move between the items.
import { useEffect, useId, useRef, useState, type KeyboardEvent, type RefCallback } from 'react';
import { Link } from 'react-router';
import { Avatar } from '../components/Avatar.tsx';
import { HubIcon } from './components/HubIcon.tsx';
import hub from './hub.module.css';

export interface ProfileMenuProps {
  /** Avatar seed (the wallet address) */
  wallet: string;
  /** "@mia", or a short address */
  name: string;
  /** "Vietnam view · VND" or "USDC wallet" */
  viewLabel: string;
  onOpenWallet(): void;
  /** Also receives the button element (the wallet panel returns focus to it) */
  buttonRef?: RefCallback<HTMLButtonElement>;
  /** Called when the menu opens, so the wallet panel can close */
  onMenuOpen?(): void;
}

export const viewLabelFor = (vn: boolean) => (vn ? 'Vietnam view · VND' : 'USDC wallet');

export function ProfileMenu({ wallet, name, viewLabel, onOpenWallet, buttonRef, onMenuOpen }: ProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement | null>(null);
  const menu = useRef<HTMLDivElement>(null);
  const id = useId();

  const items = () => Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
  const close = (focusButton = true) => {
    setOpen(false);
    if (focusButton) button.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    items()[0]?.focus();
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (menu.current?.contains(t) || button.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const onMenuKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const list = items();
    const at = list.indexOf(document.activeElement as HTMLElement);
    const go = (i: number) => {
      e.preventDefault();
      list[(i + list.length) % list.length]?.focus();
    };
    if (e.key === 'ArrowDown') go(at + 1);
    else if (e.key === 'ArrowUp') go(at - 1);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(list.length - 1);
    else if (e.key === 'Tab') setOpen(false);
  };

  return (
    <>
      <button
        ref={(el) => {
          button.current = el;
          buttonRef?.(el);
        }}
        type="button"
        className={hub.profile}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={`Account menu, ${name}`}
        onClick={() => {
          if (!open) onMenuOpen?.();
          setOpen(!open);
        }}
      >
        <Avatar seed={wallet} size={34} decorative />
        <span className={hub.profileWho}>
          <span className={hub.profileHandle}>{name}</span>
          <span className={hub.profileSub}>{viewLabel}</span>
        </span>
        <HubIcon name="chevronDown" size={14} width={2.4} />
      </button>
      {open ? (
        <div ref={menu} id={id} role="menu" aria-label="Account" className={`${hub.menu} ${hub.pop}`} onKeyDown={onMenuKey}>
          <div className={hub.menuHead}>
            <Avatar seed={wallet} size={40} decorative />
            <span>
              <span className={hub.menuHandle}>{name}</span>
              <span className={hub.menuSub}>{viewLabel}</span>
            </span>
          </div>
          <button
            type="button"
            role="menuitem"
            className={hub.menuItem}
            onClick={() => {
              close(false);
              onOpenWallet();
            }}
          >
            <span className={`${hub.menuIcon} ${hub.menuIconTint}`}>
              <HubIcon name="wallet" size={16} />
            </span>
            <span className={hub.menuText}>
              <span className={hub.menuTitle}>Open wallet</span>
              <span className={hub.menuNote}>The N.E.D Wallet, as on your phone</span>
            </span>
          </button>
          <Link to="/" role="menuitem" className={hub.menuItem} onClick={() => setOpen(false)}>
            <span className={`${hub.menuIcon} ${hub.menuIconDark}`}>
              <HubIcon name="grid" size={16} />
            </span>
            <span className={hub.menuText}>
              <span className={hub.menuTitle}>Go to Workspace</span>
              <span className={hub.menuNote}>Contracts, milestones and records</span>
            </span>
            <HubIcon name="external" size={15} color="var(--hub-caption)" />
          </Link>
        </div>
      ) : null}
    </>
  );
}
