// /jobs/:job — one listing (WebJobDetail board; appendix H.16): the public brief checked against its fingerprint,
// the milestone template, the locked budget, the business's record, and the Apply card (open → applied → selected).
import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { describeActionError } from '@ned/core/actions.ts';
import type { JobBriefResult } from '@ned/core/jobs/brief.ts';
import type { JobApplicationAccount, JobListingAccount } from '@ned/core/jobs/decode.ts';
import { JOB_APPLICATION_SIZE, JOB_PITCH_MAX_LEN } from '@ned/core/jobs/layout.ts';
import { jobVaultPda } from '@ned/core/jobs/pda.ts';
import { runApplyJob } from '@ned/core/jobs/actions.ts';
import { canApply } from '@ned/core/jobs/rules.ts';
import { categoryLabel, listingSkills } from '@ned/core/jobs/taxonomy.ts';
import { getConnection } from '@ned/core/config.ts';
import { formatDeadline } from '@ned/core/milestone/format.ts';
import type { FundAccount } from '@ned/core/milestone/decode.ts';
import { Avatar } from '../../components/Avatar.tsx';
import { useWalletPanel } from '../../components/WalletPanelContext.tsx';
import { useActionEnv } from '../../hooks/actions.ts';
import { ensureDeviceRegistered } from '../../hooks/keySync.ts';
import { useChainTime } from '../../hooks/useChainTime.ts';
import { useAuth } from '../../auth/AuthProvider.tsx';
import { shortAddress } from '../../lib/format.ts';
import { Chip } from '../components/Chip.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { HubButton } from '../components/HubButton.tsx';
import { HubIcon } from '../components/HubIcon.tsx';
import { MoneyText } from '../components/MoneyText.tsx';
import { useDisplayNames, useJob, useJobBrief, useMyApplication, useTrackRecords } from '../hooks.ts';
import { useHubViewer } from '../JobsLayout.tsx';
import { ACCEPT_WINDOW_LABEL, acceptBy, businessFacts, dueLabel, untilLabel } from '../labels.ts';
import hub from '../hub.module.css';
import styles from './Job.module.css';

const explorer = (address: string) => `https://explorer.solana.com/address/${address}?cluster=devnet`;
export const PITCH_HINT = "Public on Solana. Don't put names or personal details here.";
export const BRIEF_OK = 'Brief verified · matches its fingerprint on Solana';
export const BRIEF_BAD = "The public brief does not match its fingerprint on Solana. Don't apply until the business saves it again.";
export const BRIEF_MISSING = 'The public brief is not on Solana yet.';
const utf8 = (s: string) => new TextEncoder().encode(s).length;

export function JobDetail() {
  const { job: address } = useParams();
  const viewer = useHubViewer();
  const job = useJob(address);
  const brief = useJobBrief(job.data);
  const application = useMyApplication(address, viewer.wallet);
  const business = job.data?.business.toBase58();
  const records = useTrackRecords(business ? [business] : [], 'client');
  const names = useDisplayNames(business ? [business] : []).data ?? {};
  const now = useChainTime();
  if (job.isPending) return <Shell><div className={styles.card} aria-busy="true">Reading the job from Solana…</div></Shell>;
  if (!job.data)
    return (
      <Shell>
        <EmptyState icon="briefcase" title="This job does not exist" body="It may have been posted on another network, or the link is incomplete." action={<HubButton to="/jobs/find">Find jobs</HubButton>} />
      </Shell>
    );
  return (
    <JobDetailView
      job={job.data}
      brief={brief.data ?? null}
      application={application.data ?? null}
      records={business ? records.data?.[business] : undefined}
      businessName={business ? (names[business] ?? shortAddress(business)) : ''}
      now={now}
      vn={viewer.vn}
      me={viewer.wallet}
    />
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.page}>
      <div className={`${hub.container} ${styles.pageInner}`}>
        <Link to="/jobs/find" className={styles.back}>
          <HubIcon name="arrowLeft" size={14} />
          All jobs
        </Link>
        {children}
      </div>
    </div>
  );
}

export interface JobDetailViewProps {
  job: JobListingAccount;
  brief: JobBriefResult | null;
  application: JobApplicationAccount | null;
  records?: FundAccount[];
  businessName: string;
  now: number;
  vn: boolean;
  me: string | null;
}

export function JobDetailView(p: JobDetailViewProps) {
  const { job } = p;
  const skills = listingSkills(job.skills);
  const b = p.brief?.status === 'ok' ? p.brief.brief : undefined;
  // The job vault for the Explorer link (falls back to the listing if the address cannot be derived here)
  let vault = job.address.toBase58();
  try {
    vault = jobVaultPda(job.address).toBase58();
  } catch {
    // keep the listing address
  }
  return (
    <Shell>
      <div className={styles.cols}>
        <main className={styles.main}>
          <section aria-labelledby="jd-title" className={styles.card}>
            <div className={styles.chips}>
              <Chip tone="purple">{categoryLabel(job.category)}</Chip>
              {skills.map((k) => (
                <span key={k.id} className={styles.chipSoft}>
                  {k.label}
                </span>
              ))}
            </div>
            <h1 id="jd-title" className={styles.h1}>
              {job.title}
            </h1>
            <p className={styles.lead}>{job.summary}</p>
            <div className={styles.byline}>
              <span className={styles.who}>
                <Avatar seed={job.business.toBase58()} size={32} decorative />
                <span>
                  <span className={styles.whoName}>{p.businessName}</span>
                  <span className={styles.whoSub}> · posted {formatDeadline(job.createdAt)}</span>
                </span>
              </span>
              {!p.brief ? (
                <Chip tone="neutral">Checking the brief…</Chip>
              ) : p.brief.status === 'ok' ? (
                <Chip tone="success">
                  <HubIcon name="check" size={12} width={2.6} />
                  {BRIEF_OK}
                </Chip>
              ) : (
                <Chip tone="warning">{p.brief.status === 'missing' ? BRIEF_MISSING : 'Brief does not match'}</Chip>
              )}
            </div>
            {p.brief?.status === 'mismatch' ? <p className={styles.warn} role="alert" style={{ marginTop: 12 }}>{BRIEF_BAD}</p> : null}
          </section>

          {b ? (
            <section aria-labelledby="jd-scope" className={styles.card}>
              <h2 id="jd-scope" className={styles.h2}>
                Scope
              </h2>
              <p className={styles.text}>{b.scope}</p>
              {b.references.length ? (
                <div className={styles.links}>
                  {b.references.map((r) => (
                    <a key={r} href={r} target="_blank" rel="noopener noreferrer" className={styles.linkChip}>
                      <HubIcon name="external" size={12} />
                      {r.replace(/^https?:\/\//, '')}
                    </a>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

          <section aria-labelledby="jd-ms" className={styles.card}>
            <div className={styles.h2Row}>
              <h2 id="jd-ms" className={styles.h2}>
                Milestones
              </h2>
              <span className={styles.note}>Each milestone is released after the client accepts it</span>
            </div>
            <div className={styles.ms}>
              {job.milestones.map((m) => {
                const bm = b?.milestones[m.index];
                return (
                  <div key={m.index} className={styles.msItem}>
                    <div className={styles.msHead}>
                      <span className={styles.msN}>{m.index + 1}</span>
                      <span className={styles.msMain}>
                        <span className={styles.msName}>{bm?.name || `Milestone ${m.index + 1}`}</span>
                        <span className={styles.msWhen}>{dueLabel(m.workSecs, m.reviewSecs)}</span>
                      </span>
                      <MoneyText units={m.amount} vn={p.vn} size={15} sub="test USDC on devnet" />
                    </div>
                    {bm?.criteria.length ? (
                      <>
                        <div className={styles.doneLabel}>Done when</div>
                        <ul className={styles.done}>
                          {bm.criteria.map((c) => (
                            <li key={c}>{c}</li>
                          ))}
                        </ul>
                      </>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>

          <div className={styles.two}>
            <section aria-labelledby="jd-proof" className={styles.card}>
              <div className={styles.proofHead}>
                <span className={styles.proofIcon} aria-hidden>
                  <HubIcon name="lock" size={16} />
                </span>
                <h2 id="jd-proof" className={styles.h2}>
                  Budget locked
                </h2>
              </div>
              <div className={styles.big}>
                <MoneyText units={job.total} vn={p.vn} size={26} sub="test USDC on devnet" />
              </div>
              <p className={styles.para}>
                {job.state === 'Filled'
                  ? 'The budget moved into the hired freelancer’s contract.'
                  : job.state === 'Withdrawn'
                    ? `Nobody was hired, so the budget went back to ${p.businessName}.`
                    : `Locked in a program vault on Solana when the job was posted. It moves into your contract when you accept. It goes back to ${p.businessName} only if nobody is hired.`}
              </p>
              <a href={explorer(vault)} target="_blank" rel="noopener noreferrer" className={styles.extLink}>
                View the vault on Explorer
                <HubIcon name="external" size={13} />
              </a>
            </section>
            <section aria-labelledby="jd-rec" className={styles.card}>
              <div className={styles.proofHead}>
                <Avatar seed={job.business.toBase58()} size={36} decorative />
                <h2 id="jd-rec" className={styles.h2}>
                  {p.businessName} on N.E.D
                </h2>
              </div>
              <dl className={styles.dl}>
                {(p.records ? businessFacts(p.records) : []).map((f) => (
                  <FactRow key={f.label} {...f} />
                ))}
              </dl>
              {!p.records ? <p className={styles.small}>Reading contracts…</p> : null}
              <p className={styles.fine}>Counted from contracts on Solana. Not a rating.</p>
            </section>
          </div>
        </main>
        <aside aria-label="Apply" className={styles.aside}>
          <ApplyCard {...p} />
          <HowItWorks {...p} />
        </aside>
      </div>
    </Shell>
  );
}

const FactRow = ({ label, value }: { label: string; value: string }) => (
  <>
    <dt>{label}</dt>
    <dd>{value}</dd>
  </>
);

function ApplyCard(p: JobDetailViewProps) {
  const { job } = p;
  const location = useLocation();
  const { env, status } = useActionEnv();
  const { walletAddress, signTransaction } = useAuth();
  const { confirm, openWalletAt } = useWalletPanel();
  const queryClient = useQueryClient();
  const [pitch, setPitch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const bytes = utf8(pitch.trim());
  const over = bytes > JOB_PITCH_MAX_LEN;
  const own = p.me === job.business.toBase58();
  const selectedMe = Boolean(p.me && job.selected?.toBase58() === p.me);
  const applied = Boolean(p.application);
  const open = canApply(job, p.me ?? '11111111111111111111111111111111', p.now, applied) && !own;

  const apply = async () => {
    setError('');
    let rent = '';
    try {
      rent = `${((await getConnection().getMinimumBalanceForRentExemption(JOB_APPLICATION_SIZE)) / 1e9).toFixed(4)} SOL`;
    } catch {
      rent = '';
    }
    const ok = await confirm({
      title: 'Apply to this job',
      rows: [
        { label: 'Job', value: job.title },
        { label: 'Your pitch', value: `${bytes} bytes`, sub: 'Public on Solana' },
        ...(rent ? [{ label: 'Account rent', value: rent, sub: 'Kept by your application record' }] : []),
        { label: 'Network fee', value: '~0.000005 SOL', sub: 'devnet test SOL' },
        { label: 'N.E.D fee', value: 'None during the pilot' },
      ],
      note: { tone: 'purple', text: 'Nothing is locked from your wallet. If you are selected, the business creates the contract and you accept it.' },
      confirmLabel: 'Apply',
    });
    if (!ok) return;
    setBusy(true);
    try {
      // Key sync (D22): register this computer first, so a contract made for you can be read here
      if (walletAddress) await ensureDeviceRegistered({ walletAddress, signTransaction }).catch(() => false);
      await runApplyJob(env, job.address.toBase58(), pitch);
      await queryClient.invalidateQueries({ queryKey: ['jobs'] });
    } catch (err) {
      setError(describeActionError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.small}>Budget</div>
      <MoneyText units={job.total} vn={p.vn} size={26} sub="test USDC on devnet" />
      <dl className={styles.dl}>
        <dt>Apply by</dt>
        <dd>{untilLabel(job.applyBy, p.now)}</dd>
        <dt>Client selects by</dt>
        <dd>{formatDeadline(job.selectBy)}</dd>
        <dt>If selected, accept within</dt>
        <dd>{ACCEPT_WINDOW_LABEL}</dd>
        <dt>Applicants</dt>
        <dd>{job.applicationCount}</dd>
      </dl>

      {own ? (
        <div className={styles.state} style={{ marginTop: 14 }}>
          <div className={styles.stateTitle}>This is your job</div>
          <HubButton variant="dark" className={styles.wide} to={`/jobs/${job.address.toBase58()}/applicants`}>
            Review applicants
          </HubButton>
        </div>
      ) : selectedMe && job.state === 'Selected' ? (
        <div className={`${styles.state} ${styles.stateGood}`} style={{ marginTop: 14 }}>
          <div className={styles.stateTitle}>You were selected</div>
          <p className={styles.para}>
            {p.businessName} created your contract with this brief. Accept by {formatDeadline(acceptBy(job))}. When you accept, the locked budget moves into
            your contract and you can start.
          </p>
          <HubButton variant="purple" className={styles.wide} onClick={() => openWalletAt(`/contracts/${job.fund?.toBase58() ?? ''}`)}>
            Review &amp; accept in wallet
          </HubButton>
        </div>
      ) : selectedMe && job.state === 'Filled' ? (
        <div className={`${styles.state} ${styles.stateGood}`} style={{ marginTop: 14 }}>
          <div className={styles.stateTitle}>You're hired</div>
          <p className={styles.para}>The budget moved into your contract. Submit each milestone from the contract page.</p>
          <HubButton variant="dark" className={styles.wide} to={`/contract/${job.fund?.toBase58() ?? ''}`}>
            Open contract
          </HubButton>
        </div>
      ) : applied ? (
        <div className={styles.state} style={{ marginTop: 14 }}>
          <div className={styles.stateTitle}>{job.state === 'Filled' ? 'Not selected' : `Applied · ${formatDeadline(p.application!.createdAt)}`}</div>
          <p className={styles.para}>
            {job.state === 'Filled'
              ? 'Another applicant was hired for this job.'
              : `${p.businessName} selects by ${formatDeadline(job.selectBy)}. You'll get a notification if you're selected.`}
          </p>
          <div className={styles.quote}>{p.application!.pitch}</div>
        </div>
      ) : !p.me ? (
        <HubButton variant="purple" className={styles.wide} to={`/sign-in?next=${encodeURIComponent(location.pathname)}`}>
          Sign in to apply
        </HubButton>
      ) : open ? (
        <div>
          <label htmlFor="jd-pitch" className={styles.label}>
            Your pitch
          </label>
          <textarea
            id="jd-pitch"
            rows={5}
            className={styles.textarea}
            value={pitch}
            onChange={(e) => setPitch(e.target.value)}
            placeholder="Why you fit this job, and one link to similar work."
          />
          <div className={styles.counter}>
            <span>{PITCH_HINT}</span>
            <span className={`${styles.counterN} ${over ? styles.over : ''}`} aria-live="polite">
              {bytes} / {JOB_PITCH_MAX_LEN}
            </span>
          </div>
          <HubButton variant="purple" className={styles.wide} disabled={busy || over || !bytes} onClick={() => void apply()}>
            {busy ? status || 'Applying…' : 'Apply'}
          </HubButton>
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
          <p className={styles.fine}>
            {p.vn
              ? 'If you are hired, you choose VND to your bank when you accept (through a payout partner, simulated in this demo).'
              : 'If you are hired, you choose where earnings go when you accept.'}{' '}
            One wallet confirmation; the network fee is test SOL on devnet.
          </p>
        </div>
      ) : (
        <div className={styles.state} style={{ marginTop: 14 }}>
          <div className={styles.stateTitle}>Applications are closed</div>
          <p className={styles.para}>{job.state === 'Withdrawn' ? 'The business withdrew this job.' : 'This job no longer takes applications.'}</p>
        </div>
      )}
    </div>
  );
}

function HowItWorks(p: JobDetailViewProps) {
  const selectedMe = Boolean(p.me && p.job.selected?.toBase58() === p.me);
  const reached = selectedMe ? (p.job.state === 'Filled' ? 3 : 2) : p.application ? 1 : 0;
  const steps = [
    ['Apply', 'A short public pitch.'],
    ['Get selected', `${p.businessName} picks one applicant and creates the contract.`],
    ['Accept', p.vn ? 'Choose VND to your bank. The budget moves into your contract.' : 'Choose where earnings go. The budget moves into your contract.'],
    ['Submit each milestone', 'Share a watermarked preview first; final files after release.'],
    ['Released', 'After the client accepts, or when review time ends.'],
  ];
  return (
    <div className={styles.card}>
      <h2 className={styles.h2}>How it works</h2>
      <ol className={styles.steps}>
        {steps.map(([title, sub], i) => (
          <li key={title} className={styles.step}>
            <span className={`${styles.stepN} ${i < reached ? styles.stepDone : i === reached ? styles.stepNow : ''}`}>{i + 1}</span>
            <span>
              <span className={styles.stepTitle}>{title}</span>
              {sub}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

