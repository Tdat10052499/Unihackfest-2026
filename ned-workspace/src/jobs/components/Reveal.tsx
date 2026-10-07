// Scroll reveal (V3): adds .rv (rise), .rv-x (slide from the left) or .rv-scale to its element. The effect only runs
// where scroll timelines exist; elsewhere the content is simply shown.
import type { ElementType, HTMLAttributes, ReactNode } from 'react';

export type RevealKind = 'rise' | 'x' | 'scale';
const CLASS: Record<RevealKind, string> = { rise: 'rv', x: 'rv-x', scale: 'rv-scale' };

export function Reveal({ as: Tag = 'div', kind = 'rise', className, children, ...rest }: { as?: ElementType; kind?: RevealKind; children: ReactNode } & HTMLAttributes<HTMLElement>) {
  return (
    <Tag className={[CLASS[kind], className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </Tag>
  );
}
