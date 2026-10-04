// /new — the brief editor (WebContractNew board, workspace-plan W3). Freelancer (fresh on-chain lookup), title
// (32 bytes), scope, references, milestone cards (amount, submit by, review time, "Done when"), live brief fingerprint,
// summary and rules. Create → wallet panel confirm → core runCreate → created: invite link, QR for the phone,
// fingerprint. The Vietnam view shows the block message (D18). The key K is only ever in the invite link and the QR.
import { useMemo, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { AnimatePresence, m } from 'motion/react';
import QRCode from 'react-qr-code';
import { BriefNotSavedError, describeActionError, runCreate } from '@ned/core/actions.ts';
import { getConnection } from '@ned/core/config.ts';
import { recipientLabel, type Recipient } from '@ned/core/identity/resolveCore.ts';
import { briefHash } from '@ned/core/milestone/content.ts';
import { shortHash } from '@ned/core/milestone/evidence.ts';
import { formatDeadline, formatUsdc, unitsFromUsdc } from '@ned/core/milestone/format.ts';
import { FUND_SIZE, MAX_MILESTONES, MIN_REVIEW_WINDOW_SECS, MIN_WORK_WINDOW_SECS, TITLE_MAX_LEN } from '@ned/core/milestone/layout.ts';
import { useAuth } from '../auth/AuthProvider.tsx';
import { Avatar } from '../components/Avatar.tsx';
import { Icon } from '../components/icons.tsx';
import { useWalletPanel } from '../components/WalletPanelContext.tsx';
import { useActionEnv } from '../hooks/actions.ts';
import { resolveFreelancer } from '../hooks/identity.ts';
import { useUsername } from '../hooks/queries.ts';
import { useRegion } from '../hooks/region.ts';
import { useChainTime } from '../hooks/useChainTime.ts';
import { addCriterion, addReference, brief, canAddMilestone, draft, fromLocalInput, newMilestone, problems, REVIEWS, titleBytes, toLocalInput, type ContractForm, type MilestoneForm } from '../lib/newContract.ts';
import { rise, stateChange, staggerParent } from '../motion.ts';
import styles from './Flow.module.css';

const TOKEN_ACCOUNT_SIZE = 165;
/** Same quick choices as the phone (D1: picking a date and time by hand was slow and easy to get wrong) */
const DEADLINE_PRESETS = [
  { label: '+10 min (demo)', seconds: 600 },
  { label: '+1 day', seconds: 86_400 },
  { label: '+7 days', seconds: 7 * 86_400 },
];
/** Row enter / exit for milestone cards, criteria and references: transform and opacity only */
const row = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: stateChange },
  exit: { opacity: 0, scale: 0.98, transition: { ...stateChange, duration: 0.22 } },
};

/** Dev-only (VITE_DEV_TOOLS=1 builds): `?previewCreated` shows the created state with a dummy link, for screenshots */
const previewCreated =
  import.meta.env.VITE_DEV_TOOLS === '1' && new URLSearchParams(location.search).has('previewCreated')
    ? {
        fund: '85qNBP9ipSYKg3xnuPmSFpNVdnLK5rwzZvid6YeT1Tuo',
        inviteLink: 'https://unihackfest-2026.vercel.app/c/85qNBP9ipSYKg3xnuPmSFpNVdnLK5rwzZvid6YeT1Tuo#k=preview-not-a-real-key',
        fingerprint: '1855fb…1bef',
        who: '@vinh',
        total: '2.00 USDC',
      }
    : null;

export function NewContract() {
  const { walletAddress } = useAuth();
  const { region } = useRegion(walletAddress);
  const [created, setCreated] = useState<{ fund: string; inviteLink: string; fingerprint: string; who: string; total: string } | null>(previewCreated);
  return (
    <AnimatePresence mode="wait" initial={false}>
      {region === 'vn' ? (
        <Blocked key="vn" wallet={walletAddress} />
      ) : created ? (
        <Created key="created" {...created} />
      ) : (
        <Editor key="editor" onCreated={setCreated} />
      )}
    </AnimatePresence>
  );
}

// ---- Vietnam view (D18) ----

function Blocked({ wallet }: { wallet: string | null }) {
  const username = useUsername(wallet).data ?? null;
  const [copied, setCopied] = useState(false);
  const share = async () => {
    if (!username) return;
    try {
      await navigator.clipboard.writeText(`@${username}`);
      setCopied(true);
    } catch {
      // clipboard blocked
    }
  };
  return (
    <m.main id="main" className={styles.page} {...row}>
      <Crumb />
      <div className={styles.notice}>
        <h1 className={styles.noticeTitle}>New contracts come from your clients</h1>
        <p className={styles.noticeText}>
          You live in Vietnam, so N.E.D shows you the freelancer side only: you accept contracts from clients abroad and your earnings arrive in VND. Share your
          @username and your client creates the contract.
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.primaryBtn} onClick={share} disabled={!username} aria-live="polite">
            {copied ? `Copied @${username}` : username ? `Share @${username}` : 'Create your profile in the app to share it'}
          </button>
          <Link to="/" className={styles.ghost}>
            Back to Workspace
          </Link>
        </div>
      </div>
    </m.main>
  );
}

function Crumb() {
  return (
    <nav aria-label="Breadcrumb" className={styles.crumb}>
      <Link to="/">Workspace</Link> <span aria-hidden>/</span> New contract
    </nav>
  );
}

// ---- editor ----

function Editor({ onCreated }: { onCreated(c: { fund: string; inviteLink: string; fingerprint: string; who: string; total: string }): void }) {
  const { walletAddress } = useAuth();
  const { confirm } = useWalletPanel();
  const { env, status } = useActionEnv();
  const now = useChainTime();
  const nextId = useRef(3);
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [form, setForm] = useState<ContractForm>(() => ({
    freelancer: null,
    title: '',
    scope: '',
    references: [],
    milestones: [newMilestone(1, 0, Math.floor(Date.now() / 1000))],
  }));
  const [refDraft, setRefDraft] = useState('');
  const [refError, setRefError] = useState('');
  const [critErrors, setCritErrors] = useState<Record<number, string>>({});
  const [attempted, setAttempted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const issues = useMemo(() => problems(form, now, walletAddress ?? undefined), [form, now, walletAddress]);
  const issue = (field: string) => issues.find((p) => p.field === field)?.message;
  const fingerprint = useMemo(() => shortHash(briefHash(form.title.trim(), brief(form))), [form]);
  const totalUnits = form.milestones.reduce((s, ms) => s + (unitsFromUsdc(ms.amount) ?? 0n), 0n);
  const who = recipient ? recipientLabel(recipient) : 'the freelancer';
  const bytes = titleBytes(form.title);

  const set = (patch: Partial<ContractForm>) => setForm((f) => ({ ...f, ...patch }));
  const setMs = (id: number, patch: Partial<MilestoneForm>) =>
    setForm((f) => ({ ...f, milestones: f.milestones.map((ms) => (ms.id === id ? { ...ms, ...patch } : ms)) }));

  const addRef = () => {
    const r = addReference(form.references, refDraft);
    if ('error' in r) return setRefError(r.error);
    set({ references: r.list });
    setRefDraft('');
    setRefError('');
  };
  const addCrit = (ms: MilestoneForm) => {
    const r = addCriterion(ms.criteria, ms.draft);
    if ('error' in r) return setCritErrors((e) => ({ ...e, [ms.id]: r.error }));
    setMs(ms.id, { criteria: r.list, draft: '' });
    setCritErrors((e) => ({ ...e, [ms.id]: '' }));
  };
  const addMilestone = () => {
    const last = form.milestones[form.milestones.length - 1];
    const ms = newMilestone(nextId.current++, form.milestones.length, Math.floor(Date.now() / 1000));
    // a week after the previous deadline
    const prev = fromLocalInput(last?.submitBy ?? '');
    if (Number.isFinite(prev)) ms.submitBy = newMilestone(0, 0, prev).submitBy;
    set({ milestones: [...form.milestones, ms] });
  };

  const create = async () => {
    setAttempted(true);
    setError('');
    const d = draft(form);
    if (issues.length || !d || !recipient) return;
    let rent = '';
    try {
      const conn = getConnection();
      const lamports = (await conn.getMinimumBalanceForRentExemption(FUND_SIZE)) + (await conn.getMinimumBalanceForRentExemption(TOKEN_ACCOUNT_SIZE));
      rent = `${(lamports / 1e9).toFixed(4)} SOL`;
    } catch {
      rent = '';
    }
    const n = form.milestones.length;
    const ok = await confirm({
      title: 'Create contract',
      rows: [
        { label: 'Contract', value: d.title },
        { label: 'Freelancer', value: who },
        { label: 'Milestones', value: `${n} · ${formatUsdc(totalUnits)} total`, sub: `Locked later, after ${who} accepts` },
        { label: 'Brief fingerprint', value: fingerprint, sub: 'Saved on-chain, cannot change', mono: true },
        { label: 'Network fee', value: '~0.000005 SOL per transaction', sub: 'devnet test SOL · the brief adds 1–2 transactions' },
        ...(rent ? [{ label: 'Account rent', value: rent, sub: 'Returned to you when the contract is closed' }] : []),
        { label: 'N.E.D fee', value: 'None during the pilot' },
      ],
      note: { tone: 'purple', text: `No money moves yet. ${who} reads the brief from your invite link and confirms the same fingerprint when accepting.` },
      confirmLabel: 'Create',
    });
    if (!ok) return;
    setBusy(true);
    try {
      const result = await runCreate(env, d);
      onCreated({ fund: result.fund, inviteLink: result.inviteLink, fingerprint, who, total: formatUsdc(totalUnits) });
    } catch (err) {
      if (err instanceof BriefNotSavedError) {
        setError(`${err.message} Contract ${err.fund.slice(0, 4)}…${err.fund.slice(-4)}.`);
      } else {
        setError(describeActionError(err));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <m.main id="main" className={styles.page} {...row}>
      <Crumb />
      <div className={styles.head}>
        <h1 className={styles.h1}>New contract</h1>
        <ol aria-label="Steps" className={styles.steps}>
          <li className={styles.stepOn}>1 · Brief</li>
          <li>2 · {recipient ? recipientLabel(recipient) : 'Freelancer'} accepts</li>
          <li>3 · You lock</li>
          <li>4 · Work starts</li>
        </ol>
      </div>

      <div className={styles.grid}>
        <m.div className={styles.main} variants={staggerParent} initial="hidden" animate="shown">
          <m.div variants={rise} custom={0}>
            <Freelancer
              recipient={recipient}
              wallet={walletAddress}
              onChange={(r) => {
                setRecipient(r);
                set({ freelancer: r?.wallet ?? null });
              }}
              error={attempted ? issue('freelancer') : undefined}
            />
          </m.div>

          <m.section variants={rise} custom={1} aria-labelledby="cn-job" className={styles.card}>
            <h2 id="cn-job" className={styles.h2}>
              The job
            </h2>
            <div>
              <div className={styles.labelRow}>
                <label htmlFor="cn-title" className={styles.label}>
                  Title
                </label>
                <span className={bytes > TITLE_MAX_LEN ? styles.countOver : bytes >= TITLE_MAX_LEN ? styles.countFull : styles.count} aria-live="polite">
                  {bytes}/{TITLE_MAX_LEN}
                </span>
              </div>
              <input
                id="cn-title"
                className={styles.input}
                value={form.title}
                onChange={(e) => set({ title: e.target.value })}
                placeholder="Landing page design"
                aria-invalid={Boolean(issue('title') && (attempted || bytes > TITLE_MAX_LEN))}
                aria-describedby="cn-title-hint"
              />
              <p id="cn-title-hint" className={issue('title') && (attempted || bytes > TITLE_MAX_LEN) ? styles.error : styles.hint}>
                {issue('title') && (attempted || bytes > TITLE_MAX_LEN) ? issue('title') : 'Saved on-chain and visible to anyone. Keep private details for the scope.'}
              </p>
            </div>
            <div>
              <label htmlFor="cn-scope" className={styles.label}>
                What you need
              </label>
              <textarea
                id="cn-scope"
                className={styles.textarea}
                rows={5}
                value={form.scope}
                onChange={(e) => set({ scope: e.target.value })}
                placeholder="Describe the work, who it is for and anything the freelancer must use."
                aria-invalid={Boolean(issue('scope') && (attempted || form.scope))}
              />
              {issue('scope') && (attempted || form.scope) ? <p className={styles.error}>{issue('scope')}</p> : null}
            </div>
            <div>
              <div className={styles.label}>References</div>
              <ul className={styles.list}>
                <AnimatePresence initial={false}>
                  {form.references.map((url) => (
                    <m.li key={url} layout="position" className={styles.item} {...row}>
                      <Icon name="external" size={14} color="var(--caption)" />
                      <span className={styles.itemMono}>{url}</span>
                      <button type="button" className={styles.remove} aria-label={`Remove ${url}`} onClick={() => set({ references: form.references.filter((r) => r !== url) })}>
                        <Icon name="close" size={14} color="var(--caption)" />
                      </button>
                    </m.li>
                  ))}
                </AnimatePresence>
              </ul>
              <form
                className={styles.addRow}
                onSubmit={(e: FormEvent) => {
                  e.preventDefault();
                  addRef();
                }}
              >
                <label htmlFor="cn-ref" className="visually-hidden">
                  Add a reference link
                </label>
                <input
                  id="cn-ref"
                  type="url"
                  className={styles.inputSmall}
                  value={refDraft}
                  onChange={(e) => setRefDraft(e.target.value)}
                  placeholder="Paste a link to a brand guide, copy or example"
                />
                <button type="submit" className={styles.ghostBtn}>
                  Add
                </button>
              </form>
              {refError ? (
                <p className={styles.error} role="alert">
                  {refError}
                </p>
              ) : null}
            </div>
          </m.section>

          <m.section variants={rise} custom={2} aria-labelledby="cn-ms" className={styles.msSection}>
            <div className={styles.msHead}>
              <h2 id="cn-ms" className={styles.h2}>
                Milestones
              </h2>
              <span className={styles.hint}>Up to {MAX_MILESTONES} · each one is locked, submitted and released on its own</span>
            </div>
            <AnimatePresence initial={false}>
              {form.milestones.map((ms, i) => (
                <m.div key={ms.id} layout="position" role="group" aria-label={`Milestone ${i + 1}`} className={styles.card} {...row}>
                  <MilestoneCard
                    ms={ms}
                    index={i}
                    canRemove={form.milestones.length > 1}
                    attempted={attempted}
                    issue={issue}
                    critError={critErrors[ms.id] ?? ''}
                    onChange={(patch) => setMs(ms.id, patch)}
                    onAddCriterion={() => addCrit(ms)}
                    onRemove={() => set({ milestones: form.milestones.filter((x) => x.id !== ms.id) })}
                  />
                </m.div>
              ))}
            </AnimatePresence>
            {canAddMilestone(form) ? (
              <m.button layout="position" type="button" className={styles.addMs} onClick={addMilestone}>
                + Add milestone
              </m.button>
            ) : null}
          </m.section>
        </m.div>

        <m.aside aria-label="Summary" className={styles.aside} variants={staggerParent} initial="hidden" animate="shown">
          <m.div variants={rise} custom={1} className={styles.card}>
            <div className={styles.caption}>Total to lock</div>
            <div className={styles.total}>
              {formatUsdc(totalUnits).replace(' USDC', '')}
              <span className={styles.totalUnit}> USDC</span>
            </div>
            <div className={styles.caption}>
              {form.milestones.length} {form.milestones.length === 1 ? 'milestone' : 'milestones'} · locked after {who} accepts
            </div>
            <div className={styles.sumRows}>
              {form.milestones.map((ms, i) => {
                const at = fromLocalInput(ms.submitBy);
                return (
                  <div key={ms.id} className={styles.sumRow}>
                    <span className={styles.sumLabel}>
                      {i + 1}. {ms.name.trim() || 'Untitled'} · by {Number.isFinite(at) ? formatDeadline(at) : '—'}
                    </span>
                    <span className={styles.sumAmt}>{formatUsdc(unitsFromUsdc(ms.amount) ?? 0n).replace(' USDC', '')}</span>
                  </div>
                );
              })}
            </div>
          </m.div>
          <m.div variants={rise} custom={2} className={styles.fp}>
            <div className={styles.fpRow}>
              <span className={styles.fpLabel}>Brief fingerprint</span>
              <span className={styles.mono} aria-live="polite">
                {fingerprint}
              </span>
            </div>
            <p className={styles.fpText}>
              Changes as you type. When you create, it is saved on-chain and cannot change. {who === 'the freelancer' ? 'The freelancer' : who} confirms the same
              fingerprint when accepting, so you both agree on one brief.
            </p>
          </m.div>
          <m.div variants={rise} custom={3} className={styles.rules}>
            <div className={styles.rulesTitle}>Checked before you sign</div>
            At least {MIN_WORK_WINDOW_SECS} s to work before the first deadline on devnet · review time of at least {MIN_REVIEW_WINDOW_SECS} s · up to {MAX_MILESTONES}{' '}
            milestones · title up to {TITLE_MAX_LEN} bytes · up to 1,000 USDC in the demo.
          </m.div>
          <m.div variants={rise} custom={4} className={styles.createBox}>
            <button type="button" className={styles.create} onClick={create} disabled={busy} aria-disabled={issues.length > 0}>
              {busy ? status || 'Creating…' : 'Create contract'}
            </button>
            <p className={issues.length && attempted ? styles.error : styles.createHint} aria-live="polite">
              {error || (issues.length && attempted ? issues[0].message : 'Opens your wallet to confirm. No money moves at this step.')}
            </p>
          </m.div>
        </m.aside>
      </div>
    </m.main>
  );
}

function Freelancer({
  recipient,
  wallet,
  onChange,
  error,
}: {
  recipient: Recipient | null;
  wallet: string | null;
  onChange(r: Recipient | null): void;
  error?: string | undefined;
}) {
  const [query, setQuery] = useState('');
  const [looking, setLooking] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const find = async (e: FormEvent) => {
    e.preventDefault();
    setLooking(true);
    setLookupError('');
    try {
      // fresh: never trust a cached name → wallet mapping before signing
      const r = await resolveFreelancer(query);
      if (r.wallet === wallet) throw new Error('You cannot create a contract with yourself.');
      onChange(r);
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : 'No N.E.D account found.');
    } finally {
      setLooking(false);
    }
  };
  return (
    <section aria-labelledby="cn-fl" className={styles.card}>
      <h2 id="cn-fl" className={styles.h2}>
        Freelancer
      </h2>
      <AnimatePresence mode="wait" initial={false}>
        {recipient ? (
          <m.div key="chip" className={styles.chip} {...row}>
            <Avatar seed={recipient.wallet} size={44} decorative />
            <div className={styles.chipText}>
              <div className={styles.chipName}>
                {recipient.username ? `@${recipient.username}` : 'Wallet address'} <span className={styles.chipWallet}>{recipient.wallet.slice(0, 4)}…{recipient.wallet.slice(-4)}</span>
              </div>
              <div className={styles.caption}>Chooses where earnings go when accepting</div>
            </div>
            <button
              type="button"
              className={styles.linkBtn}
              onClick={() => {
                setQuery(recipient.username ? `@${recipient.username}` : recipient.wallet);
                onChange(null);
              }}
            >
              Change
            </button>
          </m.div>
        ) : (
          <m.form key="find" className={styles.addRow} onSubmit={find} {...row}>
            <label htmlFor="cn-fl-input" className="visually-hidden">
              Freelancer’s @username or wallet address
            </label>
            <input
              id="cn-fl-input"
              className={styles.input}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="@username or wallet address"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={Boolean(lookupError || error)}
              aria-describedby="cn-fl-hint"
            />
            <button type="submit" className={styles.primaryBtn} disabled={looking || !query.trim()}>
              {looking ? 'Checking…' : 'Find'}
            </button>
          </m.form>
        )}
      </AnimatePresence>
      <p id="cn-fl-hint" className={lookupError || error ? styles.error : styles.hint} role={lookupError ? 'alert' : undefined}>
        {lookupError || error || 'Read from the chain when you press Find, so the contract goes to the right wallet.'}
      </p>
    </section>
  );
}

function MilestoneCard({
  ms,
  index,
  canRemove,
  attempted,
  issue,
  critError,
  onChange,
  onAddCriterion,
  onRemove,
}: {
  ms: MilestoneForm;
  index: number;
  canRemove: boolean;
  attempted: boolean;
  issue(field: string): string | undefined;
  critError: string;
  onChange(patch: Partial<MilestoneForm>): void;
  onAddCriterion(): void;
  onRemove(): void;
}) {
  const n = index + 1;
  const id = (part: string) => `cn-ms-${ms.id}-${part}`;
  const amountError = issue(`milestones.${index}.amountUsdc`);
  const err =
    (attempted || ms.amount ? amountError : undefined) ??
    (attempted ? issue(`milestones.${index}.submitBy`) : undefined) ??
    issue(`milestones.${index}.reviewSeconds`) ??
    (attempted || ms.name ? issue(`milestones.${index}.name`) : undefined) ??
    issue(`milestones.${index}.criteria`) ??
    issue(`milestones.${index}.criteria.0`);
  return (
    <>
      <div className={styles.msTop}>
        <span className={styles.msNum} aria-hidden>
          {n}
        </span>
        <label htmlFor={id('name')} className="visually-hidden">
          Milestone {n} name
        </label>
        <input id={id('name')} className={styles.msName} value={ms.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="Name this milestone" />
        {canRemove ? (
          <button type="button" className={styles.removeMs} aria-label={`Remove milestone ${n}`} onClick={onRemove}>
            <Icon name="close" size={16} color="var(--caption)" />
          </button>
        ) : null}
      </div>
      <div className={styles.fields}>
        <div>
          <label htmlFor={id('amt')} className={styles.labelSmall}>
            Amount (USDC)
          </label>
          <input
            id={id('amt')}
            className={styles.amount}
            inputMode="decimal"
            value={ms.amount}
            placeholder="10.00"
            onChange={(e) => onChange({ amount: e.target.value.replace(',', '.') })}
            aria-invalid={Boolean(amountError && (attempted || ms.amount))}
          />
        </div>
        <div>
          <label htmlFor={id('date')} className={styles.labelSmall}>
            Submit by
          </label>
          <input id={id('date')} className={styles.inputSmall} type="datetime-local" value={ms.submitBy} onChange={(e) => onChange({ submitBy: e.target.value })} />
          <div className={styles.presets} role="group" aria-label={`Quick submission deadline for milestone ${n}`}>
            {DEADLINE_PRESETS.map((p) => (
              <button key={p.label} type="button" className={styles.preset} onClick={() => onChange({ submitBy: toLocalInput(Math.floor(Date.now() / 1000) + p.seconds) })}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor={id('rev')} className={styles.labelSmall}>
            Review time after submit
          </label>
          <select id={id('rev')} className={styles.inputSmall} value={ms.reviewSeconds} onChange={(e) => onChange({ reviewSeconds: Number(e.target.value) })}>
            {REVIEWS.map((r) => (
              <option key={r.seconds} value={r.seconds}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <div className={styles.labelRow}>
          <span className={styles.label}>Done when…</span>
          <span className={styles.hint}>The freelancer checks these before submitting; you check them before releasing.</span>
        </div>
        <ul className={styles.list}>
          <AnimatePresence initial={false}>
            {ms.criteria.map((c) => (
              <m.li key={c} layout="position" className={styles.item} {...row}>
                <Icon name="check" size={14} color="var(--success-ink)" width={2.6} />
                <span className={styles.itemText}>{c}</span>
                <button type="button" className={styles.remove} aria-label={`Remove: ${c}`} onClick={() => onChange({ criteria: ms.criteria.filter((x) => x !== c) })}>
                  <Icon name="close" size={14} color="var(--caption)" />
                </button>
              </m.li>
            ))}
          </AnimatePresence>
        </ul>
        <form
          className={styles.addRow}
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            onAddCriterion();
          }}
        >
          <label htmlFor={id('crit')} className="visually-hidden">
            Add a criterion to milestone {n}
          </label>
          <input
            id={id('crit')}
            className={styles.inputSmall}
            value={ms.draft}
            onChange={(e) => onChange({ draft: e.target.value })}
            placeholder="Add something you can check, e.g. “Works on mobile”"
          />
          <button type="submit" className={styles.ghostBtn}>
            Add
          </button>
        </form>
        {critError || err ? (
          <p className={styles.error} role="alert">
            {critError || err}
          </p>
        ) : null}
      </div>
    </>
  );
}

// ---- created ----

function Created({ fund, inviteLink, fingerprint, who, total }: { fund: string; inviteLink: string; fingerprint: string; who: string; total: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard blocked: the link stays selectable
    }
  };
  return (
    <m.main id="main" className={styles.page} {...row}>
      <Crumb />
      <div className={styles.created}>
        <div className={styles.createdMain}>
          <div className={styles.okDot} aria-hidden>
            <Icon name="check" size={26} color="var(--success-ink)" width={2.6} />
          </div>
          <h1 className={styles.createdTitle}>Contract created</h1>
          <p className={styles.noticeText}>
            Send this invite link to {who}. The brief travels inside it, encrypted: the part after # is the key, and browsers never send that part to a server.
            Anyone with the link can read the brief, but it cannot move any money.
          </p>
          <div className={styles.linkRow}>
            <input className={styles.linkBox} readOnly value={inviteLink} aria-label="Invite link" onFocus={(e) => e.currentTarget.select()} />
            <button type="button" className={styles.primaryBtn} onClick={copy} aria-live="polite">
              {copied ? 'Copied' : 'Copy link'}
            </button>
          </div>
          <div className={styles.facts}>
            <div className={styles.fact}>
              <div className={styles.caption}>Brief fingerprint · on-chain</div>
              <div className={styles.factMono}>{fingerprint}</div>
            </div>
            <div className={styles.fact}>
              <div className={styles.caption}>Next</div>
              <div className={styles.factText}>
                {who} accepts, then you lock {total}
              </div>
            </div>
          </div>
          <div className={styles.actions}>
            <Link to={`/contract/${fund}`} className={styles.ghost}>
              View contract
            </Link>
            <Link to="/" className={styles.plainLink}>
              Back to Workspace
            </Link>
          </div>
        </div>
        <div className={styles.qrCard}>
          <div className={styles.qr}>
            <QRCode value={inviteLink} size={176} fgColor="#111116" bgColor="#F4F4F6" title="QR code of the invite link" />
          </div>
          <div className={styles.qrTitle}>Open on a phone</div>
          <p className={styles.caption}>Scan to open this contract in the N.E.D app, or show it to {who}.</p>
        </div>
      </div>
    </m.main>
  );
}
