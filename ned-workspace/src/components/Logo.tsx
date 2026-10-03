export function Logo({ size = 36 }: { size?: number }) {
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: size >= 40 ? 12 : 10,
        background: 'var(--accent)',
        color: '#fff',
        display: 'inline-grid',
        placeItems: 'center',
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: size * 0.3,
        letterSpacing: '-0.02em',
        flex: 'none',
      }}
    >
      N.E.D
    </span>
  );
}
