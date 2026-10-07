// Preview of one delivery link (R2; delivery-review-updates.md U6, review-decision-plan.md D27), shared by Review and
// Submit. A Google Drive / Docs, Figma, YouTube or Loom link, or an image link, gets a 16:10 box that loads only after
// "Load preview" (so opening the page makes no request to those sites); anything else stays a link card. The frame is
// sandboxed and sends no referrer. Which links were loaded is page state only: nothing is stored.
import { useState } from 'react';
import { isFixedVersion, linkLabel } from '@ned/core/milestone/links.ts';
import { previewEmbed } from '@ned/core/milestone/embed.ts';
import { Icon } from './icons.tsx';
import styles from './PreviewFrame.module.css';

export const BLANK_HINT = (name: string) => `Blank? The file may not be shared with 'Anyone with the link'. Open it in a new tab or ask ${name}.`;
export const NOT_EMBEDDABLE = "This site can't be shown here. Open it in a new tab.";
export const FRAME_SANDBOX = 'allow-scripts allow-same-origin allow-popups allow-presentation';

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

export interface PreviewFrameProps {
  url: string;
  /** The other party, for the "ask {name}" hint */
  name: string;
  /** Controlled: the parent remembers "Load preview" per link for the page session */
  loaded?: boolean;
  onLoad?(): void;
}

export function PreviewFrame({ url, name, loaded, onLoad }: PreviewFrameProps) {
  const [own, setOwn] = useState(false);
  const on = loaded ?? own;
  const embed = previewEmbed(url);
  const host = hostOf(url);
  const fixed = isFixedVersion(url) ? <span className={styles.fixed}>Fixed version</span> : null;
  const open = (
    <a href={url} target="_blank" rel="noopener noreferrer" className={styles.open}>
      Open in a new tab ↗
    </a>
  );

  if (embed.kind === 'link')
    return (
      <div className={styles.wrap} data-testid="preview-frame" data-kind="link">
        <a href={url} target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
          <Icon name="external" size={14} color="var(--caption)" />
          <span className={styles.linkMain}>
            <span className={styles.linkLabel}>
              {linkLabel(url)} {fixed}
            </span>
            <span className={styles.linkUrl}>{url.replace(/^https?:\/\/(www\.)?/, '')}</span>
          </span>
          <span className={styles.openSmall}>Open</span>
        </a>
        <p className={styles.hint}>{NOT_EMBEDDABLE}</p>
      </div>
    );

  const provider = embed.kind === 'frame' ? embed.provider : 'Image';
  return (
    <div className={styles.wrap} data-testid="preview-frame" data-kind={embed.kind}>
      <div className={styles.head}>
        <span className={styles.source}>
          <span className={styles.provider}>{provider}</span> · {host}
        </span>
        {fixed}
        <span className={styles.grow} />
        {open}
      </div>
      <div className={styles.box}>
        {!on ? (
          <div className={styles.placeholder}>
            <span className={styles.placeholderTitle}>{provider}</span>
            <span className={styles.placeholderHost}>{host}</span>
            <button
              type="button"
              className={styles.load}
              onClick={() => {
                setOwn(true);
                onLoad?.();
              }}
            >
              Load preview
            </button>
          </div>
        ) : embed.kind === 'frame' ? (
          <iframe
            className={styles.frame}
            src={embed.src}
            title={`Preview of the delivery on ${embed.provider}`}
            sandbox={FRAME_SANDBOX}
            referrerPolicy="no-referrer"
            loading="lazy"
            allow="fullscreen"
          />
        ) : (
          <img className={styles.image} src={embed.src} referrerPolicy="no-referrer" alt={`Preview image from ${host}`} />
        )}
      </div>
      <p className={styles.hint}>{BLANK_HINT(name)}</p>
    </div>
  );
}
