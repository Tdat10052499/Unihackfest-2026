// Delivery links (B4b / W4): a link should point at one fixed version, so what the client opens is what was
// delivered. Figma: version-id; GitHub / GitLab: a commit, tree/<sha> or blob/<sha>. Other links are not judged.

const GIT_SHA = /\/(commit|tree|blob)\/([0-9a-f]{7,40})(?:[/?#]|$)/;

/** A Figma or Git link that does not point at a fixed version */
export function looksUnversioned(link: string): boolean {
  const l = link.trim().toLowerCase();
  if (l.includes('figma.com/')) return !/[?&]version-id=/.test(l);
  if (l.includes('github.com/') || l.includes('gitlab.com/')) return !GIT_SHA.test(l);
  return false;
}

/** A Figma or Git link that points at a fixed version ("Fixed version" chip) */
export function isFixedVersion(link: string): boolean {
  const l = link.trim().toLowerCase();
  return (l.includes('figma.com/') || l.includes('github.com/') || l.includes('gitlab.com/')) && !looksUnversioned(l);
}

/** "Figma · version 2214", "GitHub · commit 3f9a1c2", else the host name */
export function linkLabel(link: string): string {
  const raw = link.trim();
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return raw;
  }
  const host = url.hostname.replace(/^www\./, '');
  if (host.endsWith('figma.com')) {
    const v = url.searchParams.get('version-id');
    return v ? `Figma · version ${v}` : 'Figma';
  }
  const site = host.endsWith('github.com') ? 'GitHub' : host.endsWith('gitlab.com') ? 'GitLab' : null;
  if (site) {
    const m = GIT_SHA.exec(url.pathname.toLowerCase());
    return m ? `${site} · commit ${m[2].slice(0, 7)}` : site;
  }
  return host;
}
