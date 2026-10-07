// Final files after release (F2; prompts-final-files.md): the download address of a hand-over link, the receipt file,
// and the hand-over notices of the bell. Pure apart from the browser download helper.
import { previewEmbed } from '@ned/core/milestone/embed.ts';
import { HANDOVER_SOFT_SECS } from '@ned/core/milestone/handover.ts';

/**
 * Where "Download" goes: a single Google Drive file → its direct download address
 * (https://drive.google.com/uc?export=download&id=<id>); anything else is opened as given (new tab, no referrer).
 */
export function downloadHref(url: string): { href: string; direct: boolean } {
  const embed = previewEmbed(url);
  if (embed.kind === 'frame' && embed.provider === 'Google Drive') {
    const id = /\/file\/d\/([A-Za-z0-9_-]+)\/preview$/.exec(embed.src)?.[1];
    if (id) return { href: `https://drive.google.com/uc?export=download&id=${id}`, direct: true };
  }
  return { href: url, direct: false };
}

/** ned-receipt-<first 8 characters of the contract>-m<milestone, 1-based>.json */
export const receiptName = (fund: string, index: number) => `ned-receipt-${fund.slice(0, 8)}-m${index + 1}.json`;

/** Saves a JSON object as a file on this device; nothing is sent anywhere */
export function saveJson(name: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** "Waiting for final files from @vinh · since 7 Oct, 10:00" / "Late · 52 hours after release" */
export const lateHours = (releaseTime: number, now: number) => Math.floor((now - releaseTime) / 3600);

// ---- bell notices (U3 mechanism): 24 h / 48 h reminders to the freelancer, "received" to the client ----

export const FINALS_DUE_SECS = [86_400, HANDOVER_SOFT_SECS] as const;

/** One released milestone, as the bell sees it on this read */
export interface FinalsWatch {
  fund: string;
  index: number;
  title: string;
  role: 'client' | 'freelancer';
  /** block time of the release transaction, when read */
  releasedAt: number | null;
  handed: boolean;
}

export interface FinalsNotice {
  id: string;
  title: string;
  message: string;
  href: string;
}

/**
 * Notices for the hand-over of released milestones, comparing this read with the last one (`prev`: key → handed,
 * where key = `${fund}:${index}`). The freelancer is reminded once when 24 h and 48 h after the release pass with no
 * hand-over (deadlines crossed in (prevNow, now]); the client hears once when the files arrive.
 */
export function finalsNotices(watch: FinalsWatch[], prev: Record<string, boolean>, prevNow: number | null, now: number): FinalsNotice[] {
  const out: FinalsNotice[] = [];
  for (const w of watch) {
    const key = `${w.fund}:${w.index}`;
    const n = w.index + 1;
    const href = `/contract/${w.fund}#files`;
    if (w.role === 'client' && w.handed && prev[key] === false) {
      out.push({ id: `finals:${key}:received`, title: `Final files received · milestone ${n}`, message: `For ${w.title}. Download them and check them against the promised list.`, href });
    }
    if (w.role === 'freelancer' && !w.handed && w.releasedAt && prevNow !== null) {
      for (const after of FINALS_DUE_SECS) {
        const t = w.releasedAt + after;
        if (prevNow < t && t <= now) out.push({ id: `finals:${key}:due${after / 3600}`, title: `Final files for milestone ${n} are due`, message: `${w.title} was released ${after / 3600} hours ago. Hand over the final files.`, href });
      }
    }
  }
  return out;
}
