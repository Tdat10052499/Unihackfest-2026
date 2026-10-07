// P3 (compliance fix list): Terms, Privacy and Disclosures. The pages are the phone app's screens, served by the
// wallet build on this origin (/wallet/terms, /wallet/privacy from S11; /wallet/disclosures exists).
export const LEGAL_LINKS = [
  { href: '/wallet/terms', label: 'Terms' },
  { href: '/wallet/privacy', label: 'Privacy' },
  { href: '/wallet/disclosures', label: 'Disclosures' },
] as const;

export function LegalLinks({ className, linkClassName }: { className?: string; linkClassName?: string }) {
  return (
    <nav aria-label="Legal" className={className}>
      {LEGAL_LINKS.map((l, i) => (
        <span key={l.href}>
          {i ? ' · ' : ''}
          <a href={l.href} className={linkClassName}>
            {l.label}
          </a>
        </span>
      ))}
    </nav>
  );
}
