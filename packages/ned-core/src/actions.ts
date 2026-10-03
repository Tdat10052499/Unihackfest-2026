// Framework-free Milestone Lock action pipeline (workspace-plan section 1): fresh fund read → rules.ts check →
// builder → sign with the injected signer → send → confirm → result. Both apps wrap it in their own hooks
// (busy / status / error state, refresh). Errors stay raw here; map them with describeActionError.
import { PublicKey, type Connection, type Transaction } from '@solana/web3.js';
import { fetchUsdcUnits } from './chain/balance.ts';
import { describeTxError, UserFacingError } from './chain/errors.ts';
import { sendAndConfirm, type SendAuth, type SendStatus } from './chain/send.ts';
import { getConnection } from './config.ts';
import { prepareTransactionCost } from './identity/transactionCost.ts';
import * as client from './milestone/client.ts';
import type { FundAccount } from './milestone/decode.ts';
import { shortHash } from './milestone/evidence.ts';
import { formatUsdc, unitsFromUsdc } from './milestone/format.ts';
import { getFund } from './milestone/queries.ts';
import * as rules from './milestone/rules.ts';
import type { ActionKind, ContractDraft } from './milestone/view.ts';

export const NOT_NOW = 'This action is not available right now. Refresh the contract and try again.';

export interface ActionEnv {
  /** The signed-in wallet and its signer (Dynamic embedded wallet in both apps) */
  signer: SendAuth;
  /** Chain time in unix seconds */
  now(): Promise<number>;
  onStatus?: (status: SendStatus) => void;
  /** Defaults to the configured devnet connection */
  connection?: Connection;
}

export interface ActionExtra {
  /** submit: delivery link (only its SHA-256 goes on-chain) */
  link?: string;
  /** proposeSplit: base units to the freelancer */
  units?: bigint;
}

/** User-facing English sentence for any action error */
export const describeActionError = (err: unknown) => describeTxError(err, 'contract');

/** Builds the transaction for `kind` after the same checks the program makes */
export async function buildMilestoneAction(
  kind: ActionKind,
  me: PublicKey,
  fund: FundAccount,
  now: number,
  index = 0,
  extra?: ActionExtra,
  connection: Connection = getConnection()
): Promise<client.Built & { evidence?: Uint8Array }> {
  const check = (ok: boolean) => {
    if (!ok) throw new UserFacingError(NOT_NOW);
  };
  switch (kind) {
    case 'accept':
      // Same fee and rent for both choices; the own-wallet variant needs no username
      check(rules.canAccept(fund, me, now));
      // TODO(B1): the hash of the decrypted brief shown to the freelancer, never the fund's own value
      return client.buildAccept({ fund, freelancer: me, choice: 'ownWallet', username: '', expectedBriefHash: fund.briefHash });
    case 'lock': {
      check(rules.canLock(fund, me, now));
      // The Token program would fail with a bare 0x1; say what is missing instead
      const balance = await fetchUsdcUnits(connection, me);
      if (balance < fund.total) {
        throw new UserFacingError(`You need ${formatUsdc(fund.total)} to lock this contract; your wallet has ${formatUsdc(balance)}.`);
      }
      return client.buildLock({ fund, client: me }, connection);
    }
    case 'submit':
      check(rules.canSubmit(fund, me, index, now));
      return client.buildSubmit({ fund, freelancer: me, index, link: extra?.link ?? '' });
    case 'approve':
      check(rules.canApprove(fund, me, index));
      return client.buildApprove({ fund, client: me, index }, connection);
    case 'releaseNow':
      check(rules.canReleaseAfterReview(fund, index, now));
      return client.buildReleaseAfterReview({ fund, caller: me, index }, connection);
    case 'refundNow':
      check(rules.canRefund(fund, index, now));
      return client.buildRefund({ fund, caller: me, index }, connection);
    case 'close':
      check(rules.canClose(fund, me));
      return client.buildClose({ fund, creator: me }, connection);
    case 'dispute':
      check(rules.canDispute(fund, me, index, now));
      return client.buildDispute({ fund, client: me, index });
    case 'concede':
      check(rules.canConcede(fund, me, index));
      return client.buildConcede({ fund, freelancer: me, index }, connection);
    case 'proposeSplit': {
      const units = extra?.units ?? 0n;
      if (!rules.canProposeSplit(fund, me)) throw new UserFacingError(NOT_NOW);
      if (!rules.canProposeSplit(fund, me, units)) throw new UserFacingError('The proposed amount is larger than what is still locked.');
      return client.buildProposeSplit({ fund, signer: me, toFreelancerUnits: units });
    }
    case 'acceptSplit':
      check(rules.canAcceptSplit(fund, me));
      return client.buildAcceptSplit({ fund, signer: me }, connection);
  }
}

/** Fresh read of a contract (never act on a stale poll result) */
export async function readFund(address: string | undefined, connection: Connection = getConnection()): Promise<FundAccount> {
  if (!address) throw new UserFacingError('Open a contract first.');
  const fund = await getFund(address, connection);
  if (!fund) throw new UserFacingError('This contract no longer exists.');
  return fund;
}

/** Signs, sends and confirms a built transaction; returns the builder's extra fields plus the signature */
export async function runBuilt<T>(
  env: ActionEnv,
  work: (me: PublicKey) => Promise<{ tx: Transaction; rent: number } & T>
): Promise<{ signature: string } & T> {
  const { walletAddress, signTransaction } = env.signer;
  if (!walletAddress) throw new UserFacingError('Sign in first.');
  const built = await work(new PublicKey(walletAddress));
  const { signature } = await sendAndConfirm(built.tx, { walletAddress, signTransaction }, {
    rent: built.rent,
    ...(env.onStatus ? { onStatus: env.onStatus } : {}),
    ...(env.connection ? { connection: env.connection } : {}),
  });
  const { tx: _tx, rent: _rent, ...rest } = built;
  return { ...(rest as T), signature };
}

/** Any per-contract action (lock, submit, approve, releaseNow, refundNow, close, and the P1 group) */
export function runFundAction(env: ActionEnv, address: string | undefined, kind: ActionKind, index?: number, extra?: ActionExtra) {
  const connection = env.connection ?? getConnection();
  return runBuilt(env, async (me) => buildMilestoneAction(kind, me, await readFund(address, connection), await env.now(), index, extra, connection));
}

/** create_fund from the create form */
export async function runCreate(env: ActionEnv, draft: ContractDraft): Promise<{ signature: string; fund: string }> {
  const connection = env.connection ?? getConnection();
  const result = await runBuilt(env, async (me) => {
    const check = rules.validateDraft(draft, await env.now(), me);
    if (!check.ok) throw new UserFacingError(check.errors[0].message);
    return client.buildCreateFund(
      {
        client: me,
        freelancer: new PublicKey(draft.freelancer),
        title: draft.title,
        milestones: draft.milestones.map((m) => ({
          amount: unitsFromUsdc(m.amountUsdc) ?? 0n,
          submitBy: m.submitBy,
          reviewBy: m.submitBy + m.reviewSeconds,
        })),
      },
      connection
    );
  });
  return { signature: result.signature, fund: result.fund.toBase58() };
}

/** accept with the freelancer's payout choice; `username` builds the demo payout reference (VND path only) */
export function runAccept(env: ActionEnv, address: string | undefined, choice: 'ownWallet' | 'payoutPartner', username: string) {
  const connection = env.connection ?? getConnection();
  return runBuilt(env, async (me) => {
    const fund = await readFund(address, connection);
    if (!rules.canAccept(fund, me, await env.now())) throw new UserFacingError(NOT_NOW);
    // The payout-partner reference is built from the username (demo-<username>-001)
    if (choice === 'payoutPartner' && !username) {
      throw new UserFacingError('Create your N.E.D profile before choosing a VND payout.');
    }
    // TEMPORARY (harness and smoke only): accepts whatever brief the fund holds.
    // TODO(B1): pass the hash of the decrypted brief shown to the freelancer, never the fund's own value.
    return client.buildAccept({ fund, freelancer: me, choice, username, expectedBriefHash: fund.briefHash });
  });
}

/** submit: returns the short evidence hash for the UI */
export async function runSubmit(env: ActionEnv, address: string | undefined, index: number, link: string) {
  const result = await runFundAction(env, address, 'submit', index, { link });
  return { signature: result.signature, evidence: shortHash((result as unknown as { evidence: Uint8Array }).evidence) };
}

/** Network fee and account rent of an action, without signing */
export async function previewAction(env: ActionEnv, address: string | undefined, kind: ActionKind, index?: number) {
  const { walletAddress } = env.signer;
  if (!walletAddress) throw new UserFacingError('Sign in first.');
  const connection = env.connection ?? getConnection();
  const me = new PublicKey(walletAddress);
  const built = await buildMilestoneAction(kind, me, await readFund(address, connection), await env.now(), index, { link: 'preview' }, connection);
  const cost = await prepareTransactionCost(connection, built.tx, walletAddress, built.rent);
  return { feeLamports: cost.fee, rentLamports: cost.rent };
}
