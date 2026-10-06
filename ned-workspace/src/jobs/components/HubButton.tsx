// Hub button (appendix H.10): dark = browse or navigate, purple = an on-chain action (it asks the wallet), outline =
// secondary. A `to` makes it a router link, an `href` a plain link, otherwise a button.
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router';
import styles from './components.module.css';

export type HubButtonVariant = 'dark' | 'purple' | 'outline';

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: HubButtonVariant;
  size?: 'small' | 'medium' | 'large';
  to?: string;
  href?: string;
  children: ReactNode;
}

export function HubButton({ variant = 'dark', size = 'medium', to, href, className, children, ...rest }: Props) {
  const cls = [styles.button, styles[variant], size === 'medium' ? '' : styles[size], className ?? ''].filter(Boolean).join(' ');
  if (to) return <Link to={to} className={cls}>{children}</Link>;
  if (href) return <a href={href} className={cls}>{children}</a>;
  return (
    <button type="button" className={cls} {...rest}>
      {children}
    </button>
  );
}
