// /jobs/new — Post a job (WebJobPost board; appendix H.17). Outside the Vietnam view only (D18). One page, three
// sections; the right column shows the live card and what is still missing; the sticky bar says how much leaves the
// wallet. "Lock X USDC & publish": wallet confirm → runPostJob (post_job, then the public brief parts) → published.
// v1.4 (D29, FEATURES.lockAtHire): "When is the budget locked?" — Lock when I hire (default: post_job_open, "Publish")
// or Lock now (post_job, "Lock X USDC & publish").
import { useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { PublicKey } from '@solana/web3.js';
import { describeActionError } from '@ned/core/actions.ts';
import { JobBriefNotSavedError, runPostJob, runPostJobBrief } from '@ned/core/jobs/actions.ts';
import { jobBriefBytes } from '@ned/core/jobs/brief.ts';
import type { JobListingAccount } from '@ned/core/jobs/decode.ts';
import { JOB_SUMMARY_MAX_LEN } from '@ned/core/jobs/layout.ts';
import { jobDraftTotal, validateJobDraft, type JobDraft } from '@ned/core/jobs/rules.ts';
import { JOB_CATEGORIES, skillsMask, skillsOfCategory } from '@ned/core/jobs/taxonomy.ts';
import { DONE_WHEN_NEEDED, hashBytes } from '@ned/core/milestone/content.ts';
import { formatDeadline, formatUsdc } from '@ned/core/milestone/format.ts';
import { MAX_MILESTONES, TITLE_MAX_LEN } from '@ned/core/milestone/layout.ts';
import { useWalletPanel } from '../../components/WalletPanelContext.tsx';
import { useActionEnv } from '../../hooks/actions.ts';
import { useUsdcUnits } from '../../hooks/queries.ts';
import { FEATURES } from '../../config.ts';
import { useChainTime } from '../../hooks/useChainTime.ts';
import { HubButton } from '../components/HubButton.tsx';
import { HubIcon } from '../components/HubIcon.tsx';
import { JobCard } from '../components/JobCard.tsx';
import { useHubViewer } from '../JobsLayout.tsx';
import hub from '../hub.module.css';
import styles from './Job.module.css';

const DAY = 86_400;
const utf8 = (s: string) => new TextEncoder().encode(s).length;
const lines = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean);

export interface MilestoneForm {
  name: string;
  amt: string;
  due: string;
  review: string;
  done: string;
}
export interface PostForm {
  title: string;
  category: number;
  skills: number[];
  summary: string;
  scope: string;
  references: string;
  milestones: MilestoneForm[];
  applyDays: number;
  selectDays: number;
}

export const EMPTY_MILESTONE: MilestoneForm = { name: '', amt: '', due: '7', review: '2', done: '' };
export const initialForm = (): PostForm => ({ title: '', category: 0, skills: [], summary: '', scope: '', references: '', milestones: [{ ...EMPTY_MILESTONE }], applyDays: 3, selectDays: 5 });

/** The form as the core JobDraft (days → seconds; times from chain time `now`) */
export function toDraft(f: PostForm, now: number): JobDraft {
  return {
    title: f.title.trim(),
    summary: f.summary.trim(),
    category: f.category,
    skills: f.skills,
    milestones: f.milestones.map((m) => ({ amountUsdc: m.amt.trim(), workSecs: Math.round(Number(m.due) * DAY), reviewSecs: Math.round(Number(m.review) * DAY) })),
    brief: { scope: f.scope, references: lines(f.references), milestones: f.milestones.map((m) => ({ name: m.name, criteria: lines(m.done) })) },
    applyBy: now + f.applyDays * DAY,
    selectBy: now + f.selectDays * DAY,
  };
}

/** v1.4 (D29) choice texts (lock-at-hire-plan section 3; CL pre-pitch-check 9.3 item 10) */
export const LOCK_WHEN_HIRED_TEXT = (total: string) => `Nothing is locked now. When you select a freelancer, ${total} is locked in the same step.`;
export const LOCK_NOW_TEXT = (total: string) => `${total} is locked now and shows as Budget locked.`;
export const BALANCE_AT_SELECT = 'If your balance is too low at that moment, you cannot select.';

/** What still blocks publishing, in the board's words where it has them; `lockNow` false skips the balance check */
export function postProblems(f: PostForm, now: number, balance: bigint | undefined, lockNow = true): string[] {
  const out: string[] = [];
  const d = toDraft(f, now);
  if (!f.title.trim()) out.push('Add a title.');
  if (utf8(f.title.trim()) > TITLE_MAX_LEN) out.push('Shorten the title to 32 bytes.');
  if (!f.summary.trim()) out.push('Add a summary for the job card.');
  if (utf8(f.summary.trim()) > JOB_SUMMARY_MAX_LEN) out.push('Shorten the summary to 160 bytes.');
  if (!f.scope.trim()) out.push('Describe the work in the scope.');
  if (f.milestones.some((m) => !m.name.trim())) out.push('Name every milestone.');
  if (f.milestones.some((m) => !(Number(m.amt) > 0))) out.push('Every milestone needs an amount above 0.');
  if (f.milestones.some((m) => !lines(m.done).length)) out.push(DONE_WHEN_NEEDED);
  if (f.milestones.some((m) => !(Number(m.due) >= 1) || !(Number(m.review) >= 1))) out.push('Give every milestone at least 1 day to deliver and 1 day to review.');
  const total = jobDraftTotal(d);
  if (total > 1_000_000_000n) out.push('The demo allows up to 1,000 USDC per job.');
  if (lockNow && balance !== undefined && total > balance) out.push(`Your wallet has ${formatUsdc(balance)}.`);
  // The core checks (same as post_job) catch anything else, such as a bad reference link
  for (const p of validateJobDraft(d, now)) if (!out.length && !out.includes(p.message)) out.push(p.message);
  return out;
}

export function PostJob() {
  const viewer = useHubViewer();
  if (viewer.status === 'initializing' || viewer.status === 'setting-up') return <div className={styles.page} aria-busy="true" />;
  if (!viewer.signedIn) return <Navigate to="/sign-in?next=%2Fjobs%2Fnew" replace />;
  // D18: the Vietnam view never posts a job
  if (viewer.vn) return <Navigate to="/jobs/find" replace />;
  return <PostJobForm wallet={viewer.wallet!} name={viewer.name ?? ''} />;
}

export function PostJobForm({ wallet, name, lockAtHire = FEATURES.lockAtHire }: { wallet: string; name: string; lockAtHire?: boolean }) {
  const now = useChainTime();
  const balance = useUsdcUnits(wallet).data;
  const { env, status } = useActionEnv();
  const { confirm } = useWalletPanel();
  const queryClient = useQueryClient();
  const [f, setF] = useState<PostForm>(initialForm);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [retryJob, setRetryJob] = useState<string | null>(null);
  const [published, setPublished] = useState<{ job: string; total: string; selectBy: number; locked: boolean } | null>(null);
  // Default "Lock when I hire" when the flag is on; the v1.3 page always locks now
  const [lockChoice, setLockChoice] = useState(false);
  const lockNow = !lockAtHire || lockChoice;
  const set = (patch: Partial<PostForm>) => setF((x) => ({ ...x, ...patch }));
  const setMs = (i: number, patch: Partial<MilestoneForm>) => setF((x) => ({ ...x, milestones: x.milestones.map((m, j) => (j === i ? { ...m, ...patch } : m)) }));

  const draft = toDraft(f, now);
  const total = jobDraftTotal(draft);
  const problems = postProblems(f, now, balance, lockNow);
  const titleBytes = utf8(f.title.trim());
  const sumBytes = utf8(f.summary.trim());
  const preview: JobListingAccount = useMemo(
    () => ({
      address: PublicKey.default,
      version: 1,
      state: 'Open',
      business: new PublicKey(wallet),
      category: f.category,
      skills: skillsMask(f.skills),
      mint: PublicKey.default,
      jobId: 0n,
      createdAt: now,
      applyBy: draft.applyBy,
      selectBy: draft.selectBy,
      total,
      milestoneCount: f.milestones.length,
      milestones: draft.milestones.map((m, index) => ({ index, amount: 0n, workSecs: m.workSecs || 0, reviewSecs: m.reviewSecs || 0 })),
      title: f.title.trim() || 'Your job title',
      summary: f.summary.trim() || 'Your summary appears here.',
      briefHash: new Uint8Array(32),
      selected: null,
      selectedAt: 0,
      fund: null,
      applicationCount: 0,
      bump: 0,
      vaultBump: 0,
      unfunded: !lockNow,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wallet, f, total, now, lockNow]
  );
  const selectOptions = [...new Set([f.applyDays, f.applyDays + 2, f.applyDays + 4])];

  const publish = async () => {
    setError('');
    const fingerprint = Array.from(hashBytes(jobBriefBytes(draft.title, draft.brief)).subarray(0, 4), (x) => x.toString(16).padStart(2, '0')).join('');
    const amount = formatUsdc(total);
    const ok = await confirm({
      title: lockNow ? `Lock ${amount} & publish` : 'Publish',
      rows: [
        { label: 'Job', value: draft.title },
        lockNow
          ? { label: 'Budget', value: amount, sub: 'Leaves your wallet now and waits in the job’s vault' }
          : { label: 'Budget', value: amount, sub: 'Lock when I hire · nothing leaves your wallet now' },
        { label: 'Milestones', value: String(draft.milestones.length) },
        { label: 'Apply by', value: formatDeadline(draft.applyBy) },
        { label: 'Select by', value: formatDeadline(draft.selectBy) },
        { label: 'Brief fingerprint', value: `${fingerprint}…`, sub: 'The brief is public on Solana', mono: true },
        { label: 'Network fee', value: '~0.000005 SOL per transaction', sub: 'devnet test SOL · the brief adds 1–2 transactions' },
        { label: 'N.E.D fee', value: 'None during the pilot' },
      ],
      note: lockNow
        ? { tone: 'purple', text: `${lockAtHire ? `${LOCK_NOW_TEXT(amount)} ` : ''}With no applicants you can withdraw the budget at any time. Once someone applies, it stays locked until the select-by date.` }
        : { tone: 'purple', text: `${LOCK_WHEN_HIRED_TEXT(amount)} ${BALANCE_AT_SELECT}` },
      confirmLabel: lockNow ? 'Lock & publish' : 'Publish',
    });
    if (!ok) return;
    setBusy(true);
    try {
      const result = await runPostJob(env, draft, 'intl', (done, all) => setProgress(`Saving the public brief · ${done + 1} of ${all}`), { lockNow });
      setPublished({ job: result.job, total: formatUsdc(total), selectBy: draft.selectBy, locked: result.locked });
      await queryClient.invalidateQueries({ queryKey: ['jobs'] });
    } catch (err) {
      if (err instanceof JobBriefNotSavedError) setRetryJob(err.job);
      setError(describeActionError(err));
    } finally {
      setBusy(false);
      setProgress('');
    }
  };

  const retryBrief = async () => {
    if (!retryJob) return;
    setBusy(true);
    setError('');
    try {
      await runPostJobBrief(env, retryJob, draft.brief, (done, all) => setProgress(`Saving the public brief · ${done + 1} of ${all}`));
      setPublished({ job: retryJob, total: formatUsdc(total), selectBy: draft.selectBy, locked: lockNow });
      setRetryJob(null);
    } catch (err) {
      setError(describeActionError(err));
    } finally {
      setBusy(false);
      setProgress('');
    }
  };

  const locked = busy || Boolean(published);
  return (
    <div className={styles.page} style={{ paddingBottom: 0 }}>
      <div className={`${hub.container} ${styles.pageInner}`} style={{ paddingBottom: 40 }}>
        <Link to="/jobs/find" className={styles.back}>
          <HubIcon name="arrowLeft" size={14} />
          Jobs
        </Link>
        <div className={styles.postHead}>
          <h1 className={styles.postH1}>Post a job</h1>
          <div className={styles.note}>
            {lockAtHire
              ? 'Freelancers see whether the budget is locked already or locks when you hire. You pick one applicant; that creates the contract.'
              : 'Freelancers see your job with its budget already locked. You pick one applicant; that creates the contract.'}
          </div>
        </div>
        {published ? (
          <section className={styles.published} aria-live="polite">
            <span className={styles.publishedText}>
              <span className={styles.publishedTitle}>{published.locked ? `Published · ${published.total} locked` : `Published · ${published.total} locks when you hire`}</span>
              Your job is on the board. Applications appear under My listings; you can select someone until {formatDeadline(published.selectBy)}.
            </span>
            <HubButton variant="dark" to={`/jobs/${published.job}/applicants`}>
              Go to my listing
            </HubButton>
            <HubButton variant="outline" href={`https://explorer.solana.com/address/${published.job}?cluster=devnet`}>
              View on Explorer
            </HubButton>
          </section>
        ) : null}
        <div className={styles.cols}>
          <main className={styles.main}>
            <fieldset disabled={locked} style={{ border: 'none', padding: 0, margin: 0, display: 'contents' }}>
              <section aria-labelledby="jp-1" className={`${styles.card} rv`}>
                <h2 id="jp-1" className={styles.h2}>
                  <span className={styles.num}>1</span>About the job
                </h2>
                <label htmlFor="jp-title" className={styles.label}>
                  Title
                </label>
                <input id="jp-title" className={styles.input} value={f.title} onChange={(e) => set({ title: e.target.value })} />
                <div className={styles.counter}>
                  <span>Public on Solana. Don't put names or personal details here.</span>
                  <span className={`${styles.counterN} ${titleBytes > TITLE_MAX_LEN ? styles.over : ''}`}>
                    {titleBytes} / {TITLE_MAX_LEN}
                  </span>
                </div>
                <div className={styles.label} id="jp-cat-l">
                  Category
                </div>
                <div role="radiogroup" aria-labelledby="jp-cat-l" className={styles.pills}>
                  {JOB_CATEGORIES.map((c) => (
                    <button key={c.id} type="button" role="radio" aria-checked={f.category === c.index} className={`${styles.pill} ${f.category === c.index ? styles.pillOn : ''}`} onClick={() => set({ category: c.index, skills: [] })}>
                      {c.label}
                    </button>
                  ))}
                </div>
                <div className={styles.label} id="jp-sk-l">
                  Skills <span className={styles.note}>· pick up to 3</span>
                </div>
                <div role="group" aria-labelledby="jp-sk-l" className={styles.pills}>
                  {skillsOfCategory(f.category).map((k) => {
                    const on = f.skills.includes(k.index);
                    return (
                      <button
                        key={k.id}
                        type="button"
                        aria-pressed={on}
                        disabled={!on && f.skills.length >= 3}
                        className={`${styles.pill} ${on ? styles.pillOn : ''}`}
                        onClick={() => set({ skills: on ? f.skills.filter((x) => x !== k.index) : [...f.skills, k.index] })}
                      >
                        {k.label}
                      </button>
                    );
                  })}
                </div>
                <label htmlFor="jp-sum" className={styles.label}>
                  Summary <span className={styles.note}>· shown on the job card</span>
                </label>
                <textarea id="jp-sum" rows={3} className={styles.textarea} value={f.summary} onChange={(e) => set({ summary: e.target.value })} />
                <div className={styles.counter}>
                  <span>The full brief (scope, references, done-when points) is public too.</span>
                  <span className={`${styles.counterN} ${sumBytes > JOB_SUMMARY_MAX_LEN ? styles.over : ''}`}>
                    {sumBytes} / {JOB_SUMMARY_MAX_LEN}
                  </span>
                </div>
                <label htmlFor="jp-scope" className={styles.label}>
                  Scope
                </label>
                <textarea id="jp-scope" rows={4} className={styles.textarea} value={f.scope} onChange={(e) => set({ scope: e.target.value })} />
                <label htmlFor="jp-refs" className={styles.label}>
                  Reference links <span className={styles.note}>· optional, one https:// link per line</span>
                </label>
                <textarea id="jp-refs" rows={2} className={styles.textarea} value={f.references} onChange={(e) => set({ references: e.target.value })} />
              </section>

              <section aria-labelledby="jp-2" className={`${styles.card} rv`}>
                <h2 id="jp-2" className={styles.h2}>
                  <span className={styles.num}>2</span>Work
                </h2>
                {f.milestones.map((m, i) => (
                  <div key={i} className={styles.msEdit}>
                    <div className={styles.msEditHead}>
                      <span>Milestone {i + 1}</span>
                      {f.milestones.length > 1 ? (
                        <button type="button" className={styles.linkBtn} aria-label={`Remove milestone ${i + 1}`} onClick={() => set({ milestones: f.milestones.filter((_, j) => j !== i) })}>
                          Remove
                        </button>
                      ) : null}
                    </div>
                    <div className={styles.grid4} style={{ marginTop: 10 }}>
                      <label>
                        Name
                        <input className={styles.input} value={m.name} onChange={(e) => setMs(i, { name: e.target.value })} />
                      </label>
                      <label>
                        Amount (USDC)
                        <input className={styles.input} inputMode="decimal" value={m.amt} onChange={(e) => setMs(i, { amt: e.target.value })} />
                      </label>
                      <label>
                        Due (days after you select)
                        <input className={styles.input} inputMode="numeric" value={m.due} onChange={(e) => setMs(i, { due: e.target.value })} />
                      </label>
                      <label>
                        Days to review
                        <input className={styles.input} inputMode="numeric" value={m.review} onChange={(e) => setMs(i, { review: e.target.value })} />
                      </label>
                    </div>
                    <label className={styles.label} style={{ fontSize: 12 }}>
                      Done when <span className={styles.note}>· one point per line; you review against these</span>
                      <textarea rows={3} className={styles.textarea} value={m.done} onChange={(e) => setMs(i, { done: e.target.value })} />
                    </label>
                    {lines(m.done).length ? null : (
                      <p className={styles.ruleHint} data-testid="done-when-rule">
                        {DONE_WHEN_NEEDED}
                      </p>
                    )}
                  </div>
                ))}
                {f.milestones.length < MAX_MILESTONES ? (
                  <HubButton variant="outline" size="small" style={{ marginTop: 14 }} onClick={() => set({ milestones: [...f.milestones, { ...EMPTY_MILESTONE }] })}>
                    Add a milestone
                  </HubButton>
                ) : null}
                <p className={styles.fine}>1 to 5 milestones · up to 1,000 USDC per job in this demo. Write done-when points someone else could check.</p>
              </section>

              <section aria-labelledby="jp-3" className={`${styles.card} rv`}>
                <h2 id="jp-3" className={styles.h2}>
                  <span className={styles.num}>3</span>Timing
                </h2>
                <div className={styles.label} id="jp-ab">
                  Applications close in
                </div>
                <div role="radiogroup" aria-labelledby="jp-ab" className={styles.pills}>
                  {[3, 7, 14].map((d) => (
                    <button key={d} type="button" role="radio" aria-checked={f.applyDays === d} className={`${styles.pill} ${f.applyDays === d ? styles.pillOn : ''}`} onClick={() => set({ applyDays: d, selectDays: Math.max(f.selectDays, d) })}>
                      {d} days
                    </button>
                  ))}
                </div>
                <div className={styles.label} id="jp-sb">
                  You select someone within
                </div>
                <div role="radiogroup" aria-labelledby="jp-sb" className={styles.pills}>
                  {selectOptions.map((d) => (
                    <button key={d} type="button" role="radio" aria-checked={f.selectDays === d} className={`${styles.pill} ${f.selectDays === d ? styles.pillOn : ''}`} onClick={() => set({ selectDays: d })}>
                      {d} days
                    </button>
                  ))}
                </div>
                {lockAtHire ? (
                  <>
                    <div className={styles.label} id="jp-lock">
                      When is the budget locked?
                    </div>
                    <div role="radiogroup" aria-labelledby="jp-lock" className={styles.lockChoice}>
                      {[
                        { now: false, label: 'Lock when I hire', text: LOCK_WHEN_HIRED_TEXT(formatUsdc(total)) },
                        { now: true, label: 'Lock now', text: LOCK_NOW_TEXT(formatUsdc(total)) },
                      ].map((o) => (
                        <button
                          key={o.label}
                          type="button"
                          role="radio"
                          aria-checked={lockChoice === o.now}
                          className={`${styles.lockOption} ${lockChoice === o.now ? styles.lockOptionOn : ''}`}
                          onClick={() => setLockChoice(o.now)}
                        >
                          <span className={styles.lockOptionLabel}>{o.label}</span>
                          <span className={styles.lockOptionText}>{o.text}</span>
                        </button>
                      ))}
                    </div>
                  </>
                ) : null}
                <p className={styles.para}>
                  Apply by <strong>{formatDeadline(draft.applyBy)}</strong> · select by <strong>{formatDeadline(draft.selectBy)}</strong>.{' '}
                  {lockNow
                    ? "With no applicants you can withdraw the budget at any time. Once someone has applied, the budget stays locked until the select-by date, so applicants know it's there."
                    : 'With no applicants you can withdraw the listing at any time; nothing is returned, because nothing was locked.'}
                </p>
              </section>
            </fieldset>
          </main>
          <aside aria-label="Preview" className={styles.aside}>
            <div className={styles.previewLabel}>How freelancers will see it</div>
            <JobCard job={preview} vn={false} now={now} businessName={name} preview />
            {problems.length && !published ? (
              <ul className={styles.problems} aria-label="Before you publish">
                {problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            ) : null}
          </aside>
        </div>
      </div>
      <div className={styles.bar}>
        <div className={`${hub.container} ${styles.barInner}`}>
          <span className={styles.barText}>
            {lockNow ? (
              <>
                <strong>{formatUsdc(total)}</strong> leaves your wallet now and waits in the job's vault · balance after:{' '}
                {balance === undefined ? '…' : formatUsdc(balance > total ? balance - total : 0n)}. Your wallet asks twice: to lock the budget, then to save the public
                brief.
              </>
            ) : (
              <>
                Nothing leaves your wallet now. <strong>{formatUsdc(total)}</strong> is locked when you select a freelancer. {BALANCE_AT_SELECT} Your wallet asks
                twice: to publish, then to save the public brief.
              </>
            )}
            {progress || (busy && status) ? <span className={styles.status}> {progress || status}</span> : null}
            {error ? <span className={styles.error} role="alert" style={{ display: 'block' }}>{error}</span> : null}
          </span>
          {retryJob ? (
            <HubButton variant="purple" disabled={busy} onClick={() => void retryBrief()}>
              Save the brief again
            </HubButton>
          ) : (
            <HubButton variant="purple" disabled={busy || Boolean(published) || problems.length > 0} onClick={() => void publish()}>
              {published ? 'Published' : busy ? status || 'Publishing…' : lockNow ? `Lock ${formatUsdc(total)} & publish` : 'Publish'}
            </HubButton>
          )}
        </div>
      </div>
    </div>
  );
}

