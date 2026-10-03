// /contract/:fund — read-only summary (workspace-plan W2): state, other party, amounts in the money view, destination,
// vault proof, the brief (ok / mismatch / noKey / missing, with "Paste the contract link"), milestones with chain-time
// countdowns and deliveries, and the role's next step (submit / review pages arrive in W4). Nothing is signed here.
import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { m } from 'motion/react';
import { formatDeadline, formatUsdc } from '@ned/core/milestone/format.ts';
import type { FundView, MilestoneView } from '@ned/core/milestone/view.ts';
import { useAuth } from '../auth/AuthProvider.tsx';
import { Avatar } from '../components/Avatar.tsx';
import { partyName } from '../components/ContractsTable.tsx';
import { Icon } from '../components/icons.tsx';
import { StatusChip } from '../components/StatusChip.tsx';
import { env } from '../config.ts';
import { useRegion } from '../hooks/region.ts';
import { useContractContent, type ContractContentState } from '../hooks/useContractContent.ts';
import { isFundAddress, useFund } from '../hooks/useFund.ts';
import { rise, staggerParent } from '../motion.ts';
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
  if (!fund) {
    return (
      <main id="main" className={styles.page} aria-busy="true">
        <p className={styles.muted}>{base.error ? 'Could not read this contract. We try again every few seconds.' : 'Reading the contract from the chain…'}</p>
      </main>
    );
  }
  // A third party (someone with the link, not client or freelancer) sees the contract but no next step
  const raw = base.raw?.fund;
  const isParty = Boolean(raw && walletAddress && (raw.client.toBase58() === walletAddress || raw.freelancer.toBase58() === walletAddress));

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

      {isParty ? <NextStep fund={fund} vn={vn} /> : null}

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
            {fund.state === 'created' ? 'Nothing is locked yet. The freelancer accepts first, then the client locks.' : 'Accepted. Nothing is locked until the client locks.'}
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
          <Milestone ms={ms} vn={vn} />
        </m.div>
      ))}

      <m.details variants={rise} custom={4} className={styles.card}>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>How this contract works</summary>
        <ul className={styles.rules}>
          <li>Each milestone is released when the client approves, or automatically when its review time ends.</li>
          <li>If a submission deadline passes with nothing submitted, anyone can refund that milestone to the client.</li>
          <li>The money sits in a program vault. Nobody, including N.E.D, can move it any other way.</li>
        </ul>
        <a href={`${env.mobileOrigin}/disclosures`} target="_blank" rel="noreferrer">
          Disclosures
        </a>
      </m.details>
    </m.main>
  );
}

/** The role's next step: submit and review have their pages (W4); other steps are done in the phone app for now */
function NextStep({ fund, vn }: { fund: FundView; vn: boolean }) {
  const next = fund.nextAction;
  if (!next) {
    const m0 = fund.milestones.find((ms) => ms.countdown);
    return m0 ? (
      <div className={styles.next}>
        <span className={styles.nextText}>
          <strong>Next · </strong>
          {m0.countdown!.label.charAt(0).toUpperCase() + m0.countdown!.label.slice(1)}.
        </span>
      </div>
    ) : null;
  }
  const path = next.kind === 'submit' ? 'submit' : next.kind === 'approve' ? 'review' : null;
  // The Vietnam view never offers client actions (D18); rules.ts already keeps them out of nextAction for a freelancer
  return (
    <div className={styles.next}>
      <span className={styles.nextText}>
        <strong>Next · </strong>
        {next.label}
        {path ? '' : vn ? '. Open the N.E.D app on your phone to do this.' : '. Do this in the N.E.D app for now; the Workspace gets it next.'}
      </span>
      {path ? (
        <Link to={`/contract/${fund.address}/${path}?i=${next.milestone ?? 0}`} className={styles.primary}>
          {path === 'submit' ? 'Open delivery form' : 'Review delivery'}
        </Link>
      ) : null}
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
              Open the contract link on this computer to read the brief, or paste it here.
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

function Milestone({ ms, vn }: { ms: MilestoneView; vn: boolean }) {
  const d = ms.delivery;
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
          <span>{ms.countdown.label.replace(/ in .*$/, '').replace(/ within .*$/, '')}</span>
          <span className={styles.mono}>{ms.countdown.label.replace(/^.*?(in|within) /, '')}</span>
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
        <div className={styles.delivery}>
          <span>
            Submitted {formatDeadline(d.submittedAt)} · {d.onTime ? 'on time' : 'late'}
            {ms.evidence ? (
              <>
                {' '}
                · fingerprint <span className={styles.mono}>{ms.evidence}</span>
              </>
            ) : null}
          </span>
          {d.matches ? (
            <span className={styles.ok}>Same delivery that was submitted ✓ · {d.content?.links.length ?? 0} links</span>
          ) : d.matches === false ? (
            <span className={styles.muted}>The delivery is not readable on this computer yet.</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

