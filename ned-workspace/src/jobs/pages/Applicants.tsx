// /jobs/:job/applicants — the business's view of one listing (WebJobApplicants board; appendix H.18): state, budget,
// Withdraw (with its reason until rules allow it), the applicants with their pitch and track-record facts, Select →
// confirmation sheet → runSelectJob, then "Waiting for @x to accept" and "Hired @x". Re-select after the accept window.
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { describeActionError } from '@ned/core/actions.ts';
import { runSelectJob, runWithdrawJob } from '@ned/core/jobs/actions.ts';
import type { JobApplicationAccount, JobListingAccount } from '@ned/core/jobs/decode.ts';
import { acceptWindowOver, canSelect, canWithdraw } from '@ned/core/jobs/rules.ts';
import type { FundAccount } from '@ned/core/milestone/decode.ts';
import { formatCountdown, formatDeadline, formatUsdc } from '@ned/core/milestone/format.ts';
import { Avatar } from '../../components/Avatar.tsx';
import { useWalletPanel } from '../../components/WalletPanelContext.tsx';
import { useActionEnv } from '../../hooks/actions.ts';
import { useChainTime } from '../../hooks/useChainTime.ts';
import { shortAddress } from '../../lib/format.ts';
import { Chip } from '../components/Chip.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { HubButton } from '../components/HubButton.tsx';
import { HubIcon } from '../components/HubIcon.tsx';
import { useApplicants, useDisplayNames, useJob, useJobBrief, useTrackRecords } from '../hooks.ts';
import { useHubViewer } from '../JobsLayout.tsx';
import { ACCEPT_WINDOW_LABEL, acceptBy, applicantFacts, completedCount } from '../labels.ts';
import hub from '../hub.module.css';
import styles from './Job.module.css';

export function Applicants() {
  const { job: address } = useParams();
  const viewer = useHubViewer();
  const job = useJob(address);
  const apps = useApplicants(address);
  const brief = useJobBrief(job.data);
  const wallets = (apps.data ?? []).map((a) => a.freelancer.toBase58());
  const names = useDisplayNames(wallets).data ?? {};
  const records = useTrackRecords(wallets, 'freelancer').data;
  const now = useChainTime();
  const back = (
    <Link to="/jobs/find?tab=listings" className={styles.back}>
      <HubIcon name="arrowLeft" size={14} />
      My listings
    </Link>
  );
  if (job.isPending) return <Frame back={back}><div className={styles.card} aria-busy="true">Reading the job from Solana…</div></Frame>;
  if (!job.data) return <Frame back={back}><EmptyState icon="briefcase" title="This job does not exist" action={<HubButton to="/jobs/find">Find jobs</HubButton>} /></Frame>;
  if (viewer.wallet !== job.data.business.toBase58())
    return (
      <Frame back={back}>
        <EmptyState
          icon="lock"
          title="Only the business that posted this job can see its applicants"
          body={viewer.signedIn ? 'Sign in with the wallet that posted it.' : 'Sign in first.'}
          action={<HubButton to={`/jobs/${job.data.address.toBase58()}`}>View public listing</HubButton>}
        />
      </Frame>
    );
  return (
    <Frame back={back}>
      <ApplicantsView
        job={job.data}
        applications={apps.data ?? null}
        names={names}
        records={records}
        briefOk={brief.data?.status === 'ok'}
        now={now}
        me={viewer.wallet}
      />
    </Frame>
  );
}

function Frame({ back, children }: { back: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={styles.page}>
      <div className={`${hub.container} ${styles.pageInner}`}>
        {back}
        {children}
      </div>
    </div>
  );
}

export interface ApplicantsViewProps {
  job: JobListingAccount;
  applications: JobApplicationAccount[] | null;
  names: Record<string, string>;
  records?: Record<string, FundAccount[]>;
  briefOk: boolean;
  now: number;
  me: string;
}

/** Why Withdraw is not available yet (H.18) */
export function withdrawReason(job: JobListingAccount, now: number, name: (w: string) => string): string {
  if (job.state === 'Filled') return 'The budget moved into the contract.';
  if (job.state === 'Withdrawn') return 'The budget was returned to you.';
  if (job.state === 'Open') {
    if (job.applicationCount === 0) return 'No one has applied yet, so you can withdraw now.';
    if (now > job.selectBy) return 'Select-by has passed with no one hired, so you can withdraw now.';
    return `Withdraw opens after ${formatDeadline(job.selectBy)} if you hire no one. People applied because the budget is locked, so it stays until then.`;
  }
  const after = Math.max(job.selectBy, acceptBy(job));
  if (now > after) return `${name(job.selected?.toBase58() ?? '')} didn't accept in time, so you can withdraw now.`;
  return `Withdraw opens after ${formatDeadline(after)} if ${name(job.selected?.toBase58() ?? '')} doesn't accept.`;
}

export function ApplicantsView(p: ApplicantsViewProps) {
  const { job } = p;
  const { env, status } = useActionEnv();
  const { confirm, ensureConsent } = useWalletPanel();
  const queryClient = useQueryClient();
  const [sort, setSort] = useState<'new' | 'record'>('new');
  const [choosing, setChoosing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const name = (w: string) => p.names[w] ?? shortAddress(w);
  const total = formatUsdc(job.total);
  const chosen = job.selected?.toBase58() ?? null;
  const selectable = canSelect(job, p.me, p.now);
  const withdrawable = canWithdraw(job, p.me, p.now);
  const waiting = job.state === 'Selected';
  const over = waiting && acceptWindowOver(job, p.now);

  const list = [...(p.applications ?? [])].sort((a, b) =>
    sort === 'record' ? completedCount(p.records?.[b.freelancer.toBase58()]) - completedCount(p.records?.[a.freelancer.toBase58()]) || b.createdAt - a.createdAt : b.createdAt - a.createdAt
  );
  const stateLabel = job.state === 'Filled' ? 'Filled' : job.state === 'Withdrawn' ? 'Withdrawn' : waiting ? (over ? 'Selected · accept time over' : 'Selected · waiting to accept') : `Open · select by ${formatDeadline(job.selectBy)}`;
  const lockLabel = job.state === 'Filled' ? `${total} moved into the contract` : job.state === 'Withdrawn' ? `${total} returned to you` : `Budget locked · ${total}`;

  const withdraw = async () => {
    setError('');
    const ok = await confirm({
      title: 'Withdraw budget',
      rows: [
        { label: 'Job', value: job.title },
        { label: 'Back to your wallet', value: total },
        { label: 'Network fee', value: '~0.000005 SOL', sub: 'devnet test SOL' },
      ],
      note: { tone: 'warning', text: 'The listing closes and stays on Solana as a record. No one can apply or be selected after this.' },
      confirmLabel: 'Withdraw',
    });
    if (!ok) return;
    setBusy(true);
    try {
      await runWithdrawJob(env, job.address.toBase58());
      await queryClient.invalidateQueries({ queryKey: ['jobs'] });
    } catch (err) {
      setError(describeActionError(err));
    } finally {
      setBusy(false);
    }
  };

  const select = async (freelancer: string) => {
    setError('');
    setBusy(true);
    try {
      await runSelectJob(env, job.address.toBase58(), freelancer);
      setChoosing(null);
      await queryClient.invalidateQueries({ queryKey: ['jobs'] });
    } catch (err) {
      setError(describeActionError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <section aria-labelledby="ja-title" className={styles.card}>
        <div className={styles.appHead}>
          <div style={{ minWidth: 0, flex: '1 1 320px' }}>
            <div className={styles.chips}>
              <Chip tone={job.state === 'Open' ? 'success' : job.state === 'Filled' ? 'purple' : waiting ? (over ? 'warning' : 'info') : 'neutral'}>{stateLabel}</Chip>
              <Chip tone={job.state === 'Withdrawn' ? 'neutral' : 'success'}>
                <HubIcon name="lock" size={12} width={2.4} />
                {lockLabel}
              </Chip>
            </div>
            <h1 id="ja-title" className={styles.h1}>
              {job.title}
            </h1>
            <div className={styles.note} style={{ marginTop: 6 }}>
              {job.milestoneCount === 1 ? '1 milestone' : `${job.milestoneCount} milestones`} · applications {p.now > job.applyBy ? 'closed' : 'close'} {formatDeadline(job.applyBy)} · select by{' '}
              {formatDeadline(job.selectBy)}
            </div>
          </div>
          <div className={styles.actions}>
            <HubButton variant="outline" to={`/jobs/${job.address.toBase58()}`}>
              View public listing
            </HubButton>
            {job.state === 'Open' || job.state === 'Selected' ? (
              <HubButton variant="dark" disabled={!withdrawable || busy} aria-describedby="ja-wd" onClick={() => void withdraw()}>
                Withdraw budget
              </HubButton>
            ) : null}
          </div>
        </div>
        <p id="ja-wd" className={styles.fine}>
          {withdrawReason(job, p.now, name)}
        </p>
        {error && !choosing ? <p className={styles.error} role="alert">{error}</p> : null}
      </section>

      {waiting && chosen ? (
        <section className={styles.banner} aria-live="polite">
          <Avatar seed={chosen} size={44} decorative />
          <span className={styles.bannerText}>
            <span className={styles.bannerTitle}>
              {over ? `${name(chosen)} didn't accept in time` : `Waiting for ${name(chosen)} to accept · ${formatCountdown(acceptBy(job) - p.now)} left`}
            </span>
            {over
              ? 'You can select someone else now. Their contract is closed in the same step, so it can no longer be accepted.'
              : `The contract is created. When ${name(chosen)} accepts, the ${total} moves into it and work starts. If the time runs out, you can select someone else.`}
          </span>
          {job.fund ? (
            <HubButton variant="outline" to={`/contract/${job.fund.toBase58()}`}>
              Open contract
            </HubButton>
          ) : null}
        </section>
      ) : null}
      {job.state === 'Filled' && chosen ? (
        <section className={styles.banner} aria-live="polite">
          <Avatar seed={chosen} size={44} decorative />
          <span className={styles.bannerText}>
            <span className={styles.bannerTitle}>
              Hired {name(chosen)} · {total} moved into the contract
            </span>
            The listing is filled. Other applicants now see "Not selected".
          </span>
          {job.fund ? (
            <HubButton variant="dark" to={`/contract/${job.fund.toBase58()}`}>
              Open contract
            </HubButton>
          ) : null}
        </section>
      ) : null}

      <section aria-labelledby="ja-list" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className={styles.h2Row}>
          <h2 id="ja-list" className={styles.h2}>
            Applicants <span className={styles.note}>· {job.applicationCount}</span>
          </h2>
          <label className={styles.note}>
            Sort{' '}
            <select className={styles.input} style={{ width: 'auto', height: 36, display: 'inline-block', marginTop: 0 }} value={sort} onChange={(e) => setSort(e.target.value as 'new' | 'record')}>
              <option value="new">Newest first</option>
              <option value="record">Most contracts completed</option>
            </select>
          </label>
        </div>
        {!p.briefOk && job.state === 'Open' ? <p className={styles.warn}>The public brief is missing or does not match. Selecting needs the saved brief.</p> : null}
        {p.applications === null ? (
          <div className={styles.card} aria-busy="true">Reading applications…</div>
        ) : !list.length ? (
          <EmptyState title="No applicants yet" body="Applications show up here as freelancers apply. You can withdraw the budget at any time until someone applies." />
        ) : (
          list.map((a) => {
            const w = a.freelancer.toBase58();
            const isChosen = w === chosen;
            const tag = isChosen ? (job.state === 'Filled' ? 'Hired' : 'Selected') : job.state === 'Filled' ? 'Not selected' : '';
            const facts = p.records?.[w] ? applicantFacts(p.records[w], p.me) : ['Reading track record…'];
            const canPick = selectable && p.briefOk && !(isChosen && !over);
            return (
              <article key={w} className={styles.applicant} data-testid="applicant">
                <Avatar seed={w} size={48} decorative />
                <div className={styles.applicantMain}>
                  <div className={styles.applicantTop}>
                    <strong>{name(w)}</strong>
                    <span className={styles.note}>applied {formatDeadline(a.createdAt)}</span>
                    {tag ? <Chip tone={tag === 'Not selected' ? 'neutral' : tag === 'Hired' ? 'purple' : 'info'}>{tag}</Chip> : null}
                  </div>
                  <p className={styles.pitch}>{a.pitch}</p>
                  <div className={styles.facts}>
                    {facts.map((f) => (
                      <span key={f} className={styles.chipSoft}>
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <HubButton variant={canPick ? 'purple' : 'outline'} disabled={!canPick || busy} onClick={() => ensureConsent() && setChoosing(w)}>
                    {isChosen ? (job.state === 'Filled' ? 'Hired' : over ? 'Select again' : 'Selected') : 'Select'}
                  </HubButton>
                </div>
              </article>
            );
          })
        )}
        <p className={styles.fine}>Track records are counted from contracts on Solana, not ratings. Pitches are public. N.E.D does not vet or rank applicants.</p>
      </section>

      {choosing ? (
        <SelectSheet job={job} who={name(choosing)} seed={choosing} now={p.now} busy={busy} status={status} error={error} onCancel={() => setChoosing(null)} onConfirm={() => void select(choosing)} />
      ) : null}
    </>
  );
}

function SelectSheet(p: { job: JobListingAccount; who: string; seed: string; now: number; busy: boolean; status: string; error: string; onCancel(): void; onConfirm(): void }) {
  const total = formatUsdc(p.job.total);
  const dialog = useRef<HTMLDivElement>(null);
  const { busy, onCancel } = p;
  useEffect(() => {
    dialog.current?.querySelector<HTMLButtonElement>('button')?.focus();
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onCancel();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);
  return (
    <div className={styles.backdrop}>
      <div ref={dialog} className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="ja-sheet">
        <div className={styles.proofHead}>
          <Avatar seed={p.seed} size={44} decorative />
          <h2 id="ja-sheet" className={styles.h2}>
            Select {p.who}?
          </h2>
        </div>
        <p className={styles.para}>This creates a contract with your brief and these deadlines, counted from now:</p>
        {p.job.milestones.map((m) => {
          const submitBy = p.now + m.workSecs;
          return (
            <div key={m.index} className={styles.sheetRow}>
              <span>
                <strong>Milestone {m.index + 1}</strong>
                <span className={styles.note} style={{ display: 'block' }}>
                  Submit by {formatDeadline(submitBy)} · review by {formatDeadline(submitBy + m.reviewSecs)}
                </span>
              </span>
              <strong>{formatUsdc(m.amount)}</strong>
            </div>
          );
        })}
        <ul className={styles.sheetList}>
          <li>
            The {total} moves from the job into the contract when {p.who} accepts.
          </li>
          <li>
            If {p.who} doesn't accept within {ACCEPT_WINDOW_LABEL}, you can select someone else.
          </li>
          <li>Your wallet asks you to confirm a few small transactions: the contract, its encrypted brief, and the contract key for both of you.</li>
        </ul>
        {p.busy && p.status ? <p className={styles.status}>{p.status}</p> : null}
        {p.error ? <p className={styles.error} role="alert">{p.error}</p> : null}
        <div className={styles.sheetButtons}>
          <HubButton variant="outline" disabled={p.busy} onClick={p.onCancel}>
            Cancel
          </HubButton>
          <HubButton variant="purple" disabled={p.busy} onClick={p.onConfirm}>
            {p.busy ? p.status || 'Creating…' : 'Create contract & select'}
          </HubButton>
        </div>
      </div>
    </div>
  );
}
