// Generated avatar (Avatar.dc.html via @ned/core/avatar). Seed = wallet address, so it never changes.
import { useMemo } from 'react';
import { avatarSpec } from '@ned/core/avatar.ts';

export function Avatar({ seed, size = 34, decorative = false }: { seed: string; size?: number; decorative?: boolean }) {
  const spec = useMemo(() => avatarSpec(seed), [seed]);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : spec.label}
      style={{ borderRadius: '50%', flex: 'none', display: 'block' }}
    >
      <rect width="40" height="40" fill={spec.bg} />
      <g transform={`rotate(${spec.rotate} 20 20)`}>
        {spec.shapes.map((s, i) => (
          <path key={i} d={s.d} fill={s.fill} stroke={s.stroke} strokeWidth={s.strokeWidth} fillOpacity={s.fillOpacity} />
        ))}
      </g>
    </svg>
  );
}
