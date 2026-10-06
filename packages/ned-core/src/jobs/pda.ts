import { Buffer } from 'buffer';
import { PublicKey } from '@solana/web3.js';
import { getProgramId } from '../config.ts';
import { JOB_APP_SEED, JOB_SEED, JOB_VAULT_SEED } from './layout.ts';

const u64le = (value: bigint) => {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(value);
  return b;
};

/** JobListing PDA [b"job", business, job_id LE] */
export function jobPda(business: PublicKey, jobId: bigint, programId: PublicKey = getProgramId()): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from(JOB_SEED), business.toBuffer(), u64le(jobId)], programId)[0];
}

/** Job vault token account PDA [b"job_vault", job]; its authority is the listing PDA */
export function jobVaultPda(job: PublicKey, programId: PublicKey = getProgramId()): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from(JOB_VAULT_SEED), job.toBuffer()], programId)[0];
}

/** JobApplication PDA [b"job_app", job, freelancer] (one application per person) */
export function jobAppPda(job: PublicKey, freelancer: PublicKey, programId: PublicKey = getProgramId()): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from(JOB_APP_SEED), job.toBuffer(), freelancer.toBuffer()], programId)[0];
}
