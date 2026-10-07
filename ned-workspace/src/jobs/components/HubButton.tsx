// Pill button of the hub v4 (prompts-hub-v4.md V2, V4): purple = an on-chain action (it asks the wallet), dark =
// browse or navigate, white = on a dark or grey band, ghost = quiet text action. `outline` is the v3 name kept until
// H2–H5 move the pages to white or ghost. A `to` makes it a router link, an `href` a plain link, otherwise a button.
// `arrow` adds the up-right arrow that nudges on hover (.hb-arrow).
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router';
import { HubIcon } from './HubIcon.tsx';
import styles from './components.module.css';

export type HubButtonVariant = 'purple' | 'dark' | 'white' | 'ghost' | 'outline';

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: HubButtonVariant;
  size?: 'small' | 'medium' | 'large';
  to?: string;
  href?: string;
  arrow?: boolean;
  children: ReactNode;
}

export function HubButton({ variant = 'dark', size = 'medium', to, href, arrow = false, className, children, ...rest }: Props) {
  const cls = [styles.button, styles[variant], size === 'medium' ? '' : styles[size], className ?? ''].filter(Boolean).join(' ');
  const body = (
    <>
      {children}
      {arrow ? (
        <span className={`hb-arrow ${styles.arrow}`}>
          <HubIcon name="external" size={14} width={2.4} />
        </span>
      ) : null}
    </>
  );
  if (to)
    return (
      <Link to={to} className={cls}>
        {body}
      </Link>
    );
  if (href)
    return (
      <a href={href} className={cls}>
        {body}
      </a>
    );
  return (
    <button type="button" className={cls} {...rest}>
      {body}
    </button>
  );
}

/** The v4 name of the same pill */
export const PillButton = HubButton;
