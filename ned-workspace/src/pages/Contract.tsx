// /contract/:fund (workspace-plan W2, S7): state, other party, amounts in the money view, destination, vault proof, the
// brief (ok / mismatch / noKey / missing, with "Paste the contract link"), milestones with chain-time countdowns and a
// Delivery line (U1), and the role's next step. Release now / Refund now (U4, both parties), Move locked budget (job
// contracts) and the D27 controls (behind FEATURES.dispute) run here after the wallet panel's confirm sheet.
import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { m } from 'motion/react';
import type { FundAccount } from '@ned/core/milestone/decode.ts';
import { formatDeadline, formatUsdc, unitsFromUsdc } from '@ned/core/milestone/format.ts';
import { unsettled } from '@ned/core/milestone/rules.ts';
import type { FundView, MilestoneView } from '@ned/core/milestone/view.ts';
import { useAuth } from '../auth/AuthProvider.tsx';
import { Avatar } from '../components/Avatar.tsx';
import { partyName } from '../components/ContractsTable.tsx';
import { Icon } from '../components/icons.tsx';
import { StatusChip } from '../components/StatusChip.tsx';
import { env, FEATURES } from '../config.ts';
import { useContractActions } from '../hooks/contractActions.ts';
import { useRegion } from '../hooks/region.ts';
import { useContractContent, type ContractContentState } from '../hooks/useContractContent.ts';
import { isFundAddress, useFund } from '../hooks/useFund.ts';
import { rise, staggerParent } from '../motion.ts';
import { useWalletPanel } from '../components/WalletPanelContext.tsx';
import { FinalFilesCard } from '../components/FinalFilesCard.tsx';
import { useReleases } from '../hooks/useReleases.ts';
import { useChainTime } from '../hooks/useChainTime.ts';
import { acceptedVersion, closeWarnings, handoverStatus, type HandoverStatus } from '@ned/core/milestone/handover.ts';
import type { ReleaseRecord } from '@ned/core/milestone/records.ts';
import styles from './Contract.module.css';

export function Contract() {
  const { fund: address } = useParams();
  const { walletAddress } = useAuth();
  const { region } = useRegion(walletAddress);
  const vn = region === 'vn';
  const base = useFund(address, walletAddress, region);
  const content = useContractContent(base.raw?.fund, walletAddress);
  const { fund } = useFund(address, walletAddress, region, {
    ...(content.content ? { content: content.content } : {}),
    ...(content.inviteLink ? { inviteLink: content.inviteLink } : {}),
  });
  const raw = base.raw?.fund ?? null;
  const actions = useContractActions(address, fund, raw);
  const releases = useReleases(isFundAddress(address) ? address : undefined, raw);
  const now = useChainTime();

  if (!isFundAddress(address) || base.missing) {
    return (
      <main id="main" className={styles.page}>
        <div className={styles.card}>
          <h1 className={styles.cardTitle}>Contract not found</h1>
          <p className={styles.muted}>This contract does not exist on devnet, or it was closed.</p>
          <Link to="/" className={styles.secondary}>
            Back to the overview
          </Link>
        </div>
      </main>
    );
  }
  if (!fund || !raw) {
    return (
      <main id="main" className={styles.page} aria-busy="true">
        <p className={styles.muted}>{base.error ? 'Could not read this contract. We try again every few seconds.' : 'Reading the contract from the chain…'}</p>
      </main>
    );
  }
  // A third party (someone with the link, not client or freelancer) sees the contract but no next step
  const isParty = Boolean(walletAddress && (raw.client.toBase58() === walletAddress || raw.freelancer.toBase58() === walletAddress));
  return <ContractView fund={fund} raw={raw} content={content} vn={vn} isParty={isParty} p1={FEATURES.dispute} actions={actions} releases={releases} now={now} />;
}

export interface ContractViewProps {
  fund: FundView;
  raw: FundAccount;
  content: ContractContentState;
  vn: boolean;
  isParty: boolean;
  /** FEATURES.dispute: every D27 control */
  p1: boolean;
  actions: ContractActions;
  /** F2: release records of this contract (time, signature, approve or Release now), when read */
  releases?: ReleaseRecord[];
  /** chain time, for the hand-over status */
  now?: number;
}
type ContractActions = Pick<ReturnType<typeof useContractActions>, 'run' | 'busy' | 'status' | 'error'>;

export function ContractView({ fund, raw, content, vn, isParty, p1, actions, releases = [], now = Math.floor(Date.now() / 1000) }: ContractViewProps) {
  const [splitOpen, setSplitOpen] = useState(false);
  const showFiles = isParty && fund.milestones.some((m) => m.status === 'released' || m.status === 'refunded' || m.status === 'cancelled' || m.delivery);
  return (
    <m.main id="main" className={styles.page} variants={staggerParent} initial="hidden" animate="shown">
      <m.div variants={rise} custom={0} className={styles.top}>
        <Link to="/" className={styles.back} aria-label="Back to the overview">
          <Icon name="back" size={18} />
        </Link>
        <h1 className={styles.title}>{fund.title}</h1>
      </m.div>
      <m.div variants={rise} custom={0} className={styles.chips}>
        <StatusChip tone={fund.tone}>{fund.statusLabel}</StatusChip>
        <span className={styles.devnet} aria-label="Devnet, test money">
          <span className={styles.devnetDot} aria-hidden />
          DEVNET
        </span>
      </m.div>

      {isParty ? <NextStep fund={fund} raw={raw} actions={actions} /> : null}
      {isParty && actions.error ? (
        <p className={styles.error} role="alert">
          {actions.error}
        </p>
      ) : null}
      {isParty && p1 && fund.split ? <SplitBanner fund={fund} actions={actions} /> : null}

      <m.div variants={rise} custom={1} className={styles.party}>
        <Avatar seed={fund.counterparty.wallet} size={42} decorative />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className={styles.partyName}>{partyName(fund)}</span>
            <span className={styles.roleTag}>{fund.role === 'client' ? 'FREELANCER' : 'CLIENT'}</span>
          </div>
          <div className={styles.muted}>
            {fund.role === 'client' ? 'You lock the money; they deliver.' : 'They lock the money; you deliver.'}
          </div>
        </div>
      </m.div>

      <m.div variants={rise} custom={2} className={styles.hero}>
        <div className={styles.heroLabel}>{fund.state === 'funded' ? (vn ? 'Locked for you' : 'Locked in this contract') : 'Contract total'}</div>
        <div className={styles.heroAmt}>{fund.state === 'funded' ? fund.lockedLabel : fund.totalLabel}</div>
        <div className={styles.heroSub}>
          {fund.state === 'funded' ? `of ${fund.totalLabel} · ${fund.milestones.length} milestones` : `${fund.milestones.length} milestones`}
        </div>
        {fund.destination ? (
          <div className={styles.dest}>
            <span>Earnings go to:</span>
            <strong>{fund.destination.label}</strong>
            {fund.destination.simulated ? <span className={styles.tag}>SIMULATED</span> : null}
          </div>
        ) : null}
        {fund.state === 'funded' || fund.state === 'settled' ? (
          <a className={styles.vault} href={fund.vaultExplorerUrl} target="_blank" rel="noopener noreferrer">
            <span>
              Held by the program, not by N.E.D · <span className={styles.mono}>vault</span>
            </span>
            <span className={styles.vaultLink}>
              Explorer <Icon name="external" size={14} />
            </span>
          </a>
        ) : (
          <div className={styles.notFunded}>
            {fund.actions.includes('lockFromJob')
              ? 'Accepted. The budget is still in the job; move it into this contract to start.'
              : fund.state === 'created'
                ? 'Nothing is locked yet. The freelancer accepts first, then the client locks.'
                : 'Accepted. Nothing is locked until the client locks.'}
          </div>
        )}
      </m.div>

      <m.div variants={rise} custom={3}>
        <Brief fund={fund} content={content} />
      </m.div>

      <m.h2 variants={rise} custom={4} className={styles.h2}>
        Milestones
      </m.h2>
      {fund.milestones.map((ms) => (
        <m.div key={ms.index} variants={rise} custom={4}>
          <Milestone fund={fund} ms={ms} vn={vn} isParty={isParty} p1={p1} actions={actions} onSplit={() => setSplitOpen(true)} />
        </m.div>
      ))}

      {showFiles ? (
        <m.section variants={rise} custom={4} id="files" aria-labelledby="files-title" className={styles.filesSection}>
          <h2 id="files-title" className={styles.h2}>
            Files
          </h2>
          {fund.milestones.map((ms) => (
            <FilesRow key={ms.index} fund={fund} raw={raw} ms={ms} now={now} release={releases.find((r) => r.index === ms.index)} />
          ))}
        </m.section>
      ) : null}

      <m.details variants={rise} custom={4} className={styles.card}>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>How this contract works</summary>
        <ul className={styles.rules}>
          <li>Each milestone is released when the client accepts it. If the client does not review before the review deadline, anyone can release the milestone to the freelancer. Nothing happens by itself: someone presses Release now.</li>
          <li>If a submission deadline passes with nothing submitted, anyone can refund that milestone to the client.</li>
          {p1 ? <li>The client can request changes before the review deadline. The amount then stays locked until both sides agree: the client accepts a revised version, the freelancer returns it, or both agree a split. Nobody outside the contract decides.</li> : null}
          <li>The money sits in a program vault. No instruction lets anyone, including N.E.D, move it any other way. Until the final, the team can still upgrade the program (see Disclosures).</li>
        </ul>
        <a href={`${env.mobileOrigin}/disclosures`} target="_blank" rel="noreferrer">
          Disclosures
        </a>
      </m.details>
      {splitOpen ? <SplitSheet fund={fund} raw={raw} onCancel={() => setSplitOpen(false)} onPropose={(units) => { setSplitOpen(false); void actions.run('proposeSplit', 0, units); }} /> : null}
    </m.main>
  );
}

const reviewHref = (fund: FundView, i: number) => `/contract/${fund.address}/review?i=${i}`;
const submitHref = (fund: FundView, i: number, mode?: 'revision' | 'handover') => `/contract/${fund.address}/submit?i=${i}${mode ? `&mode=${mode}` : ''}`;

/** The role's next step: submit / review / revision / handover have pages; Release now, Refund now and Move locked
 * budget run here (wallet confirm first); accept, lock and close open the contract in the wallet extension (W6) */
function NextStep({ fund, raw, actions }: { fund: FundView; raw: FundAccount; actions: ContractActions }) {
  const { openWalletAt } = useWalletPanel();
  const [warn, setWarn] = useState(false);
  const pending = closeWarnings(raw, Object.fromEntries(fund.milestones.map((m) => [m.index, m.history])));
  const openWallet = () => openWalletAt(`/contracts/${fund.address}`);
  const next = fund.nextAction;
  if (!next) {
    const m0 = fund.milestones.find((ms) => ms.countdown);
    return m0 ? (
      <div className={styles.next}>
        <span className={styles.nextText}>
          <strong>Next · </strong>
          {m0.countdown!.label}.
        </span>
      </div>
    ) : null;
  }
  const i = next.milestone ?? 0;
  const page: Record<string, string> = {
    submit: submitHref(fund, i),
    approve: reviewHref(fund, i),
    sendRevision: submitHref(fund, i, 'revision'),
    handover: submitHref(fund, i, 'handover'),
  };
  const runsHere = next.kind === 'releaseNow' || next.kind === 'refundNow' || next.kind === 'lockFromJob' || next.kind === 'acceptSplit';
  return (
    <div className={styles.next}>
      <span className={styles.nextText}>
        <strong>Next · </strong>
        {next.detail ?? next.label}
        {page[next.kind] || runsHere ? '' : '. Do it in your wallet.'}
      </span>
      {page[next.kind] ? (
        <Link to={page[next.kind]} className={styles.primary}>
          {next.kind === 'submit' ? 'Open delivery form' : next.kind === 'approve' ? 'Review delivery' : next.label}
        </Link>
      ) : runsHere ? (
        <button type="button" className={styles.primary} disabled={Boolean(actions.busy)} onClick={() => void actions.run(next.kind as 'releaseNow', i)}>
          {actions.busy === next.kind ? actions.status || 'Working…' : next.label}
        </button>
      ) : (
        <button type="button" className={styles.primary} onClick={() => (next.kind === 'close' && pending.length ? setWarn(true) : openWallet())}>
          Open in wallet
        </button>
      )}
      {warn ? (
        <CloseWarning
          fund={fund}
          pending={pending}
          onKeep={() => setWarn(false)}
          onClose={() => {
            setWarn(false);
            openWallet();
          }}
        />
      ) : null}
    </div>
  );
}

/** F2: closing ends the page for both sides, after which the freelancer cannot hand over */
export const CLOSE_WARNING = (name: string, milestones: string) =>
  `${name} ${name === 'You' ? 'have' : 'has'} not handed over the final files for ${milestones}. Closing ends this contract's page for both of you, and ${name === 'You' ? 'you' : name} can no longer hand them over.`;
/** "milestone 1", "milestones 1 and 2", "milestones 1, 2 and 3" */
export const milestonesLabel = (indices: number[]) => {
  const n = indices.map((i) => String(i + 1));
  return n.length === 1 ? `milestone ${n[0]}` : `milestones ${n.slice(0, -1).join(', ')} and ${n.at(-1)}`;
};

function CloseWarning({ fund, pending, onKeep, onClose }: { fund: FundView; pending: number[]; onKeep(): void; onClose(): void }) {
  const other = partyName(fund);
  const n = milestonesLabel(pending);
  return (
    <div className={styles.backdrop}>
      <div className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="close-warn-title">
        <h2 id="close-warn-title" className={styles.sheetTitle}>
          Final files not handed over
        </h2>
        <p className={styles.bannerText} data-testid="close-warning">
          {CLOSE_WARNING(fund.role === 'client' ? other : 'You', n)}
        </p>
        <div className={styles.sheetButtons}>
          <button type="button" className={styles.secondary} onClick={onClose}>
            Close anyway
          </button>
          <button type="button" className={styles.primary} onClick={onKeep} autoFocus>
            Keep open
          </button>
        </div>
      </div>
    </div>
  );
}

const FILE_STATUS: Record<HandoverStatus, string> = {
  'not-due': 'Before release',
  waiting: 'Waiting for final files',
  late: 'Late · after 48 hours (a reminder only)',
  'handed-over': 'Handed over',
  'not-applicable': 'No final files',
};

/** F2 "Files": one row per milestone; a released (or refunded / split) milestone shows its Final files card */
function FilesRow({ fund, raw, ms, now, release }: { fund: FundView; raw: FundAccount; ms: MilestoneView; now: number; release?: ReleaseRecord }) {
  const status = handoverStatus(raw, ms.index, ms.history, release?.releasedAt || undefined, now);
  const accepted = acceptedVersion(ms.history);
  return (
    <div id={`files-m${ms.index + 1}`} className={styles.filesRow} data-testid="files-row">
      <div className={styles.filesHead}>
        <span className={styles.msName}>
          Milestone {ms.index + 1}
          {ms.name ? ` · ${ms.name}` : ''}
        </span>
        <span className={styles.muted}>
          {FILE_STATUS[status]}
          {accepted ? ` · Version ${accepted.index}` : ''}
        </span>
      </div>
      {status !== 'not-due' ? (
        <FinalFilesCard
          fundAddress={fund.address}
          title={fund.title}
          raw={raw}
          ms={ms}
          role={fund.role === 'client' ? 'client' : 'freelancer'}
          other={partyName(fund)}
          now={now}
          {...(release ? { release } : {})}
          {...(ms.actions.includes('handover') ? { handoverHref: submitHref(fund, ms.index, 'handover') } : {})}
        />
      ) : null}
    </div>
  );
}

function SplitBanner({ fund, actions }: { fund: FundView; actions: ContractActions }) {
  const split = fund.split!;
  const other = partyName(fund);
  const freelancer = fund.role === 'client' ? other : 'You';
  const client = fund.role === 'client' ? 'you' : other;
  return (
    <div className={styles.split} role="status">
      <span className={styles.splitText}>
        <strong>{split.proposedByMe ? 'You proposed a split' : `${other} proposed a split`}</strong> · {freelancer} {freelancer === 'You' ? 'receive' : 'receives'}{' '}
        {split.toFreelancerLabel}, {client} {client === 'you' ? 'get' : 'gets'} back {split.toClientLabel}. A split settles every milestone that is still open in this
        contract, not only one.
      </span>
      {fund.actions.includes('acceptSplit') ? (
        <button type="button" className={styles.primary} disabled={Boolean(actions.busy)} onClick={() => void actions.run('acceptSplit')}>
          {actions.busy === 'acceptSplit' ? actions.status || 'Working…' : 'Accept split'}
        </button>
      ) : (
        <span className={styles.muted}>Waiting for {other}</span>
      )}
    </div>
  );
}

function SplitSheet({ fund, raw, onCancel, onPropose }: { fund: FundView; raw: FundAccount; onCancel(): void; onPropose(units: bigint): void }) {
  const [value, setValue] = useState('');
  const open = unsettled(raw);
  const units = unitsFromUsdc(value);
  const ok = units !== null && units >= 0n && units <= open;
  const other = partyName(fund);
  const freelancer = fund.role === 'client' ? other : 'You';
  const client = fund.role === 'client' ? 'You' : other;
  return (
    <div className={styles.backdrop}>
      <div className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="split-title">
        <h2 id="split-title" className={styles.sheetTitle}>
          Propose a split
        </h2>
        <p className={styles.bannerText}>A split settles every milestone that is still open in this contract, not only this one. Still locked: {formatUsdc(open)}.</p>
        <label className={styles.bannerText} htmlFor="split-amount">
          {freelancer === 'You' ? 'You receive' : `${freelancer} receives`} (USDC)
        </label>
        <input id="split-amount" className={styles.amountInput} inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
        <div className={styles.sheetRow}>
          <span>{freelancer === 'You' ? 'You receive' : `${freelancer} receives`}</span>
          <strong className={styles.mono}>{ok ? formatUsdc(units!) : '—'}</strong>
        </div>
        <div className={styles.sheetRow}>
          <span>{client === 'You' ? 'You get back' : `${client} gets back`}</span>
          <strong className={styles.mono}>{ok ? formatUsdc(open - units!) : '—'}</strong>
        </div>
        {value && !ok ? <p className={styles.error}>Enter an amount from 0 to {formatUsdc(open)}.</p> : null}
        <div className={styles.sheetButtons}>
          <button type="button" className={styles.secondary} onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className={styles.primary} disabled={!ok} onClick={() => onPropose(units!)}>
            Propose split
          </button>
        </div>
      </div>
    </div>
  );
}

function Brief({ fund, content }: { fund: FundView; content: ContractContentState }) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<'' | 'ok' | 'bad'>('');
  const brief = content.content?.brief;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await content.importKey(input);
    setResult(ok ? 'ok' : 'bad');
    if (ok) setInput('');
  };
  return (
    <section className={styles.card} aria-labelledby="brief-title">
      <div className={styles.briefHead}>
        <h2 id="brief-title" className={styles.cardTitle}>
          Brief
        </h2>
        <span className={styles.muted}>
          Fingerprint <span className={styles.mono}>{fund.briefHash}</span>
        </span>
      </div>
      {content.contentStatus === 'loading' ? <p className={styles.muted}>Reading the brief…</p> : null}
      {content.contentStatus === 'ok' && brief ? (
        <>
          <p className={styles.ok}>Brief matches the contract ✓</p>
          <p className={styles.scope}>{brief.scope}</p>
          {brief.references.length ? (
            <ul className={styles.refs}>
              {brief.references.map((r) => (
                <li key={r}>
                  <a href={r} target="_blank" rel="noopener noreferrer">
                    {r}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
      {content.contentStatus === 'mismatch' ? (
        <div className={styles.notice} style={{ background: 'var(--warning-bg)', color: 'var(--warning-ink)' }}>
          The brief saved with this contract does not match its fingerprint, or this key is not the contract's key. Do not rely
          on it; ask the other party for the contract link.
        </div>
      ) : null}
      {content.contentStatus === 'missing' ? (
        <p className={styles.muted}>No brief was saved with this contract.</p>
      ) : null}
      {content.contentStatus === 'noKey' || content.contentStatus === 'mismatch' ? (
        <form onSubmit={(e) => void submit(e)} className={styles.pasteRow} aria-label="Paste the contract link">
          {content.contentStatus === 'noKey' ? (
            <p className={styles.muted} style={{ flexBasis: '100%' }}>
              This computer cannot open the brief yet. Open N.E.D on a device you used for this contract before and it unlocks here by itself, or paste the contract link.
            </p>
          ) : null}
          <label className="visually-hidden" htmlFor="paste-link">
            Paste the contract link
          </label>
          <input
            id="paste-link"
            className={styles.paste}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setResult('');
            }}
            placeholder="Paste the contract link (…/c/…#k=…)"
            autoComplete="off"
            spellCheck={false}
          />
          <button type="submit" className={styles.secondary} disabled={!input.trim()}>
            Open the brief
          </button>
          {result === 'bad' ? (
            <p className={styles.bad} role="alert" style={{ flexBasis: '100%', margin: 0 }}>
              This is not the link of this contract.
            </p>
          ) : null}
        </form>
      ) : null}
    </section>
  );
}

function Milestone({ fund, ms, vn, isParty, p1, actions, onSplit }: { fund: FundView; ms: MilestoneView; vn: boolean; isParty: boolean; p1: boolean; actions: ContractActions; onSplit(): void }) {
  const d = ms.delivery;
  const other = partyName(fund);
  const first = ms.history?.deliveries.find((x) => x.stage === 'first')?.content ?? d?.content;
  const versions = ms.history?.deliveries.filter((x) => x.stage !== 'handover').length ?? 0;
  // D18: the Vietnam view has no client actions
  const anyone = isParty && !(vn && fund.role === 'client');
  return (
    <div role="group" aria-label={`Milestone ${ms.index + 1}`} className={styles.ms}>
      <div className={styles.msTop}>
        <div>
          <div className={styles.msName}>
            Milestone {ms.index + 1}
            {ms.name ? ` · ${ms.name}` : ''}
          </div>
          <div style={{ marginTop: 6 }}>
            <StatusChip tone={ms.tone}>{ms.statusLabel}</StatusChip>
          </div>
        </div>
        <div className={styles.msAmt}>
          <span className={styles.msAmtValue}>{ms.amountLabel.replace(' (estimate)', '')}</span>
          {vn ? <span className={styles.msAmtSub}>estimate · {formatUsdc(ms.amountUnits).replace(' USDC', '')} USD</span> : null}
        </div>
      </div>
      <div className={styles.dates}>
        <div className={styles.date}>
          <div className={styles.dateLabel}>Submit by</div>
          <div className={styles.dateValue}>{formatDeadline(ms.submitBy)}</div>
        </div>
        <div className={styles.date}>
          <div className={styles.dateLabel}>Review by</div>
          <div className={styles.dateValue}>{formatDeadline(ms.reviewBy)}</div>
        </div>
      </div>
      {ms.countdown ? (
        <div role="timer" className={styles.timer}>
          <span>{ms.countdown.label}</span>
        </div>
      ) : null}
      {ms.criteria?.length ? (
        <ul className={styles.criteria} aria-label="Done when">
          {ms.criteria.map((c) => (
            <li key={c}>
              <Icon name="check" size={14} color="var(--success-ink)" />
              {c}
            </li>
          ))}
        </ul>
      ) : null}
      {d ? (
        <div className={styles.deliveryLine} data-testid="delivery-line">
          <span>
            Submitted {formatDeadline(d.submittedAt)}
            {first ? ` · ${countLabel(first.links.length, 'link')} · ${countLabel(first.files.length, 'file')}` : ''}
            {versions > 1 ? ` · ${versions} versions` : ''}
            {d.onTime ? '' : ' · late'}
          </span>
          <Link to={reviewHref(fund, ms.index)} className={styles.deliveryLink}>
            View delivery
          </Link>
        </div>
      ) : null}
      {p1 && isParty ? <D27Banner fund={fund} ms={ms} other={other} actions={actions} onSplit={onSplit} /> : null}
      {anyone && (ms.actions.includes('releaseNow') || ms.actions.includes('refundNow')) ? (
        <div className={styles.msActions}>
          {ms.actions.includes('releaseNow') ? (
            <button type="button" className={styles.primary} disabled={Boolean(actions.busy)} onClick={() => void actions.run('releaseNow', ms.index)}>
              {actions.busy === 'releaseNow' ? actions.status || 'Working…' : 'Release now'}
            </button>
          ) : null}
          {ms.actions.includes('refundNow') ? (
            <button type="button" className={styles.secondary} disabled={Boolean(actions.busy)} onClick={() => void actions.run('refundNow', ms.index)}>
              {actions.busy === 'refundNow' ? actions.status || 'Working…' : 'Refund now'}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

const countLabel = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** D27 banners: changes requested (with the unmet points and reason), revised version, final files */
function D27Banner({ fund, ms, other, actions, onSplit }: { fund: FundView; ms: MilestoneView; other: string; actions: ContractActions; onSplit(): void }) {
  const review = ms.history?.reviews.at(-1);
  const client = fund.role === 'client';
  if (ms.status === 'disputed') {
    const revised = ms.statusLabel.startsWith('Revised');
    return (
      <div className={styles.banner} data-testid="d27-banner">
        <span className={styles.bannerTitle}>{ms.statusLabel}</span>
        {review ? (
          <>
            {review.content.unmet.length ? (
              <ul className={styles.unmet} aria-label="Not met">
                {review.content.unmet.map((i) => (
                  <li key={i}>{ms.criteria?.[i] ?? `Done-when point ${i + 1}`}</li>
                ))}
              </ul>
            ) : null}
            {review.content.reason ? <p className={styles.reason}>{review.content.reason}</p> : null}
          </>
        ) : null}
        <p className={styles.bannerText}>{ms.statusLine}</p>
        <div className={styles.bannerActions}>
          {client && revised ? (
            <Link to={reviewHref(fund, ms.index)} className={styles.primary}>
              Review revised version
            </Link>
          ) : null}
          {!client && ms.actions.includes('sendRevision') ? (
            <Link to={submitHref(fund, ms.index, 'revision')} className={styles.primary}>
              Send revised version
            </Link>
          ) : null}
          {fund.actions.includes('proposeSplit') ? (
            <button type="button" className={styles.secondary} onClick={onSplit}>
              Propose a split
            </button>
          ) : null}
          {fund.actions.includes('acceptSplit') ? (
            <button type="button" className={styles.secondary} onClick={() => void actions.run('acceptSplit')}>
              Accept split
            </button>
          ) : null}
          {ms.actions.includes('concede') ? (
            <button type="button" className={`${styles.secondary} ${styles.danger}`} disabled={Boolean(actions.busy)} onClick={() => void actions.run('concede', ms.index)}>
              Return to client
            </button>
          ) : null}
        </div>
        {!client && !revised ? <p className={styles.bannerText}>{other} can accept a revised version, or you can both agree a split.</p> : null}
      </div>
    );
  }
  if (ms.status === 'released' && ms.history) {
    const handed = ms.history.deliveries.some((x) => x.stage === 'handover');
    return (
      <div className={`${styles.banner} ${handed ? styles.bannerOk : styles.bannerInfo}`} data-testid="d27-banner">
        <span className={styles.bannerTitle}>{ms.statusLabel}</span>
        {client ? (
          <p className={styles.bannerText}>
            {handed ? 'Download them and check them against the list promised before you accepted.' : `${other} can now hand over the final files; N.E.D cannot make them. You can check them against the list promised before you accepted.`}
          </p>
        ) : (
          <p className={styles.bannerText}>Share the final files now. {other} can check them against the list you promised before they accepted.</p>
        )}
        <div className={styles.bannerActions}>
          {client ? (
            <a href={`#files-m${ms.index + 1}`} className={handed ? styles.primary : styles.secondary}>
              {handed ? 'Get final files' : 'View status'}
            </a>
          ) : ms.actions.includes('handover') ? (
            <Link to={submitHref(fund, ms.index, 'handover')} className={handed ? styles.secondary : styles.primary}>
              {handed ? 'Hand over again' : 'Hand over final files'}
            </Link>
          ) : null}
        </div>
      </div>
    );
  }
  return null;
}
