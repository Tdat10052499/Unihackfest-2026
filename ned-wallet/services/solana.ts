import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { solActivityAmount } from './activityAmount';
import { Buffer } from 'buffer';
import { formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';

import { DEVNET_RPC_URL, connection } from './chain/connection';
import { ata } from './chain/ata';
import { fetchUsdcUnits, usdcNumberFromUnits } from './chain/balance';
import {
  ATA_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  USDC_DEVNET_MINT,
} from '../constants/chain';

// Re-exported under the old names; the values live in constants/chain.ts and services/chain/connection.ts.
export const SOLANA_DEVNET_RPC = DEVNET_RPC_URL;
export { USDC_DEVNET_MINT, TOKEN_PROGRAM_ID };
export const ASSOCIATED_TOKEN_PROGRAM_ID = ATA_PROGRAM_ID;
export const SYSVAR_RENT_PUBKEY = new PublicKey('SysvarRent111111111111111111111111111111111');


/**
 * Associated Token Account (ATA) address of a wallet, derived as a Solana PDA
 */
export function getAssociatedTokenAddress(
  mint: PublicKey,
  owner: PublicKey,
  allowOwnerOffCurve = false,
  programId = TOKEN_PROGRAM_ID,
  associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID
): PublicKey {
  return ata(mint, owner, { allowOwnerOffCurve, tokenProgram: programId, ataProgram: associatedTokenProgramId });
}

/**
 * Instruction that creates the recipient's Associated Token Account (ATA) when it does not exist yet
 */
export function createAssociatedTokenAccountInstruction(
  payer: PublicKey,
  associatedToken: PublicKey,
  owner: PublicKey,
  mint: PublicKey,
  programId = TOKEN_PROGRAM_ID,
  associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID
): TransactionInstruction {
  const keys = [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: associatedToken, isSigner: false, isWritable: true },
    { pubkey: owner, isSigner: false, isWritable: false },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: programId, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({
    keys,
    programId: associatedTokenProgramId,
    data: Buffer.alloc(0),
  });
}

/**
 * Standard SPL Token (USDC) transfer instruction (instruction index 3, Transfer)
 */
export function createSplTokenTransferInstruction(
  source: PublicKey,
  destination: PublicKey,
  owner: PublicKey,
  amount: bigint | number,
  programId = TOKEN_PROGRAM_ID
): TransactionInstruction {
  const data = Buffer.alloc(9);
  data.writeUInt8(3, 0); // Instruction 3 for Transfer
  data.writeBigUInt64LE(BigInt(amount), 1);

  return new TransactionInstruction({
    keys: [
      { pubkey: source, isSigner: false, isWritable: true },
      { pubkey: destination, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    programId,
    data,
  });
}

export const solanaConnection = connection;

export interface ActivityItem {
  id: string;
  type: 'received' | 'sent' | 'reward' | 'GAS_FEE';
  title: string;
  time: string;
  amount: string;
  isPositive: boolean;
  iconBg: string;
  signature?: string;
  blockTime?: number;
  isNetworkFee?: boolean;
  currency?: string;
  counterpartyWallet?: string;
}

export interface TransferResult {
  success: boolean;
  txSignature?: string;
  recipientAddress?: string;
  error?: string;
}

const addressHistoryCache = new Map<string, { timestamp: number; data: ActivityItem[] }>();
const inFlightHistoryMap = new Map<string, Promise<ActivityItem[]>>();
const parsedTxCache = new Map<string, ActivityItem>();
const inFlightBalanceMap = new Map<string, Promise<number>>();
const balanceCache = new Map<string, { timestamp: number; balance: number }>();
const usdcBalanceCache = new Map<string, { timestamp: number; balance: number }>();

export function clearSolanaCache() {
  addressHistoryCache.clear();
  parsedTxCache.clear();
  balanceCache.clear();
  usdcBalanceCache.clear();
}

/**
 * SOL balance of an address on Solana devnet, commitment 'confirmed'
 * 4-second cache and in-flight deduplication against 429 Too Many Requests
 */
export async function getSolanaBalance(address: string, force: boolean = false): Promise<number> {
  if (!address) return 0;
  const now = Date.now();
  const cached = balanceCache.get(address);
  if (!force && cached && now - cached.timestamp < 4000) {
    return cached.balance;
  }

  if (inFlightBalanceMap.has(address)) {
    return inFlightBalanceMap.get(address)!;
  }

  const promise = (async () => {
    try {
      const publicKey = new PublicKey(address);
      const lamports = await solanaConnection.getBalance(publicKey, 'confirmed');
      const sol = lamports / LAMPORTS_PER_SOL;
      balanceCache.set(address, { timestamp: Date.now(), balance: sol });
      return sol;
    } catch (error: any) {
      if (error?.message?.includes('429') || error?.toString()?.includes('429')) {
        console.warn('⚠️ [Solana RPC 429 Rate-limit] Using the cached balance for now.');
        if (cached) return cached.balance;
      }
      throw error;
    } finally {
      inFlightBalanceMap.delete(address);
    }
  })();

  inFlightBalanceMap.set(address, promise);
  return promise;
}

const inFlightUsdcMap = new Map<string, Promise<number>>();

/**
 * Devnet USDC balance: reads only the wallet's USDC ATA (B1, no other tokens added), computed from integer base units.
 * 10-second cache and in-flight deduplication against 429 Too Many Requests
 * @param address The user's Solana wallet address
 */
export async function getUsdcTokenBalance(address: string, force: boolean = false): Promise<number> {
  if (!address) return 0;
  const now = Date.now();
  const cached = usdcBalanceCache.get(address);
  if (!force && cached && now - cached.timestamp < 10000) {
    return cached.balance;
  }

  if (inFlightUsdcMap.has(address)) {
    return inFlightUsdcMap.get(address)!;
  }

  const promise = (async () => {
    try {
      const balance = usdcNumberFromUnits(await fetchUsdcUnits(solanaConnection, new PublicKey(address)));
      usdcBalanceCache.set(address, { timestamp: Date.now(), balance });
      return balance;
    } catch (e: any) {
      if (e?.message?.includes('429') || e?.toString()?.includes('429')) {
        console.warn('⚠️ [Solana USDC RPC 429 Rate-limit] Using the cached balance for now.');
      }
      if (cached) return cached.balance;
      return 0;
    } finally {
      inFlightUsdcMap.delete(address);
    }
  })();

  inFlightUsdcMap.set(address, promise);
  return promise;
}

/**
 * Display title for an ActivityItem (through the locale file)
 */
export function getActivityTitle(
  item: ActivityItem,
  t?: (key: string, options?: any) => string
): string {
  if (!t) return item.title;
  if (item.type === 'received') {
    return t('activities.received', { defaultValue: 'Received' });
  }
  if (item.type === 'sent') {
    return t('activities.sent', { defaultValue: 'Sent' });
  }
  if (item.type === 'reward') {
    return t('activities.reward', { defaultValue: 'Reward' });
  }
  return item.title || t('activities.contract', { defaultValue: 'Contract interaction' });
}

/**
 * Unix timestamp → relative time, through the locale file
 */
export function formatLocalizedRelativeTime(
  blockTime: number | null | undefined,
  t?: (key: string, options?: any) => string
): string {
  if (!blockTime) return t ? t('activities.justNow', { defaultValue: 'Just now' }) : formatRelativeTime(blockTime);

  const date = new Date(blockTime * 1000);
  const diffSec = Math.floor(Date.now() / 1000) - blockTime;
  
  if (diffSec < 60) return t ? t('activities.justNow', { defaultValue: 'Just now' }) : formatRelativeTime(blockTime);
  
  return formatDistanceToNow(date, { addSuffix: true, locale: enUS });
}

/**
 * Unix timestamp → relative time (default wording)
 */
export function formatRelativeTime(blockTime: number | null | undefined): string {
  if (!blockTime) return 'Just now';
  
  const date = new Date(blockTime * 1000);
  const diffSec = Math.floor(Date.now() / 1000) - blockTime;
  
  if (diffSec < 60) return 'Just now';
  
  return formatDistanceToNow(date, { addSuffix: true, locale: enUS });
}

/**
 * Small delay helper to avoid RPC rate limits
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Parses one on-chain transaction from the point of view of the wallet `address`
 * Recognises SPL tokens (USDC/USDT), faucet tokens, P2P transfers and native SOL
 */
export function parseTransactionForAddress(
  parsedTx: any,
  address: string,
  signature: string,
  blockTime?: number | null
): ActivityItem {
  const meta = parsedTx?.meta;
  const isFailed = meta?.err !== null;
  const timeStr = formatRelativeTime(blockTime);

  if (isFailed) {
    return {
      id: signature,
      type: 'sent',
      title: 'Transaction not completed',
      time: timeStr,
      amount: '$0.00',
      isPositive: false,
      iconBg: '#DC2626',
      signature,
      blockTime: blockTime ?? undefined,
      currency: 'USDC',
    };
  }

  // 1. SPL token balance changes (USDC / USDT / devnet tokens)
  if (meta?.preTokenBalances || meta?.postTokenBalances) {
    const preTokens: any[] = meta.preTokenBalances || [];
    const postTokens: any[] = meta.postTokenBalances || [];

    // Find this address's token account in pre and post balances
    const userPreToken = preTokens.find((t) => t.owner === address);
    const userPostToken = postTokens.find((t) => t.owner === address);

    const preAmount = userPreToken?.uiTokenAmount?.uiAmount ?? (userPreToken?.uiTokenAmount?.uiAmountString ? parseFloat(userPreToken.uiTokenAmount.uiAmountString) : 0);
    const postAmount = userPostToken?.uiTokenAmount?.uiAmount ?? (userPostToken?.uiTokenAmount?.uiAmountString ? parseFloat(userPostToken.uiTokenAmount.uiAmountString) : 0);
    const tokenDiff = (Number(postAmount) || 0) - (Number(preAmount) || 0);

    // Currency unit from the mint
    const rawMint = userPostToken?.mint || userPreToken?.mint || '';
    const tokenMint = (typeof rawMint === 'string' ? rawMint : (rawMint?.toBase58?.() || String(rawMint || ''))).toUpperCase();
    let detectedCurrency = 'USDC';
    let currencySymbol = '$';
    if (tokenMint.includes('EUR')) {
      detectedCurrency = 'EURC';
      currencySymbol = '€';
    } else if (tokenMint.includes('USDT')) {
      detectedCurrency = 'USDT';
      currencySymbol = '$';
    } else if (tokenMint.includes('PYUSD')) {
      detectedCurrency = 'PYUSD';
      currencySymbol = '$';
    }

    const others = new Set<string>();
    const indexes = new Set([...preTokens, ...postTokens].filter(t => t.mint === rawMint && t.owner !== address).map(t => t.accountIndex));
    for (const index of indexes) {
      const pre = preTokens.find(t => t.accountIndex === index);
      const post = postTokens.find(t => t.accountIndex === index);
      const diff = Number(post?.uiTokenAmount?.uiAmountString ?? 0) - Number(pre?.uiTokenAmount?.uiAmountString ?? 0);
      const owner = post?.owner ?? pre?.owner;
      if (owner && diff * tokenDiff < 0) others.add(owner);
    }
    const counterpartyWallet = others.size === 1 ? [...others][0] : undefined;

    if (Math.abs(tokenDiff) > 0.000001) {
      if (tokenDiff > 0) {
        // Did another account lose tokens in this transaction? (tells a P2P transfer from a faucet mint)
        let isOtherSenderLost = false;
        for (const pre of preTokens) {
          if (pre.owner !== address) {
            const post = postTokens.find((p) => p.accountIndex === pre.accountIndex);
            const pPre = pre.uiTokenAmount?.uiAmount ?? 0;
            const pPost = post?.uiTokenAmount?.uiAmount ?? 0;
            if (pPre - pPost > 0.000001) {
              isOtherSenderLost = true;
              break;
            }
          }
        }

        const isFaucet = !isOtherSenderLost;
        return {
          id: signature,
          type: 'received',
          title: 'Received',
          time: timeStr,
          amount: `+${currencySymbol}${tokenDiff.toFixed(2)}`,
          isPositive: true,
          iconBg: '#10B981',
          signature,
          blockTime: blockTime ?? undefined,
          currency: detectedCurrency,
          counterpartyWallet,
        };
      } else {
        return {
          id: signature,
          type: 'sent',
          title: 'Sent',
          time: timeStr,
          amount: `-${currencySymbol}${Math.abs(tokenDiff).toFixed(2)}`,
          isPositive: false,
          iconBg: '#374151',
          signature,
          blockTime: blockTime ?? undefined,
          currency: detectedCurrency,
          counterpartyWallet,
        };
      }
    }
  }

  // 2. Parsed instructions: find an SPL token transfer when the token balances do not record the owner
  if (parsedTx?.transaction?.message?.instructions) {
    const instructions = parsedTx.transaction.message.instructions as any[];
    for (const ix of instructions) {
      if (ix.program === 'spl-token' && ix.parsed) {
        const type = ix.parsed.type;
        const info = ix.parsed.info;
        if ((type === 'transfer' || type === 'transferChecked') && info) {
          const rawAmt = info.tokenAmount?.uiAmount ?? (info.amount ? Number(info.amount) / 1e6 : 0);
          if (info.authority === address || info.source === address) {
            return {
              id: signature,
              type: 'sent',
              title: 'Sent',
              time: timeStr,
              amount: `-$${rawAmt.toFixed(2)}`,
              isPositive: false,
              iconBg: '#374151',
              signature,
              blockTime: blockTime ?? undefined,
              currency: 'USDC',
            };
          }
          if (info.destination === address || info.wallet === address) {
            return {
              id: signature,
              type: 'received',
              title: 'Received',
              time: timeStr,
              amount: `+$${rawAmt.toFixed(2)}`,
              isPositive: true,
              iconBg: '#10B981',
              signature,
              blockTime: blockTime ?? undefined,
              currency: 'USDC',
            };
          }
        } else if (type === 'mintTo' && info) {
          const rawAmt = info.tokenAmount?.uiAmount ?? (info.amount ? Number(info.amount) / 1e6 : 0);
          if (info.account === address) {
            return {
              id: signature,
              type: 'received',
              title: 'Received',
              time: timeStr,
              amount: `+$${rawAmt.toFixed(2)}`,
              isPositive: true,
              iconBg: '#10B981',
              signature,
              blockTime: blockTime ?? undefined,
              currency: 'USDC',
            };
          }
        }
      }
    }
  }

  // 3. Native SOL (lamports) changes -> never show the word SOL, show the USD/VND equivalent
  if (meta?.preBalances && meta?.postBalances && parsedTx?.transaction?.message?.accountKeys) {
    const accountKeys = parsedTx.transaction.message.accountKeys;
    let userAccountIndex = -1;
    for (let j = 0; j < accountKeys.length; j++) {
      const key: any = accountKeys[j];
      const pubkeyStr =
        typeof key === 'string'
          ? key
          : key?.pubkey?.toBase58?.() || key?.pubkey || key?.toBase58?.() || '';
      if (pubkeyStr === address) {
        userAccountIndex = j;
        break;
      }
    }

    if (userAccountIndex !== -1) {
      const preBalance = meta.preBalances[userAccountIndex] ?? 0;
      const postBalance = meta.postBalances[userAccountIndex] ?? 0;
      const balanceDiffLamports = postBalance - preBalance;
      const solDiff = balanceDiffLamports / LAMPORTS_PER_SOL;

      // SOL received (above 0.005 SOL); D2: shown in SOL, never priced as dollars
      if (solDiff > 0.005) {
        return {
          id: signature,
          type: 'received',
          title: 'Received',
          time: timeStr,
          amount: solActivityAmount(solDiff),
          isPositive: true,
          iconBg: '#10B981',
          signature,
          blockTime: blockTime ?? undefined,
          currency: 'SOL',
        };
      }

      // The actual transfer (excluding the ~0.000005 SOL gas fee of the fee payer)
      const isFeePayer = userAccountIndex === 0;
      const feeSol = isFeePayer ? (meta.fee || 5000) / LAMPORTS_PER_SOL : 0;
      const netSentSol = Math.abs(solDiff) - feeSol;

      if (solDiff < 0 && netSentSol > 0.005) {
        return {
          id: signature,
          type: 'sent',
          title: 'Sent',
          time: timeStr,
          amount: solActivityAmount(-netSentSol),
          isPositive: false,
          iconBg: '#374151',
          signature,
          blockTime: blockTime ?? undefined,
          currency: 'SOL',
        };
      }
    }
  }

  // 4. Default: system transaction / hidden gas (marked as a network fee so it is filtered out)
  return {
    id: signature,
    type: 'GAS_FEE',
    title: 'Network fee',
    time: timeStr,
    amount: '$0.00',
    isPositive: false,
    iconBg: '#64748B',
    signature,
    blockTime: blockTime ?? undefined,
    isNetworkFee: true,
    currency: 'USDC',
  };
}

/**
 * Reads the on-chain history from Solana devnet safely, against rate limits and 429
 * - Loads each transaction separately with getParsedTransaction (avoids Helius RPC's 403 Forbidden on batches)
 * - Caches per address (address-scoped cache) so the sender (Sent) and recipient (Received) views stay apart
 */
export async function fetchOnChainHistory(address: string, force: boolean = false): Promise<ActivityItem[]> {
  if (!address) return [];

  const now = Date.now();
  const cached = addressHistoryCache.get(address);

  if (!force && cached && now - cached.timestamp < 10000 && cached.data.length > 0) {
    return cached.data;
  }

  // Deduplicate parallel calls for the same address
  if (inFlightHistoryMap.has(address)) {
    return inFlightHistoryMap.get(address)!;
  }

  const fetchPromise = (async () => {
    try {
      const pubKey = new PublicKey(address);

      // 1. The wallet's standard USDC ATA
      const usdcAta = getAssociatedTokenAddress(USDC_DEVNET_MINT, pubKey);

      // 2. Also scan the wallet's other token accounts (USDT, Token-2022)
      let additionalAtas: PublicKey[] = [];
      try {
        const [splTokenAccs, token2022Accs] = await Promise.all([
          solanaConnection.getParsedTokenAccountsByOwner(
            pubKey,
            { programId: TOKEN_PROGRAM_ID },
            'confirmed'
          ).catch(() => ({ value: [] })),
          solanaConnection.getParsedTokenAccountsByOwner(
            pubKey,
            { programId: TOKEN_2022_PROGRAM_ID },
            'confirmed'
          ).catch(() => ({ value: [] })),
        ]);

        const allParsedAccs = [...(splTokenAccs.value || []), ...(token2022Accs.value || [])];
        additionalAtas = allParsedAccs
          .map((a) => a.pubkey)
          .filter((p) => p && p.toBase58() !== usdcAta.toBase58());
      } catch (scanErr) {
        // ignore errors of the extra scan
      }

      // 3. Load the signature lists of the main wallet, the USDC ATA and the extra ATAs in parallel
      const targetAccountsToScan = [pubKey, usdcAta, ...additionalAtas.slice(0, 3)];
      const sigsResults = await Promise.all(
        targetAccountsToScan.map((acc) =>
          solanaConnection
            .getSignaturesForAddress(acc, { limit: 12 })
            .catch(() => [])
        )
      );

      // 4. Merge, deduplicate and sort the signatures, newest first
      const sigMap = new Map<string, any>();
      sigsResults.flat().forEach((sigInfo) => {
        if (sigInfo && sigInfo.signature && !sigMap.has(sigInfo.signature)) {
          sigMap.set(sigInfo.signature, sigInfo);
        }
      });

      const mergedSignatures = Array.from(sigMap.values())
        .sort((a, b) => (b.blockTime || 0) - (a.blockTime || 0))
        .slice(0, 15);

      if (mergedSignatures.length === 0) {
        return cached?.data || [];
      }

      const activities: ActivityItem[] = mergedSignatures.map((sigInfo) => {
        const isFailed = sigInfo.err !== null;
        return {
          id: sigInfo.signature,
          type: 'sent',
          title: isFailed ? 'Failed transaction' : 'Transaction',
          time: formatRelativeTime(sigInfo.blockTime),
          amount: '$0.00',
          isPositive: false,
          iconBg: isFailed ? '#DC2626' : '#374151',
          signature: sigInfo.signature,
          blockTime: sigInfo.blockTime ?? undefined,
          currency: 'USDC',
        };
      });

      // Signatures not yet in parsedTxCache
      const sigsToFetch: { signature: string; index: number; blockTime?: number | null }[] = [];
      mergedSignatures.forEach((s, idx) => {
        const txCacheKey = `${address}:${s.signature}`;
        if (parsedTxCache.has(txCacheKey)) {
          const cachedItem = parsedTxCache.get(txCacheKey)!;
          activities[idx] = {
            ...cachedItem,
            time: formatRelativeTime(s.blockTime),
            blockTime: s.blockTime ?? undefined,
          };
        } else {
          sigsToFetch.push({ signature: s.signature, index: idx, blockTime: s.blockTime });
        }
      });

      // Fetch the new transactions with independent Promise.all calls (avoids the 403 on batches at Helius)
      if (sigsToFetch.length > 0) {
        try {
          const parsedTxs = await Promise.all(
            sigsToFetch.map((item) =>
              solanaConnection
                .getParsedTransaction(item.signature, {
                  maxSupportedTransactionVersion: 0,
                  commitment: 'confirmed',
                })
                .catch((e) => {
                  console.warn('⚠️ [Solana History] Could not fetch transaction:', item.signature, e?.message);
                  return null;
                })
            )
          );

          parsedTxs.forEach((parsedTx, batchIdx) => {
            if (!parsedTx) return;
            const originalItem = sigsToFetch[batchIdx];
            const sig = originalItem.signature;
            const targetIndex = originalItem.index;
            const blockTime = parsedTx.blockTime ?? originalItem.blockTime;

            const parsedActivity = parseTransactionForAddress(parsedTx, address, sig, blockTime);
            activities[targetIndex] = parsedActivity;
            parsedTxCache.set(`${address}:${sig}`, parsedActivity);
          });
        } catch (fetchErr: any) {
          console.warn('⚠️ [Solana History] Could not parse transaction:', fetchErr?.message);
        }
      }

      // Hide gas, $0.00 and technical blockchain interactions
      const cleanActivities = activities.filter((act) => {
        if (!act) return false;
        if (act.isNetworkFee === true || act.type === 'GAS_FEE') return false;
        const amtStr = typeof act.amount === 'string' ? act.amount : String(act.amount || '');
        const cleanAmount = Math.abs(parseFloat(amtStr.replace(/[^0-9.-]+/g, '')) || 0);
        return cleanAmount >= 0.01;
      });

      addressHistoryCache.set(address, { timestamp: Date.now(), data: cleanActivities });
      return cleanActivities;
    } catch (error: any) {
      if (error?.message?.includes('429')) {
        console.warn('⚠️ [Solana History 429] Rate-limited on getSignaturesForAddress, using the cache.');
      } else {
        console.error('Error fetching on-chain history:', error);
      }
      return (cached?.data || []).filter((act) => {
        if (!act) return false;
        if (act.isNetworkFee === true || act.type === 'GAS_FEE') return false;
        const amtStr = typeof act.amount === 'string' ? act.amount : String(act.amount || '');
        const cleanAmount = Math.abs(parseFloat(amtStr.replace(/[^0-9.-]+/g, '')) || 0);
        return cleanAmount >= 0.01;
      });
    } finally {
      inFlightHistoryMap.delete(address);
    }
  })();

  inFlightHistoryMap.set(address, fetchPromise);
  return fetchPromise;
}
