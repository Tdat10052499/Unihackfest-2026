// USDC balance = the USDC ATA only, in integer base units (bug B1: never add other tokens).
import type { Connection, PublicKey } from '@solana/web3.js';
import { USDC_DECIMALS, USDC_DEVNET_MINT } from '../../constants/chain.ts';
import { ata } from './ata.ts';

const UNITS_PER_USDC = 10n ** BigInt(USDC_DECIMALS);
/** SPL token account layout: mint (32) · owner (32) · amount (u64 LE) at offset 64. */
const AMOUNT_OFFSET = 64;

/** Amount of a raw SPL token account; a missing account is 0. */
export function tokenAmountFromAccountData(data: Uint8Array | null | undefined): bigint {
  if (!data || data.length < AMOUNT_OFFSET + 8) return 0n;
  return new DataView(data.buffer, data.byteOffset, data.byteLength).getBigUint64(AMOUNT_OFFSET, true);
}

/** USDC base units held in `owner`'s USDC ATA. */
export async function fetchUsdcUnits(
  connection: Pick<Connection, 'getAccountInfo'>,
  owner: PublicKey,
  mint: PublicKey = USDC_DEVNET_MINT
): Promise<bigint> {
  const info = await connection.getAccountInfo(ata(mint, owner), 'confirmed');
  return tokenAmountFromAccountData(info?.data);
}

/** Base units → USDC as a number for display (exact for any realistic balance). */
export function usdcNumberFromUnits(units: bigint): number {
  return Number(units / UNITS_PER_USDC) + Number(units % UNITS_PER_USDC) / Number(UNITS_PER_USDC);
}
