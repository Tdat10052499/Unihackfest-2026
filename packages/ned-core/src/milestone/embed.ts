// Preview embeds for deliveries (R1; delivery-review-updates.md U6, review-decision-plan.md D27): the client reviews a
// milestone through a preview, so a delivery link that is a Google Drive / Docs file, a Figma file, a YouTube or Loom
// video, or an image is shown in place. Everything else stays a plain link. Pure: no fetch, no DOM.
//
// Safety: only https, only the exact host names below (a look-alike such as drive.google.com.evil.com is a link), no
// credentials or custom port, and the frame src is rebuilt from the parsed id, never copied from the input.
// PREVIEW_FRAME_HOSTS are the only frame origins, for the frame-src of the Workspace CSP (R3).

export type PreviewEmbed = { kind: 'frame'; provider: string; src: string } | { kind: 'image'; src: string } | { kind: 'link' };

/** The exact frame origins previewEmbed can return (frame-src of the CSP) */
export const PREVIEW_FRAME_HOSTS = [
  'https://drive.google.com',
  'https://docs.google.com',
  'https://www.figma.com',
  'https://www.youtube-nocookie.com',
  'https://www.loom.com',
] as const;

const ID = /^[A-Za-z0-9_-]+$/;
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const IMAGE = /\.(png|jpe?g|webp|gif)$/i;
const DOCS: Record<string, string> = { document: 'Google Docs', presentation: 'Google Slides', spreadsheets: 'Google Sheets' };
const LINK: PreviewEmbed = { kind: 'link' };
const frame = (provider: string, src: string): PreviewEmbed => ({ kind: 'frame', provider, src });

function parse(raw: string): URL | null {
  try {
    const url = new URL(String(raw ?? '').trim());
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    return url;
  } catch {
    return null;
  }
}

/** How a delivery link is previewed: an embedded frame, an image, or a plain link */
export function previewEmbed(raw: string): PreviewEmbed {
  const url = parse(raw);
  if (!url) return LINK;
  const host = url.hostname.toLowerCase();
  const parts = url.pathname.split('/').filter(Boolean);

  if (host === 'drive.google.com') {
    // /file/d/<id>[/view|/edit|…] and /open?id=<id>
    const id = parts[0] === 'file' && parts[1] === 'd' ? parts[2] : parts[0] === 'open' && parts.length === 1 ? url.searchParams.get('id') : null;
    return id && ID.test(id) ? frame('Google Drive', `https://drive.google.com/file/d/${id}/preview`) : LINK;
  }
  if (host === 'docs.google.com') {
    const [type, d, id] = parts;
    return DOCS[type] && d === 'd' && id && ID.test(id) ? frame(DOCS[type], `https://docs.google.com/${type}/d/${id}/preview`) : LINK;
  }
  if (host === 'figma.com' || host === 'www.figma.com') {
    return ['file', 'design', 'proto'].includes(parts[0]) && parts[1] && ID.test(parts[1])
      ? frame('Figma', `https://www.figma.com/embed?embed_host=ned&url=${encodeURIComponent(url.href)}`)
      : LINK;
  }
  if (host === 'youtube.com' || host === 'www.youtube.com' || host === 'm.youtube.com' || host === 'youtu.be') {
    const id = host === 'youtu.be' ? parts[0] : parts[0] === 'watch' ? url.searchParams.get('v') : parts[0] === 'shorts' ? parts[1] : null;
    return id && YOUTUBE_ID.test(id) ? frame('YouTube', `https://www.youtube-nocookie.com/embed/${id}`) : LINK;
  }
  if (host === 'loom.com' || host === 'www.loom.com') {
    return parts[0] === 'share' && parts[1] && ID.test(parts[1]) ? frame('Loom', `https://www.loom.com/embed/${parts[1]}`) : LINK;
  }
  if (IMAGE.test(url.pathname)) return { kind: 'image', src: url.href };
  return LINK;
}
