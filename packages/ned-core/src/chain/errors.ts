// Transaction errors → one English sentence for the UI (non-ui-plan N1).
// Order: our own user-facing errors → ned_program error (IDL code → name → message) → common causes → context fallback.
import idl from '../idl/ned_program.json' with { type: 'json' };

export type TxErrorContext = 'profile' | 'contract' | 'transfer';

/** An error whose message is already written for the user. */
export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserFacingError';
  }
}

/** Confirmed transaction with `value.err` set. `chainError` keeps the raw error so the program code can be mapped. */
export class TxFailedError extends UserFacingError {
  readonly signature: string;
  readonly chainError: unknown;
  constructor(signature: string, chainError: unknown) {
    super('The transaction failed on-chain. Check its status before retrying.');
    this.name = 'TxFailedError';
    this.signature = signature;
    this.chainError = chainError;
  }
}

type IdlError = { code: number; name: string; msg?: string };
const IDL_ERRORS: IdlError[] = (idl as { errors?: IdlError[] }).errors ?? [];
/** Program error code → name, from the IDL (6000 and up). */
export const PROGRAM_ERRORS: Record<number, string> = Object.fromEntries(IDL_ERRORS.map((e) => [e.code, e.name]));
const PROGRAM_MESSAGES: Record<string, string | undefined> = Object.fromEntries(IDL_ERRORS.map((e) => [e.name, e.msg]));

/** Error name → sentence shown in the app. Names not listed here fall back to the program's own #[msg]. */
const MESSAGES: Record<string, string> = {
  // identity
  UsernameTaken: 'That username was just taken. Please pick another one.',
  InvalidUsername: 'Usernames use 3–20 lowercase letters, numbers or _.',
  ProfileAlreadyExists: 'This wallet already has a N.E.D profile.',
  PhoneTaken: "This number is already linked to another N.E.D account. If it's yours, use your @username.",
  PhoneAlreadyLinked: 'This wallet already has a linked phone number.',
  // milestone (program-spec section 6)
  InvalidMilestoneCount: 'A contract needs 1 to 5 milestones.',
  AmountTooLarge: 'The contract total is above the 1,000 USDC demo limit.',
  InvalidDeadline: 'A deadline is not valid.',
  ReviewWindowTooShort: 'The review deadline is too close to the submission deadline.',
  WorkWindowTooShort: 'Too little time is left before the first submission deadline. Close this contract and create a new one.',
  SameParty: 'The client and the freelancer must be different accounts.',
  InvalidFreelancer: 'The freelancer account is not valid.',
  TitleTooLong: 'The title is too long (32 bytes at most).',
  InvalidMint: 'Only devnet USDC can be locked in a contract.',
  InvalidFundState: 'This contract is not at the right step for that action. Refresh and try again.',
  InvalidPayoutKind: 'Choose where your earnings go.',
  InvalidPayoutDestination: 'This destination cannot receive earnings for this contract.',
  PayoutPartnerNotAllowed: 'This payout partner is not on the allowed list.',
  InvalidPayoutReference: 'The payout partner reference is missing.',
  MilestoneIndexOutOfRange: 'This milestone does not exist in the contract.',
  InvalidMilestoneStatus: 'This milestone is not at the right step for that action. Refresh and try again.',
  DeadlinePassed: 'The deadline for this action has passed.',
  DeadlineNotReached: 'The deadline has not passed yet.',
  NotAParty: 'Only the client or the freelancer of this contract can do that.',
  NoCancelProposal: 'There is no split proposal to accept.',
  CannotAcceptOwnProposal: 'The other party has to accept your proposal.',
  CancelAmountTooLarge: 'The proposed amount is larger than what is still locked.',
  CancelProposalChanged: 'The proposal changed. Review it again before accepting.',
  FundNotClosable: 'This contract cannot be closed yet.',
  MathOverflow: 'The amounts are too large.',
};

const FALLBACK: Record<TxErrorContext, string> = {
  profile: 'Something went wrong while creating your profile. Please try again.',
  contract: 'The contract action did not go through. Please try again.',
  transfer: 'Transfer failed. Please retry.',
};

/** Finds a program error code in an error message or in a transaction `err` value ({ InstructionError: [i, { Custom: n }] }). */
function programErrorCode(raw: string, chainError: unknown): number | undefined {
  const custom = (chainError as { InstructionError?: [number, { Custom?: number }] } | null)?.InstructionError?.[1]?.Custom;
  if (typeof custom === 'number') return custom;
  const hex = /custom program error: 0x([0-9a-f]+)/i.exec(raw)?.[1];
  if (hex) return parseInt(hex, 16);
  const dec = /"Custom":\s*(\d+)/.exec(raw)?.[1];
  return dec ? Number(dec) : undefined;
}

export function describeTxError(err: unknown, context: TxErrorContext = 'profile'): string {
  const raw = err instanceof Error ? err.message : String(err);
  const code = programErrorCode(raw, err instanceof TxFailedError ? err.chainError : undefined);
  const name =
    code !== undefined && PROGRAM_ERRORS[code]
      ? PROGRAM_ERRORS[code]
      : Object.keys({ ...PROGRAM_MESSAGES, ...MESSAGES }).find((n) => new RegExp(`\\b${n}\\b`).test(raw));
  if (name) {
    const message = MESSAGES[name] ?? PROGRAM_MESSAGES[name];
    if (message) return message;
  }
  if (err instanceof UserFacingError) return err.message;
  // Token program InsufficientFunds (custom error 0x1 from Tokenkeg, log "Error: insufficient funds"): not enough
  // USDC, e.g. lock above the balance. Checked before the SOL rule below, which also matches 0x1.
  if (/Tokenkeg\w* failed: custom program error: 0x1\b|Error: insufficient funds/i.test(raw)) {
    return 'Not enough USDC for this action.';
  }
  if (/insufficient (funds|lamports)|no record of a prior credit|0x1\b/i.test(raw)) {
    return context === 'profile'
      ? 'Not enough devnet SOL to cover setup. Top up your wallet and try again.'
      : 'Not enough devnet SOL for the network fee and account rent. Top up your wallet and try again.';
  }
  if (/reject|cancel|denied/i.test(raw)) return 'The request was cancelled. Please try again.';
  return FALLBACK[context];
}
