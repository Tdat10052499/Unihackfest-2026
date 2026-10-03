// Associated token account helpers (non-ui-plan N1, bug B4).
import { Buffer } from 'buffer';
import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js';
import { ATA_PROGRAM_ID, TOKEN_PROGRAM_ID } from '../constants.ts';

export interface AtaOptions {
  /** Allow a PDA owner (for example the fund PDA or a vault authority). */
  allowOwnerOffCurve?: boolean;
  tokenProgram?: PublicKey;
  ataProgram?: PublicKey;
}

/** ATA address of `owner` for `mint`: PDA [owner, token program, mint] under the ATA program. */
export function ata(mint: PublicKey, owner: PublicKey, opts: AtaOptions = {}): PublicKey {
  const { allowOwnerOffCurve = false, tokenProgram = TOKEN_PROGRAM_ID, ataProgram = ATA_PROGRAM_ID } = opts;
  if (!allowOwnerOffCurve && !PublicKey.isOnCurve(owner.toBuffer())) {
    throw new Error('TokenOwnerOffCurveError');
  }
  return PublicKey.findProgramAddressSync([owner.toBuffer(), tokenProgram.toBuffer(), mint.toBuffer()], ataProgram)[0];
}

/**
 * CreateIdempotent (instruction data [1]): creates the ATA if missing and succeeds if it already exists,
 * so it can be added to any transaction without a prior lookup. `payer` signs and pays the rent.
 */
export function createAtaIdempotentIx(
  payer: PublicKey,
  owner: PublicKey,
  mint: PublicKey,
  opts: Omit<AtaOptions, 'allowOwnerOffCurve'> = {}
): TransactionInstruction {
  const { tokenProgram = TOKEN_PROGRAM_ID, ataProgram = ATA_PROGRAM_ID } = opts;
  const address = ata(mint, owner, { allowOwnerOffCurve: true, tokenProgram, ataProgram });
  return new TransactionInstruction({
    programId: ataProgram,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: address, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: tokenProgram, isSigner: false, isWritable: false },
    ],
    data: Buffer.from([1]),
  });
}
