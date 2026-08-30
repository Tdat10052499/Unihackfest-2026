import { InteractionManager } from 'react-native';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { lookupWalletByPhone } from './supabase';

export const SOLANA_DEVNET_RPC = 'https://api.devnet.solana.com';

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
}

export interface TransferResult {
  success: boolean;
  txSignature?: string;
  recipientAddress?: string;
  error?: string;
}

let lastFetchTime = 0;
let cachedHistoryResult: ActivityItem[] = [];
let isFetchingHistory = false;
const parsedTxCache = new Map<string, ActivityItem>();

/**
 * Lấy số dư SOL của một địa chỉ trên Solana Devnet
 */
export async function getSolanaBalance(address: string): Promise<number> {
  try {
    const publicKey = new PublicKey(address);
    const lamports = await solanaConnection.getBalance(publicKey);
    return lamports / 1000000000;
  } catch (error) {
    console.error('Error fetching Solana balance:', error);
    throw error;
  }
}

/**
 * Chuyển đổi timestamp Unix thành chuỗi thời gian tương đối
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
 * Truy xuất lịch sử giao dịch on-chain từ Solana Devnet an toàn, chống rate-limit & 429
 * - Sử dụng Immutable Signature Cache để không gọi lại getParsedTransaction cho các tx đã phân tích
 * - Concurrency Lock chống gọi chồng chéo
 */
export async function fetchOnChainHistory(address: string, force: boolean = false): Promise<ActivityItem[]> {
  const now = Date.now();
  if (isFetchingHistory) {
    return cachedHistoryResult;
  }
  if (!force && now - lastFetchTime < 3000 && cachedHistoryResult.length > 0) {
    return cachedHistoryResult;
  }

  isFetchingHistory = true;
  lastFetchTime = now;

  try {
    const pubKey = new PublicKey(address);

    const signaturesInfo = await solanaConnection.getSignaturesForAddress(pubKey, {
      limit: 10,
    });

    if (!signaturesInfo || signaturesInfo.length === 0) {
      isFetchingHistory = false;
      return cachedHistoryResult;
    }

    const activities: ActivityItem[] = signaturesInfo.map((sigInfo) => {
      const isFailed = sigInfo.err !== null;
      return {
        id: sigInfo.signature,
        type: isFailed ? 'sent' : 'sent',
        title: isFailed ? 'Giao dịch lỗi' : 'Giao dịch On-chain',
        time: formatRelativeTime(sigInfo.blockTime),
        amount: isFailed ? '$0.00' : '$0.00',
        isPositive: false,
        iconBg: isFailed ? '#DC2626' : '#374151',
        signature: sigInfo.signature,
      };
    });

    const topSigs = signaturesInfo.slice(0, 4);

    for (let index = 0; index < topSigs.length; index++) {
      const s = topSigs[index];
      const sig = s.signature;

      // 1. Kiểm tra cache đã phân tích chưa (tránh gọi lại RPC gây 429)
      if (parsedTxCache.has(sig)) {
        const cachedItem = parsedTxCache.get(sig)!;
        // Cập nhật lại relative time theo blockTime
        activities[index] = {
          ...cachedItem,
          time: formatRelativeTime(s.blockTime),
        };
        continue;
      }

      // 2. Nếu chưa có trong cache, gọi RPC phân tích
      try {
        if (index > 0) {
          await delay(120); // Delay nhẹ giữa các request mới
        }

        const parsedTx = await solanaConnection.getParsedTransaction(sig, {
          maxSupportedTransactionVersion: 0,
        });

        if (parsedTx && parsedTx.meta) {
          const meta = parsedTx.meta;
          const blockTime = parsedTx.blockTime;
          const accountKeys = parsedTx.transaction.message.accountKeys;

          let userAccountIndex = -1;
          for (let j = 0; j < accountKeys.length; j++) {
            const key = accountKeys[j];
            const pubkeyStr = typeof key === 'string' ? key : key.pubkey.toBase58();
            if (pubkeyStr === address) {
              userAccountIndex = j;
              break;
            }
          }

          if (meta && userAccountIndex !== -1 && meta.preBalances && meta.postBalances) {
            const preBalance = meta.preBalances[userAccountIndex] || 0;
            const postBalance = meta.postBalances[userAccountIndex] || 0;
            const balanceDiffLamports = postBalance - preBalance;

            let parsedItem: ActivityItem;

            if (balanceDiffLamports > 0) {
              const solAmount = balanceDiffLamports / 1e9;
              const usdVal = solAmount * 150;
              parsedItem = {
                id: sig,
                type: 'received',
                title: 'Nhận tiền',
                time: formatRelativeTime(blockTime),
                amount: `+$${usdVal < 0.01 ? '<0.01' : usdVal.toFixed(2)}`,
                isPositive: true,
                iconBg: '#10B981',
                signature: sig,
              };
            } else if (balanceDiffLamports < 0) {
              const solAmount = Math.abs(balanceDiffLamports) / 1e9;
              const usdVal = solAmount * 150;
              parsedItem = {
                id: sig,
                type: 'sent',
                title: 'Chuyển tiền',
                time: formatRelativeTime(blockTime),
                amount: `-$${usdVal < 0.01 ? '<0.01' : usdVal.toFixed(2)}`,
                isPositive: false,
                iconBg: '#374151',
                signature: sig,
              };
            } else {
              parsedItem = {
                id: sig,
                type: 'sent',
                title: 'Tương tác Web3',
                time: formatRelativeTime(blockTime),
                amount: '-$0.00',
                isPositive: false,
                iconBg: '#64748B',
                signature: sig,
              };
            }

            activities[index] = parsedItem;
            parsedTxCache.set(sig, parsedItem);
          }
        }
      } catch (parseErr) {
        console.log('Skipping single tx parse on rate-limit:', sig, parseErr);
      }
    }

    cachedHistoryResult = activities;
    return activities;
  } catch (error) {
    console.error('Error fetching on-chain history:', error);
    return cachedHistoryResult;
  } finally {
    isFetchingHistory = false;
  }
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
