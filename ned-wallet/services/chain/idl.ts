// Anchor IDL coder for ned_program (spike N2): instruction data and account decoding with BorshCoder
// from @coral-xyz/anchor 0.32, using the Anchor 1.x IDL (spec 0.1.0) in ned-wallet/idl/.
// Integer arguments and fields are BN; enums are { VariantName: {} } with the IDL's variant names.
import { Buffer } from 'buffer';
import * as anchor from '@coral-xyz/anchor';
import { BorshCoder, type Idl } from '@coral-xyz/anchor';
import { PublicKey, TransactionInstruction } from '@solana/web3.js';

// Node's ESM loader exposes the CommonJS build's BN only on `default`; Metro's browser build has it as a named export.
type BNType = typeof anchor.BN;
export const BN: BNType = anchor.BN ?? (anchor as unknown as { default: { BN: BNType } }).default.BN;

export const toBN = (value: bigint | number) => new BN(value.toString());
export const fromBN = (value: { toString(): string }) => BigInt(value.toString());

export function loadCoder(idl: Idl): BorshCoder {
  return new BorshCoder(idl);
}

/** Instruction data: 8-byte discriminator + Borsh args, in IDL arg order. */
export function encodeIx(coder: BorshCoder, name: string, args: Record<string, unknown>): Buffer {
  return Buffer.from(coder.instruction.encode(name, args));
}

/** Decodes an account after checking its 8-byte discriminator (throws on mismatch). */
export function decodeAccount<T = Record<string, unknown>>(coder: BorshCoder, name: string, data: Uint8Array): T {
  return coder.accounts.decode<T>(name, Buffer.from(data));
}

type IdlAccountMeta = { name: string; address?: string; signer?: boolean; writable?: boolean };
type IdlInstructionLike = { name: string; accounts: readonly unknown[] };

/**
 * Instruction with the account order, signer and writable flags from the IDL (generalised from
 * identity/dualPda.ts buildInstruction). Accounts with a fixed `address` in the IDL may be omitted.
 * `data` is the full instruction data (encodeIx output).
 */
export function buildIx(
  idl: { instructions: readonly IdlInstructionLike[] },
  programId: PublicKey,
  name: string,
  accounts: Record<string, PublicKey>,
  data: Buffer
): TransactionInstruction {
  const ix = idl.instructions.find((i) => i.name === name);
  if (!ix) throw new Error(`IDL has no instruction ${name}`);
  const keys = (ix.accounts as IdlAccountMeta[]).map((meta) => {
    if (!('name' in meta) || 'accounts' in meta) throw new Error(`Nested account groups are not supported (${name})`);
    const pubkey = accounts[meta.name] ?? (meta.address ? new PublicKey(meta.address) : null);
    if (!pubkey) throw new Error(`Missing account ${meta.name} for ${name}`);
    return { pubkey, isSigner: meta.signer === true, isWritable: meta.writable === true };
  });
  return new TransactionInstruction({ programId, keys, data });
}
