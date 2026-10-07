// /jobs/legal — Legal, in plain words (board WebJobsLegal; prompts-hub-v4.md V8). Reached from the hub footer only,
// never the navbar. Four documents from the one shared source (@ned/core legal copy): Terms of use, Privacy notice,
// Disclosures (the disputes line follows FEATURES.dispute) and Job posting rules. ?doc=terms|privacy|disclosures|rules
// picks the document; #lg-<doc>-<n> opens a section on load; the "On this page" list follows the scroll (scroll spy at
// 170 px). A 3 px reading bar at the top grows with the page (.hb-progress, where scroll timelines exist).
import { useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { LEGAL_DOC_IDS, LEGAL_VERSION_LINE, legalDocs, TEAM_EMAIL, type LegalDocId, type LegalSection } from '@ned/core/legal/copy.ts';
import { FEATURES } from '../../config.ts';
import { HubButton } from '../components/HubButton.tsx';
import { SectionHeading } from '../components/SectionHeading.tsx';
import { useScrollSpy } from '../motion.ts';
import hub from '../hub.module.css';
import styles from './Legal.module.css';

export const LEGAL_INTRO = 'The rules and notices for N.E.D Jobs and the N.E.D Wallet pilot. Pilot version 1.1 · 7 Oct 2026.';
export const DRAFT_NOTICE = 'These are drafts for the devnet pilot. They have not been reviewed by a lawyer yet and are not legal advice.';

/** Icon paths of the four document cards (board WebJobsLegal) */
const DOC_ICON: Record<LegalDocId, string> = {
  terms: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h5',
  privacy: 'M12 3 5 6v6c0 4.4 3 7.8 7 9 4-1.2 7-4.6 7-9V6zM9 12l2 2 4-4',
  disclosures: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8v5M12 16h.01',
  rules: 'M4 8h16v11H4zM9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M4 13h16',
};

export const sectionId = (doc: LegalDocId, n: number) => `lg-${doc}-${n}`;
const pad = (n: number) => String(n).padStart(2, '0');

/** ?doc= → a known document (terms by default); a #lg-<doc>-<n> hash wins so a shared section link opens its document */
export function docFromUrl(search: URLSearchParams, hash: string): LegalDocId {
  const fromHash = /^#lg-(terms|privacy|disclosures|rules)-\d+$/.exec(hash)?.[1] as LegalDocId | undefined;
  const fromQuery = search.get('doc') as LegalDocId | null;
  return fromHash ?? (fromQuery && LEGAL_DOC_IDS.includes(fromQuery) ? fromQuery : 'terms');
}

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView?.({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
}

function Icon({ path, color, size = 18 }: { path: string; color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable="false">
      <path d={path} />
    </svg>
  );
}

export function Legal() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const docs = useMemo(() => legalDocs(FEATURES.dispute), []);
  const docId = docFromUrl(params, location.hash);
  const doc = docs.find((d) => d.id === docId)!;
  const next = docs[(docs.indexOf(doc) + 1) % docs.length];
  const ids = doc.sections.map((_, i) => sectionId(doc.id, i + 1));
  const spied = useScrollSpy(ids);
  // At the bottom of a short document the spy marks the last section; a linked section that is in view wins then
  const linked = location.hash.slice(1);
  const linkedTop = ids.includes(linked) ? document.getElementById(linked)?.getBoundingClientRect().top : undefined;
  const active = spied === ids[ids.length - 1] && linkedTop !== undefined && linkedTop >= 0 && linkedTop < window.innerHeight ? linked : spied;

  // A #lg-<doc>-<n> link opens at that section once the document has rendered
  useEffect(() => {
    if (location.hash.startsWith('#lg-')) {
      const id = location.hash.slice(1);
      const t = window.setTimeout(() => scrollToId(id), 60);
      return () => window.clearTimeout(t);
    }
  }, [location.hash, docId]);

  const pick = (id: LegalDocId) => {
    setParams({ doc: id }, { replace: false });
    window.setTimeout(() => scrollToId('lg-doc'), 0);
  };

  return (
    <>
      <div className={styles.reading} aria-hidden>
        <div className={`${styles.readingFill} hb-progress`} />
      </div>
      <section aria-labelledby="lg-h1" className={`${hub.container} ${styles.top}`}>
        <span className={`${styles.eyebrow} hb-in`}>
          <span className={styles.eyebrowDot} aria-hidden />
          Legal
        </span>
        <div className={`${styles.titleRow} hb-in-2`}>
          <div className={styles.title}>
            <SectionHeading id="lg-h1" level={1} title="Legal, " tone="in plain words" />
          </div>
          <p className={styles.intro}>{LEGAL_INTRO}</p>
        </div>
        <div role="note" className={`${styles.draft} hb-in-3`}>
          <Icon path="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8v5M12 16h.01" color="#B26B00" />
          <span>{DRAFT_NOTICE}</span>
        </div>
        <div role="tablist" aria-label="Documents" className={`${styles.cards} hb-in-4`}>
          {docs.map((d) => {
            const on = d.id === doc.id;
            return (
              <button
                key={d.id}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls="lg-doc"
                className={`${styles.card} ${on ? styles.cardOn : ''} hb-lift`}
                onClick={() => pick(d.id)}
              >
                <span className={`${styles.cardIcon} ${on ? styles.cardIconOn : ''}`}>
                  <Icon path={DOC_ICON[d.id]} color={on ? '#FFFFFF' : '#6A22B0'} />
                </span>
                <span className={styles.cardTitle}>{d.title}</span>
                <span className={styles.cardKicker}>{d.kicker}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section id="lg-doc" role="tabpanel" aria-labelledby="lg-doc-h" className={`${hub.container} ${styles.body}`}>
        <aside aria-label="On this page" className={styles.aside}>
          <div className={styles.asideHead}>On this page</div>
          <ol className={styles.toc}>
            {doc.sections.map((s, i) => {
              const id = ids[i];
              const on = id === active;
              return (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    aria-current={on ? 'true' : undefined}
                    className={`${styles.tocLink} ${on ? styles.tocOn : ''}`}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate({ search: `?doc=${doc.id}`, hash: id }, { replace: true });
                      scrollToId(id);
                    }}
                  >
                    <span className={styles.tocN}>{pad(i + 1)}</span>
                    {s.title}
                  </a>
                </li>
              );
            })}
          </ol>
          <div className={styles.contact}>
            Questions about these documents? Write to <span className={styles.placeholder}>{TEAM_EMAIL}</span>.
          </div>
        </aside>

        <article className={styles.article} key={doc.id}>
          <div className={`${styles.meta} hb-in`}>
            <span className={styles.metaIcon}>
              <Icon path={DOC_ICON[doc.id]} color="#6A22B0" />
            </span>
            <span>{LEGAL_VERSION_LINE}</span>
          </div>
          <h2 id="lg-doc-h" className={`${styles.docTitle} hb-in`}>
            {doc.title}
          </h2>
          <p className={styles.kicker}>{doc.kicker}</p>
          <div className={styles.sections}>
            {doc.sections.map((s, i) => (
              <DocSection key={ids[i]} id={ids[i]} n={i + 1} section={s} />
            ))}
          </div>
          <div className={`${styles.next} rv`}>
            <span>
              Next: <strong>{next.title}</strong>
            </span>
            <HubButton variant="dark" arrow onClick={() => pick(next.id)} style={{ height: 42 }}>
              Read it
            </HubButton>
          </div>
        </article>
      </section>
    </>
  );
}

function DocSection({ id, n, section }: { id: string; n: number; section: LegalSection }) {
  const List = section.list === 'number' ? 'ol' : 'ul';
  return (
    <section id={id} className={`${styles.section} rv`} aria-labelledby={`${id}-h`}>
      <span className={styles.sectionN} aria-hidden>
        {pad(n)}
      </span>
      <div className={styles.sectionBody}>
        <h3 id={`${id}-h`} className={styles.sectionTitle}>
          {section.title}
        </h3>
        {section.list ? (
          <List className={styles.list}>
            {section.body.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </List>
        ) : (
          section.body.map((p) => (
            <p key={p} className={styles.para}>
              {p}
            </p>
          ))
        )}
      </div>
    </section>
  );
}

/** Footer links of the hub: the Legal page, or one document (V9; H4 points them here) */
export const legalHref = (doc?: LegalDocId) => (doc ? `/jobs/legal?doc=${doc}` : '/jobs/legal');
