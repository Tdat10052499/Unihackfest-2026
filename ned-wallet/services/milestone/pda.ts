import { Buffer } from 'buffer';
import { PublicKey } from '@solana/web3.js';
import { PROGRAM_ID } from '../../constants/chain.ts';
import { FUND_SEED, VAULT_SEED } from './layout.ts';

const u64le = (value: bigint) => {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(value);
  return b;
};

/** SharedFund PDA [b"fund", creator, fund_id LE] */
export function fundPda(creator: PublicKey, fundId: bigint, programId: PublicKey = PROGRAM_ID): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from(FUND_SEED), creator.toBuffer(), u64le(fundId)], programId)[0];
}

/** Vault token account PDA [b"vault", fund] */
export function vaultPda(fund: PublicKey, programId: PublicKey = PROGRAM_ID): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from(VAULT_SEED), fund.toBuffer()], programId)[0];
}
