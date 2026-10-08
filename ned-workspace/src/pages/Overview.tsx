// / — Overview (WebWorkspace board, who = mia / vinh): greeting + call to action, three stats, needs-your-action
// cards, the contracts table. Vietnam view: ≈ VND, no "New contract", no client actions (decision D18).
import { useState } from 'react';
import { Link } from 'react-router';
import { m } from 'motion/react';
import { USD_VND_RATE_DATE } from '@ned/core/constants.ts';
import { formatDeadline, formatUsdc, usdcFromUnits, vndFromUnits } from '@ned/core/milestone/format.ts';
import { unsettled } from '@ned/core/milestone/rules.ts';
import type { ActionKind, ChipTone, FundAccount, FundView } from '@ned/core/milestone/view.ts';
import { useAuth } from '../auth/AuthProvider.tsx';
import { ContractsTable, partyName } from '../components/ContractsTable.tsx';
import { Icon, type IconName } from '../components/icons.tsx';
import { StatusChip } from '../components/StatusChip.tsx';
import { WorkspaceNav } from '../components/WorkspaceNav.tsx';
import shell from '../components/Shell.module.css';
import { useFundAccounts, useFunds, useUsername } from '../hooks/queries.ts';
import { useRegion } from '../hooks/region.ts';
import { useAccount } from '../hooks/account.ts';
import { shortAddress } from '../lib/format.ts';
import { rise, staggerParent } from '../motion.ts';
import { useWalletPanel } from '../components/WalletPanelContext.tsx';
import styles from './Overview.module.css';

// Steps with a Workspace page open it; the others open the contract in the wallet extension (the phone app, W6)
/** Next actions that open the contract page here (it runs them, or links to their page) instead of the wallet */
const ONSITE = new Set<ActionKind>(['accept', 'releaseNow', 'refundNow', 'lockFromJob', 'sendRevision', 'handover', 'acceptSplit']);

const LOOK: Partial<Record<ActionKind, { icon: IconName; tone: string; cta: string; path?: 'submit' | 'review' }>> = {
  submit: { icon: 'submit', tone: 'purple', cta: 'Open delivery form', path: 'submit' },
  approve: { icon: 'review', tone: 'info', cta: 'Review delivery', path: 'review' },
  releaseNow: { icon: 'release', tone: 'success', cta: 'Release now' },
  refundNow: { icon: 'release', tone: 'warning', cta: 'Refund now' },
  lockFromJob: { icon: 'lock', tone: 'info', cta: 'Move locked budget' },
  sendRevision: { icon: 'submit', tone: 'warning', cta: 'Send revised version' },
  handover: { icon: 'submit', tone: 'success', cta: 'Hand over final files' },
  acceptSplit: { icon: 'check', tone: 'purple', cta: 'Review the split' },
  accept: { icon: 'check', tone: 'info', cta: 'Read and accept' },
  lock: { icon: 'lock', tone: 'info', cta: 'Lock in wallet' },
  close: { icon: 'close', tone: 'neutral', cta: 'Close in wallet' },
};

const vnd = (units: bigint) => `≈ ${vndFromUnits(units).toLocaleString('en-US')} VND`;
const rateDay = new Date(`${USD_VND_RATE_DATE}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const mine = (k: { toBase58(): string }, w: string) => k.toBase58() === w;

function greeting(date = new Date()) {
  const h = date.getHours();
  return h < 12 ? 'Good morning,' : h < 18 ? 'Good afternoon,' : 'Good evening,';
}

function peopleLine(views: FundView[], vn: boolean) {
  const names = [...new Set(views.map(partyName))];
  if (!names.length) return 'None yet';
  if (names.length === 1) return views.length > 1 ? `${vn ? 'All from' : 'All with'} ${names[0]}` : `${vn ? 'From' : 'With'} ${names[0]}`;
  return `With ${names.length} people`;
}

function stats(raw: FundAccount[], views: FundView[], wallet: string, vn: boolean) {
  const active = views.filter((f) => f.state !== 'settled');
  let lockedForMe = 0n;
  let lockedByMe = 0n;
  for (const f of raw) {
    const open = f.state === 'Funded' ? unsettled(f) : 0n;
    if (mine(f.freelancer, wallet)) lockedForMe += open;
    if (mine(f.client, wallet)) lockedByMe += open;
  }
  const activeStat = { label: 'Active contracts', value: String(active.length), sub: peopleLine(active, vn) };
  if (vn) {
    const toSubmit = views.flatMap((f) => f.milestones.filter((ms) => ms.actions.includes('submit')));
    const next = toSubmit.map((ms) => ms.submitBy).sort((a, b) => a - b)[0];
    return [
      { label: 'Locked for you', value: vnd(lockedForMe), sub: `Estimate · $${usdcFromUnits(lockedForMe)} · rate of ${rateDay}` },
      { label: 'To submit', value: String(toSubmit.length), sub: next ? `Next deadline ${formatDeadline(next)}` : 'Nothing due' },
      activeStat,
    ];
  }
  const toReview = views.flatMap((f) => f.milestones.filter((ms) => ms.actions.includes('approve')));
  const next = toReview.map((ms) => ms.reviewBy).sort((a, b) => a - b)[0];
  return [
    { label: 'Locked in your contracts', value: formatUsdc(lockedByMe), sub: 'Held by the program, not by N.E.D' },
    { label: 'Waiting for your review', value: String(toReview.length), sub: next ? `Release opens ${formatDeadline(next)} if not reviewed` : 'Nothing to review' },
    activeStat,
  ];
}

export function Overview() {
  const { openWalletAt } = useWalletPanel();
  const { walletAddress } = useAuth();
  const wallet = walletAddress!;
  const username = useUsername(wallet).data;
  const { region } = useRegion(wallet);
  const vn = region === 'vn';
  const client = useAccount(wallet).capabilities.createContract;
  const accounts = useFundAccounts(wallet);
  const { funds, loading, error } = useFunds(wallet, region);
  const [copied, setCopied] = useState(false);
  const cards = stats(accounts.data?.funds ?? [], funds, wallet, vn);
  const needs = funds.filter((f) => f.needsMyAction && f.nextAction);

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
    <div className={shell.shell}>
      <WorkspaceNav client={client} />
      <m.main id="main" className={shell.main} variants={staggerParent} initial="hidden" animate="shown">
        <m.div className={styles.head} variants={rise} custom={0}>
          <h1 className={styles.greeting}>
            <span className={styles.hello}>{greeting()}</span>
            <span className={styles.name}>{username ? `@${username}` : shortAddress(wallet)}</span>
          </h1>
          {!client ? (
            <button type="button" className={styles.cta} onClick={() => void share()} disabled={!username} aria-live="polite">
              <Icon name="share" size={17} color="#FFFFFF" />
              {copied ? 'Copied' : username ? `Share @${username}` : 'Create your profile in the app'}
            </button>
          ) : (
            <Link to="/new" className={styles.cta}>
              <Icon name="plus" size={17} color="#FFFFFF" />
              New contract
            </Link>
          )}
        </m.div>

        <m.div className={styles.stats} variants={rise} custom={1}>
          {cards.map((s) => (
            <div key={s.label} className={styles.stat}>
              <div className={styles.statLabel}>{s.label}</div>
              <div className={styles.statValue}>{loading ? '—' : s.value}</div>
              <div className={styles.statSub}>{s.sub}</div>
            </div>
          ))}
        </m.div>

        <m.section aria-labelledby="ws-needs" variants={rise} custom={2}>
          <h2 id="ws-needs" className={styles.sectionTitle}>
            Needs your action
          </h2>
          {needs.length ? (
            <div className={styles.needs}>
              {needs.map((f) => {
                const kind = f.nextAction!.kind;
                const look = LOOK[kind] ?? { icon: 'check' as IconName, tone: 'purple', cta: 'Open contract' };
                const ms = f.nextAction!.milestone !== undefined ? f.milestones[f.nextAction!.milestone] : undefined;
                const when = ms?.countdown?.label ?? (ms ? `Due ${formatDeadline(ms.submitBy)}` : f.statusLabel);
                const href = look.path ? `/contract/${f.address}/${look.path}?i=${f.nextAction!.milestone ?? 0}` : `/contract/${f.address}`;
                return (
                  <div key={f.address} className={styles.need}>
                    <div className={styles.needTop}>
                      <span className={styles.needIcon} style={{ background: `var(--${look.tone}-bg)` }} aria-hidden>
                        <Icon name={look.icon} size={18} color={`var(--${look.tone}-ink)`} />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className={styles.needTitle}>{f.nextAction!.label}</div>
                        <div className={styles.needSub}>
                          {f.title} · {f.role === 'client' ? partyName(f) : `for ${partyName(f)}`}
                        </div>
                      </div>
                    </div>
                    <div className={styles.needFoot}>
                      <StatusChip tone={(ms?.tone ?? f.tone) as ChipTone}>{when.charAt(0).toUpperCase() + when.slice(1)}</StatusChip>
                      {look.path || ONSITE.has(kind) ? (
                        <Link to={href} className={styles.needCta}>
                          {look.cta}
                        </Link>
                      ) : (
                        <button type="button" className={styles.needCta} onClick={() => openWalletAt(`/contracts/${f.address}`)}>
                          {look.cta}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className={styles.empty}>{loading ? 'Reading your contracts from the chain…' : 'Nothing needs you right now.'}</p>
          )}
        </m.section>

        <m.section aria-labelledby="ws-contracts" variants={rise} custom={3}>
          <div className={shell.tableTitleRow}>
            <h2 id="ws-contracts" className={shell.sectionTitle}>
              Your contracts
            </h2>
            <Link to="/contracts" className={shell.seeAll}>
              See all
            </Link>
          </div>
          {error ? (
            <p className={`${shell.message} ${shell.error}`} role="alert">
              Could not read your contracts. Check your connection; we try again every few seconds.
            </p>
          ) : funds.length ? (
            <ContractsTable funds={funds.slice(0, 5)} vn={vn} />
          ) : (
            <p className={styles.empty}>
              {loading
                ? 'Reading your contracts from the chain…'
                : vn
                  ? 'No contracts yet. Share your @username with a client; their contract shows up here.'
                  : 'No contracts yet. Lock USDC per milestone for a freelancer; it is released when you approve.'}
            </p>
          )}
        </m.section>
      </m.main>
    </div>
  );
}
