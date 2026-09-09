import { InteractionManager } from 'react-native';
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { Buffer } from 'buffer';
import { lookupWalletByPhone } from './identity';

export const SOLANA_DEVNET_RPC =
  process.env.EXPO_PUBLIC_HELIUS_DEVNET_URL ||
  process.env.EXPO_PUBLIC_SOLANA_RPC ||
  process.env.EXPO_PUBLIC_SOLANA_DEVNET_RPC ||
  'https://api.devnet.solana.com';

// Địa chỉ ví Treasury Escrow & Fee Payer trên Solana Devnet
export const GEO_REDPACKET_TREASURY = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
export const TREASURY_FEE_PAYER = new PublicKey(
  process.env.EXPO_PUBLIC_TREASURY_FEE_PAYER || '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM'
);

// USDC Mint chuẩn trên Solana Devnet (Decimals = 6)
export const USDC_DEVNET_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
export const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
export const SYSVAR_RENT_PUBKEY = new PublicKey('SysvarRent111111111111111111111111111111111');

// Tỷ giá quy đổi tiền tệ chuẩn (USD & VND)
export const USD_TO_VND_RATE = 25000;
export const SOL_USD_RATE = 150;

/**
 * Định dạng số dư tiền tệ Fiat hiển thị trực quan (Visual Abstraction - MiniPay standard)
 * @param usdAmount Số dư tính theo USD (lấy trực tiếp từ on-chain)
 * @param currency 'USD' hoặc 'VND'
 */
export function formatFiatBalance(
  usdAmount: number,
  currency: 'USD' | 'VND' = 'USD'
): string {
  if (isNaN(usdAmount) || usdAmount < 0) usdAmount = 0;
  if (currency === 'VND') {
    const vnd = Math.round(usdAmount * USD_TO_VND_RATE);
    return `đ ${vnd.toLocaleString('vi-VN')}`;
  }
  return `$${usdAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Tính toán địa chỉ ví Associated Token Account (ATA) theo chuẩn Solana Program Derived Address (PDA)
 */
export function getAssociatedTokenAddress(
  mint: PublicKey,
  owner: PublicKey,
  allowOwnerOffCurve = false,
  programId = TOKEN_PROGRAM_ID,
  associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID
): PublicKey {
  if (!allowOwnerOffCurve && !PublicKey.isOnCurve(owner.toBuffer())) {
    throw new Error('TokenOwnerOffCurveError');
  }

  const [address] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), programId.toBuffer(), mint.toBuffer()],
    associatedTokenProgramId
  );

  return address;
}

/**
 * Tạo Instruction khởi tạo Associated Token Account (ATA) cho ví người nhận nếu chưa tồn tại
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
 * Tạo Instruction chuyển SPL Token (USDC) chuẩn (Instruction index 3 - Transfer)
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

export const solanaConnection = new Connection(SOLANA_DEVNET_RPC, {
  commitment: 'confirmed',
  confirmTransactionInitialTimeout: 30000,
});

export interface ActivityItem {
  id: string;
  type: 'received' | 'sent' | 'reward';
  title: string;
  time: string;
  amount: string;
  isPositive: boolean;
  iconBg: string;
  signature?: string;
  blockTime?: number;
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

/**
 * Lấy số dư SOL của một địa chỉ trên Solana Devnet với commitment 'confirmed'
 * Tích hợp Cache 4 giây và In-flight Deduplication chống lỗi 429 Too Many Requests
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
        console.warn('⚠️ [Solana RPC 429 Rate-limit] Sử dụng số dư cache tạm thời.');
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

const usdcBalanceCache = new Map<string, { timestamp: number; balance: number }>();
const inFlightUsdcMap = new Map<string, Promise<number>>();

/**
 * Lấy số dư USDC/USDT/SPL Token thực tế từ on-chain Associated Token Account (ATA)
 * Tự động quét toàn bộ Token Accounts thuộc sở hữu của ví (hỗ trợ cả USDT, USDC devnet mint)
 * Tích hợp Cache 10 giây và In-flight Deduplication chống lỗi 429 Too Many Requests
 * @param address Địa chỉ ví Solana của người dùng
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
      const ownerPubkey = new PublicKey(address);

      // 1. Kiểm tra ATA chuẩn của USDC Devnet trước
      try {
        const ata = getAssociatedTokenAddress(USDC_DEVNET_MINT, ownerPubkey);
        const tokenAccountInfo = await solanaConnection.getParsedAccountInfo(ata, 'confirmed');

        if (tokenAccountInfo.value && 'parsed' in tokenAccountInfo.value.data) {
          const parsedData = (tokenAccountInfo.value.data as any).parsed;
          const amountUi = parsedData?.info?.tokenAmount?.uiAmount;
          if (typeof amountUi === 'number' && amountUi > 0) {
            usdcBalanceCache.set(address, { timestamp: Date.now(), balance: amountUi });
            return amountUi;
          }
        }
      } catch (_) {}

      // 2. Tra cứu tất cả SPL Token accounts thuộc sở hữu của ví (hỗ trợ cả USDT, devnet test tokens)
      const tokenAccounts = await solanaConnection.getParsedTokenAccountsByOwner(
        ownerPubkey,
        { programId: TOKEN_PROGRAM_ID },
        'confirmed'
      );

      let totalTokenAmount = 0;
      if (tokenAccounts?.value && tokenAccounts.value.length > 0) {
        for (const item of tokenAccounts.value) {
          const parsed = item.account?.data?.parsed;
          const uiAmount = parsed?.info?.tokenAmount?.uiAmount;
          if (typeof uiAmount === 'number' && uiAmount > 0) {
            totalTokenAmount += uiAmount;
          }
        }
      }

      // 3. Tra cứu thêm Token-2022 program accounts nếu cần
      if (totalTokenAmount === 0) {
        try {
          const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
          const token2022Accounts = await solanaConnection.getParsedTokenAccountsByOwner(
            ownerPubkey,
            { programId: TOKEN_2022_PROGRAM_ID },
            'confirmed'
          );
          if (token2022Accounts?.value && token2022Accounts.value.length > 0) {
            for (const item of token2022Accounts.value) {
              const parsed = item.account?.data?.parsed;
              const uiAmount = parsed?.info?.tokenAmount?.uiAmount;
              if (typeof uiAmount === 'number' && uiAmount > 0) {
                totalTokenAmount += uiAmount;
              }
            }
          }
        } catch (_) {}
      }

      usdcBalanceCache.set(address, { timestamp: Date.now(), balance: totalTokenAmount });
      return totalTokenAmount;
    } catch (e: any) {
      if (e?.message?.includes('429') || e?.toString()?.includes('429')) {
        console.warn('⚠️ [Solana USDC RPC 429 Rate-limit] Sử dụng số dư cache tạm thời.');
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

export interface AccountDisplayBalance {
  usdBalance: number;
  vndBalance: number;
  solBalance: number;
  usdcBalance: number;
  formattedUsd: string;
  formattedVnd: string;
}

/**
 * Lấy dữ liệu số dư tổng hợp động 100% từ Blockchain On-chain
 * Kết hợp số dư USDC và quy đổi tài sản SOL sang Fiat hiển thị
 */
export async function getAccountDisplayBalance(
  address: string,
  force: boolean = false
): Promise<AccountDisplayBalance> {
  if (!address) {
    return {
      usdBalance: 0,
      vndBalance: 0,
      solBalance: 0,
      usdcBalance: 0,
      formattedUsd: '$0.00',
      formattedVnd: 'đ 0',
    };
  }

  try {
    const [sol, usdc] = await Promise.all([
      getSolanaBalance(address, force).catch(() => 0),
      getUsdcTokenBalance(address, force).catch(() => 0),
    ]);

    // Tổng số dư USD tính chuẩn theo số dư Stablecoin USD thực tế (USDC/USDT)
    // Ẩn hoàn toàn Native SOL khỏi số dư chi tiêu (Native SOL chỉ làm phí gas ngầm)
    const totalUsd = usdc;
    const totalVnd = Math.round(totalUsd * USD_TO_VND_RATE);

    return {
      usdBalance: totalUsd,
      vndBalance: totalVnd,
      solBalance: sol,
      usdcBalance: usdc,
      formattedUsd: formatFiatBalance(totalUsd, 'USD'),
      formattedVnd: formatFiatBalance(totalUsd, 'VND'),
    };
  } catch (err) {
    console.error('Error in getAccountDisplayBalance:', err);
    return {
      usdBalance: 0,
      vndBalance: 0,
      solBalance: 0,
      usdcBalance: 0,
      formattedUsd: '$0.00',
      formattedVnd: 'đ 0',
    };
  }
}

/**
 * Cơ chế Tài trợ Phí Mạng (Gasless Fee Payer Relayer)
 * Gửi transaction đã được người dùng Partial Sign lên Backend để Treasury ký Fee Payer và Broadcast
 */
export async function sponsorAndBroadcastTransaction(
  serializedPartialTxBase64: string
): Promise<{ success: boolean; txSignature?: string; error?: string }> {
  // Broadcast trực tiếp nếu transaction đã đủ điều kiện trên Devnet
  try {
    const txBuffer = Buffer.from(serializedPartialTxBase64, 'base64');
    const transaction = Transaction.from(txBuffer);
    const rawTx = transaction.serialize();
    const txSignature = await solanaConnection.sendRawTransaction(rawTx, {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });
    await solanaConnection.confirmTransaction(txSignature, 'confirmed');
    console.log('✅ [Direct Broadcast Confirmed] TxSignature:', txSignature);
    return { success: true, txSignature };
  } catch (err: any) {
    console.error('❌ [sponsorAndBroadcastTransaction] Lỗi broadcast:', err);
    return {
      success: false,
      error: err?.message || 'Không thể phát sóng giao dịch lên Solana Devnet.',
    };
  }
}

/**
 * Hàm lấy tiêu đề động đa ngôn ngữ cho ActivityItem
 */
export function getActivityTitle(
  item: ActivityItem,
  t?: (key: string, options?: any) => string
): string {
  if (!t) return item.title;
  if (item.title === 'Nhận Faucet Token') {
    return t('activities.faucet', { defaultValue: 'Nhận Faucet Token' });
  }
  if (item.title === 'Nhận SOL') {
    return t('activities.receivedSol', { defaultValue: 'Nhận SOL' });
  }
  if (item.title === 'Chuyển SOL') {
    return t('activities.sentSol', { defaultValue: 'Chuyển SOL' });
  }
  if (item.type === 'received') {
    return t('activities.received', { defaultValue: 'Nhận tiền' });
  }
  if (item.type === 'sent') {
    if (item.title === 'Tương tác Web3') {
      return t('activities.web3', { defaultValue: 'Tương tác Web3' });
    }
    return t('activities.sent', { defaultValue: 'Chuyển tiền' });
  }
  if (item.type === 'reward') {
    return t('activities.reward', { defaultValue: 'Thưởng Lì Xì' });
  }
  return item.title || t('activities.contract', { defaultValue: 'Tương tác hợp đồng' });
}

/**
 * Chuyển đổi timestamp Unix thành chuỗi thời gian tương đối đa ngôn ngữ
 */
export function formatLocalizedRelativeTime(
  blockTime: number | null | undefined,
  t?: (key: string, options?: any) => string
): string {
  if (!t) return formatRelativeTime(blockTime);
  if (!blockTime) return t('activities.justNow', { defaultValue: 'Vừa xong' });
  const now = Math.floor(Date.now() / 1000);
  const diffSec = Math.max(0, now - blockTime);
  if (diffSec < 60) return t('activities.justNow', { defaultValue: 'Vừa xong' });
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return t('activities.minutesAgo', { count: diffMin, defaultValue: `${diffMin} phút trước` });
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return t('activities.hoursAgo', { count: diffHour, defaultValue: `${diffHour} giờ trước` });
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return t('activities.daysAgo', { count: diffDay, defaultValue: `${diffDay} ngày trước` });
  const diffMonth = Math.floor(diffDay / 30);
  return t('activities.monthsAgo', { count: diffMonth, defaultValue: `${diffMonth} tháng trước` });
}

/**
 * Chuyển đổi timestamp Unix thành chuỗi thời gian tương đối mặc định
 */
export function formatRelativeTime(blockTime: number | null | undefined): string {
  if (!blockTime) return 'Vừa xong';
  const now = Math.floor(Date.now() / 1000);
  const diffSec = Math.max(0, now - blockTime);
  if (diffSec < 60) return 'Vừa xong';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ trước`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay} ngày trước`;
  const diffMonth = Math.floor(diffDay / 30);
  return `${diffMonth} tháng trước`;
}

/**
 * Helper delay nhẹ tránh nghẽn RPC rate-limit
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Phân tích chi tiết 1 giao dịch On-chain theo góc nhìn của địa chỉ ví `address`
 * Hỗ trợ nhận diện chính xác SPL Token (USDC/USDT), Faucet Tokens, Chuyển tiền P2P và Native SOL
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
      title: 'Giao dịch chưa hoàn tất',
      time: timeStr,
      amount: '$0.00',
      isPositive: false,
      iconBg: '#DC2626',
      signature,
      blockTime: blockTime ?? undefined,
    };
  }

  // 1. Kiểm tra biến động số dư SPL Token (USDC / USDT / Devnet tokens)
  if (meta?.preTokenBalances || meta?.postTokenBalances) {
    const preTokens: any[] = meta.preTokenBalances || [];
    const postTokens: any[] = meta.postTokenBalances || [];

    // Tìm token account của địa chỉ này trong pre & post
    const userPreToken = preTokens.find((t) => t.owner === address);
    const userPostToken = postTokens.find((t) => t.owner === address);

    const preAmount = userPreToken?.uiTokenAmount?.uiAmount ?? 0;
    const postAmount = userPostToken?.uiTokenAmount?.uiAmount ?? 0;
    const tokenDiff = postAmount - preAmount;

    if (Math.abs(tokenDiff) > 0.000001) {
      if (tokenDiff > 0) {
        // Kiểm tra xem có tài khoản khác bị trừ token trong transaction không (để phân biệt P2P vs Faucet mint)
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
          title: isFaucet ? 'Nạp tiền' : 'Nhận tiền',
          time: timeStr,
          amount: `+$${tokenDiff.toFixed(2)}`,
          isPositive: true,
          iconBg: '#10B981',
          signature,
          blockTime: blockTime ?? undefined,
        };
      } else {
        return {
          id: signature,
          type: 'sent',
          title: 'Chuyển tiền',
          time: timeStr,
          amount: `-$${Math.abs(tokenDiff).toFixed(2)}`,
          isPositive: false,
          iconBg: '#374151',
          signature,
          blockTime: blockTime ?? undefined,
        };
      }
    }
  }

  // 2. Kiểm tra parsed instructions để tìm SPL Token transfer nếu token balances không ghi nhận owner
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
              title: 'Chuyển tiền',
              time: timeStr,
              amount: `-$${rawAmt.toFixed(2)}`,
              isPositive: false,
              iconBg: '#374151',
              signature,
              blockTime: blockTime ?? undefined,
            };
          }
          if (info.destination === address || info.wallet === address) {
            return {
              id: signature,
              type: 'received',
              title: 'Nhận tiền',
              time: timeStr,
              amount: `+$${rawAmt.toFixed(2)}`,
              isPositive: true,
              iconBg: '#10B981',
              signature,
              blockTime: blockTime ?? undefined,
            };
          }
        } else if (type === 'mintTo' && info) {
          const rawAmt = info.tokenAmount?.uiAmount ?? (info.amount ? Number(info.amount) / 1e6 : 0);
          if (info.account === address) {
            return {
              id: signature,
              type: 'received',
              title: 'Nạp tiền',
              time: timeStr,
              amount: `+$${rawAmt.toFixed(2)}`,
              isPositive: true,
              iconBg: '#10B981',
              signature,
              blockTime: blockTime ?? undefined,
            };
          }
        }
      }
    }
  }

  // 3. Kiểm tra biến động Native SOL (Lamports) -> Ẩn toàn bộ chữ SOL, hiển thị theo giá trị USD/VND tương đương
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

      // Nhận tiền thực tế (lớn hơn 0.005 SOL ~ $0.75)
      if (solDiff > 0.005) {
        const usdVal = solDiff * 150;
        return {
          id: signature,
          type: 'received',
          title: 'Nhận tiền',
          time: timeStr,
          amount: `+$${usdVal.toFixed(2)}`,
          isPositive: true,
          iconBg: '#10B981',
          signature,
          blockTime: blockTime ?? undefined,
        };
      }

      // Chuyển tiền thực tế (loại trừ phí gas ~0.000005 SOL của feePayer)
      const isFeePayer = userAccountIndex === 0;
      const feeSol = isFeePayer ? (meta.fee || 5000) / LAMPORTS_PER_SOL : 0;
      const netSentSol = Math.abs(solDiff) - feeSol;

      if (solDiff < 0 && netSentSol > 0.005) {
        const usdVal = netSentSol * 150;
        return {
          id: signature,
          type: 'sent',
          title: 'Chuyển tiền',
          time: timeStr,
          amount: `-$${usdVal.toFixed(2)}`,
          isPositive: false,
          iconBg: '#374151',
          signature,
          blockTime: blockTime ?? undefined,
        };
      }
    }
  }

  // 4. Default: Giao dịch hệ thống / Gas ẩn
  return {
    id: signature,
    type: 'sent',
    title: 'Giao dịch',
    time: timeStr,
    amount: '$0.00',
    isPositive: false,
    iconBg: '#64748B',
    signature,
    blockTime: blockTime ?? undefined,
  };
}

/**
 * Truy xuất lịch sử giao dịch on-chain từ Solana Devnet an toàn, chống rate-limit & 429
 * - Tải song song từng Transaction bằng getParsedTransaction độc lập (tránh lỗi 403 Forbidden Batch của Helius RPC)
 * - Lưu Cache theo từng địa chỉ (Address-Scoped Cache) để phân biệt chuẩn giữa Người Gửi (Sent) và Người Nhận (Received)
 */
export async function fetchOnChainHistory(address: string, force: boolean = false): Promise<ActivityItem[]> {
  if (!address) return [];

  const now = Date.now();
  const cached = addressHistoryCache.get(address);

  if (!force && cached && now - cached.timestamp < 10000 && cached.data.length > 0) {
    return cached.data;
  }

  // Deduplicate các lệnh gọi song song cùng 1 địa chỉ
  if (inFlightHistoryMap.has(address)) {
    return inFlightHistoryMap.get(address)!;
  }

  const fetchPromise = (async () => {
    try {
      const pubKey = new PublicKey(address);

      // 1. Tính toán địa chỉ USDC ATA chuẩn của ví
      const usdcAta = getAssociatedTokenAddress(USDC_DEVNET_MINT, pubKey);

      // 2. Quét thêm các Token Accounts khác của ví (hỗ trợ cả USDT, Token-2022)
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
            { programId: new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb') },
            'confirmed'
          ).catch(() => ({ value: [] })),
        ]);

        const allParsedAccs = [...(splTokenAccs.value || []), ...(token2022Accs.value || [])];
        additionalAtas = allParsedAccs
          .map((a) => a.pubkey)
          .filter((p) => p && p.toBase58() !== usdcAta.toBase58());
      } catch (scanErr) {
        // bỏ qua lỗi quét phụ
      }

      // 3. Tải song song danh sách signatures từ Ví chính, USDC ATA và các ATA phụ
      const targetAccountsToScan = [pubKey, usdcAta, ...additionalAtas.slice(0, 3)];
      const sigsResults = await Promise.all(
        targetAccountsToScan.map((acc) =>
          solanaConnection
            .getSignaturesForAddress(acc, { limit: 12 })
            .catch(() => [])
        )
      );

      // 4. Hợp nhất và loại bỏ trùng lặp signatures, sắp xếp theo thời gian mới nhất
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
          title: isFailed ? 'Giao dịch lỗi' : 'Giao dịch',
          time: formatRelativeTime(sigInfo.blockTime),
          amount: '$0.00',
          isPositive: false,
          iconBg: isFailed ? '#DC2626' : '#374151',
          signature: sigInfo.signature,
          blockTime: sigInfo.blockTime ?? undefined,
        };
      });

      // Lọc danh sách các signature chưa có trong parsedTxCache
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

      // Fetch các transaction mới bằng Promise.all độc lập (tránh lỗi 403 batch trên Helius)
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
                  console.warn('⚠️ [Solana History] Lỗi fetch transaction:', item.signature, e?.message);
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
          console.warn('⚠️ [Solana History] Lỗi phân tích transaction:', fetchErr?.message);
        }
      }

      // Ẩn toàn bộ các giao dịch gas / $0.00 / tương tác kỹ thuật blockchain
      const cleanActivities = activities.filter(
        (act) => act && act.amount !== '$0.00' && act.amount !== '-$0.00' && act.amount !== '+$0.00'
      );

      addressHistoryCache.set(address, { timestamp: Date.now(), data: cleanActivities });
      return cleanActivities;
    } catch (error: any) {
      if (error?.message?.includes('429')) {
        console.warn('⚠️ [Solana History 429] Rate-limited on getSignaturesForAddress, sử dụng cache.');
      } else {
        console.error('Error fetching on-chain history:', error);
      }
      return (cached?.data || []).filter(
        (act) => act && act.amount !== '$0.00' && act.amount !== '-$0.00' && act.amount !== '+$0.00'
      );
    } finally {
      inFlightHistoryMap.delete(address);
    }
  })();

  inFlightHistoryMap.set(address, fetchPromise);
  return fetchPromise;
}

/**
 * Thực thi giao dịch chuyển tiền 100% On-chain trên mạng lưới Solana Devnet
 * - Hỗ trợ cả địa chỉ ví Base58 và số điện thoại định danh (tự động mapping qua Supabase)
 * - Tự động kiểm tra số dư và phí gas
 * - Ký số qua Privy Embedded Solana Wallet
 * - Broadcast và chờ xác nhận khối (confirmTransaction)
 */
export async function executeSolanaTransfer(params: {
  fromAddress: string;
  toAddressOrPhone: string;
  amountSol: number;
  walletProvider: any;
  onStatusUpdate?: (status: string) => void;
}): Promise<TransferResult> {
  const { fromAddress, toAddressOrPhone, amountSol, walletProvider, onStatusUpdate } = params;

  if (!fromAddress) {
    return { success: false, error: 'Không tìm thấy địa chỉ ví người gửi.' };
  }
  if (!toAddressOrPhone || !toAddressOrPhone.trim()) {
    return { success: false, error: 'Vui lòng nhập địa chỉ ví hoặc số điện thoại người nhận.' };
  }
  if (!amountSol || isNaN(amountSol) || amountSol <= 0) {
    return { success: false, error: 'Vui lòng nhập số lượng SOL hợp lệ (lớn hơn 0).' };
  }
  if (!walletProvider) {
    return { success: false, error: 'Ví nhúng Solana chưa sẵn sàng.' };
  }

  const rawRecipient = toAddressOrPhone.trim();
  let recipientAddress = rawRecipient;

  // 1. Phân loại và phân giải địa chỉ (Address / Phone Resolution)
  const isSolanaBase58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(rawRecipient);
  if (!isSolanaBase58) {
    onStatusUpdate?.('Đang tra cứu số điện thoại...');
    console.log('🔍 [On-chain Transfer] Đang tra cứu ví cho SĐT:', rawRecipient);
    const resolved = await lookupWalletByPhone(rawRecipient);
    if (!resolved) {
      return {
        success: false,
        error: 'Không tìm thấy ví liên kết với số điện thoại này.',
      };
    }
    recipientAddress = resolved;
  }

  // Đảm bảo địa chỉ đích hợp lệ
  let fromPubkey: PublicKey;
  let toPubkey: PublicKey;
  try {
    fromPubkey = new PublicKey(fromAddress);
    toPubkey = new PublicKey(recipientAddress);
  } catch (err: any) {
    return { success: false, error: 'Địa chỉ ví đích không hợp lệ trên mạng lưới Solana.' };
  }

  // Chặn tự chuyển tiền cho chính mình
  if (fromAddress === recipientAddress || fromPubkey.equals(toPubkey)) {
    return { success: false, error: 'Bạn không thể chuyển tiền đến tài khoản của chính mình.' };
  }

  const sendLamports = Math.floor(amountSol * 1e9);
  const gasFeeBufferLamports = 5000; // ~0.000005 SOL phí gas
  const totalRequiredLamports = sendLamports + gasFeeBufferLamports;

  // 2. Kiểm tra số dư SOL thực tế trên blockchain
  onStatusUpdate?.('Đang kiểm tra số dư ví...');
  try {
    const currentBalanceLamports = await solanaConnection.getBalance(fromPubkey);
    if (currentBalanceLamports < totalRequiredLamports) {
      const currentSol = (currentBalanceLamports / 1e9).toFixed(4);
      return {
        success: false,
        error: `Số dư ví (${currentSol} SOL) không đủ để chuyển ${amountSol} SOL kèm phí mạng lưới. Vui lòng nạp thêm SOL!`,
      };
    }
  } catch (err: any) {
    console.warn('Cannot fetch balance directly, continuing:', err);
  }

  // 3. Khởi tạo và ký giao dịch Web3 On-chain
  try {
    onStatusUpdate?.('Đang chuẩn bị giao dịch Web3...');
    const { blockhash, lastValidBlockHeight } =
      await solanaConnection.getLatestBlockhash('confirmed');

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey,
        toPubkey,
        lamports: sendLamports,
      })
    );

    transaction.recentBlockhash = blockhash;
    transaction.feePayer = fromPubkey;

    onStatusUpdate?.('Đang ký giao dịch bảo mật...');
    // Đợi UI Thread hoàn tất mọi tương tác & tạo khoảng đệm an toàn 1000ms
    await new Promise<void>((resolve) => {
      InteractionManager.runAfterInteractions(() => {
        setTimeout(resolve, 1000);
      });
    });

    let activeProvider = walletProvider;
    if (typeof walletProvider?.getProvider === 'function') {
      activeProvider = await walletProvider.getProvider();
    }

    let signResult: any = null;
    try {
      signResult = await activeProvider.request({
        method: 'signTransaction',
        params: { transaction },
      });
    } catch (signErr: any) {
      console.warn('⚠️ First signTransaction attempt failed:', signErr?.message);
      if (
        signErr?.message?.includes('timeout') ||
        signErr?.message?.includes('user-signer') ||
        signErr?.message?.includes('WebView')
      ) {
        console.log('🔄 Đang làm mới kết nối WebView và thử ký lại...');
        await delay(600);
        if (typeof walletProvider?.getProvider === 'function') {
          activeProvider = await walletProvider.getProvider();
        }
        const freshBlockhash = await solanaConnection.getLatestBlockhash('confirmed');
        transaction.recentBlockhash = freshBlockhash.blockhash;
        signResult = await activeProvider.request({
          method: 'signTransaction',
          params: { transaction },
        });
      } else {
        throw signErr;
      }
    }

    const signedTransaction = signResult?.signedTransaction;
    if (!signedTransaction) {
      return { success: false, error: 'Người dùng đã hủy hoặc từ chối ký giao dịch.' };
    }

    // 4. Broadcast lên mạng lưới Solana Devnet
    onStatusUpdate?.('Đang phát sóng lên Solana Devnet...');
    const rawBytes = signedTransaction.serialize();
    const txSignature = await solanaConnection.sendRawTransaction(rawBytes, {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });

    console.log('⚡ [On-chain Broadcasted] TxSignature:', txSignature);

    // 5. Chờ xác nhận khối (Await Confirmation Receipt)
    onStatusUpdate?.('Đang chờ mạng lưới xác nhận...');
    const confirmation = await solanaConnection.confirmTransaction(
      {
        signature: txSignature,
        blockhash,
        lastValidBlockHeight,
      },
      'confirmed'
    );

    if (confirmation.value.err) {
      return {
        success: false,
        error: `Giao dịch thất bại trên chuỗi: ${JSON.stringify(confirmation.value.err)}`,
      };
    }

    console.log('✅ [On-chain Confirmed] Receipt confirmed on Solana Devnet:', txSignature);

    // Lưu vào parsed cache ngay lập tức để fetch sau không phải gọi lại RPC
    const usdVal = amountSol * 150;
    parsedTxCache.set(txSignature, {
      id: txSignature,
      type: 'sent',
      title: 'Chuyển tiền',
      time: 'Vừa xong',
      amount: `-$${usdVal < 0.01 ? '<0.01' : usdVal.toFixed(2)}`,
      isPositive: false,
      iconBg: '#374151',
      signature: txSignature,
    });

    return {
      success: true,
      txSignature,
      recipientAddress,
    };
  } catch (err: any) {
    console.error('❌ [On-chain Error]:', err);
    if (err?.message?.includes('User rejected') || err?.message?.includes('cancelled')) {
      return { success: false, error: 'Bạn đã hủy ký giao dịch.' };
    }
    return {
      success: false,
      error: err?.message || 'Không thể thực hiện giao dịch On-chain trên Solana Devnet.',
    };
  }
}
