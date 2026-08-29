import { Connection, PublicKey } from '@solana/web3.js';

export const SOLANA_DEVNET_RPC = 'https://api.devnet.solana.com';

export const solanaConnection = new Connection(SOLANA_DEVNET_RPC, 'confirmed');

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
 * Truy xuất lịch sử giao dịch on-chain từ Solana Devnet an toàn, chống rate-limit
 */
export async function fetchOnChainHistory(address: string): Promise<ActivityItem[]> {
  try {
    const pubKey = new PublicKey(address);

    // 1. Kéo danh sách chữ ký gần nhất (nhẹ & không bị chặn rate limit)
    const signaturesInfo = await solanaConnection.getSignaturesForAddress(pubKey, {
      limit: 10,
    });

    if (!signaturesInfo || signaturesInfo.length === 0) {
      return [];
    }

    // 2. Tạo khung danh sách giao dịch ban đầu từ metadata của chữ ký
    const activities: ActivityItem[] = signaturesInfo.map((sigInfo) => {
      const isFailed = sigInfo.err !== null;
      return {
        id: sigInfo.signature,
        type: isFailed ? 'sent' : 'received',
        title: isFailed ? 'Giao dịch lỗi' : 'Giao dịch Devnet',
        time: formatRelativeTime(sigInfo.blockTime),
        amount: isFailed ? '$0,00' : '+$0,10',
        isPositive: !isFailed,
        iconBg: isFailed ? '#DC2626' : '#10B981',
        signature: sigInfo.signature,
      };
    });

    // 3. Phân tích chi tiết biến động số dư cho các giao dịch gần nhất
    try {
      const topSigs = signaturesInfo.slice(0, 4);
      const parsedResults = await Promise.allSettled(
        topSigs.map((s) =>
          solanaConnection.getParsedTransaction(s.signature, {
            maxSupportedTransactionVersion: 0,
          })
        )
      );

      parsedResults.forEach((res, index) => {
        if (res.status === 'fulfilled' && res.value && res.value.meta) {
          const parsedTx = res.value;
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

            if (balanceDiffLamports > 0) {
              const solAmount = balanceDiffLamports / 1e9;
              const usdVal = solAmount * 150;
              activities[index] = {
                id: topSigs[index].signature,
                type: 'received',
                title: 'Nhận tiền',
                time: formatRelativeTime(blockTime),
                amount: `+$${usdVal < 0.01 ? '<0,01' : usdVal.toFixed(2).replace('.', ',')}`,
                isPositive: true,
                iconBg: '#10B981',
                signature: topSigs[index].signature,
              };
            } else if (balanceDiffLamports < 0) {
              const solAmount = Math.abs(balanceDiffLamports) / 1e9;
              const usdVal = solAmount * 150;
              activities[index] = {
                id: topSigs[index].signature,
                type: 'sent',
                title: 'Chuyển tiền',
                time: formatRelativeTime(blockTime),
                amount: `-$${usdVal < 0.01 ? '<0,01' : usdVal.toFixed(2).replace('.', ',')}`,
                isPositive: false,
                iconBg: '#374151',
                signature: topSigs[index].signature,
              };
            }
          }
        }
      });
    } catch (err) {
      console.log('Fallback signature metadata utilized:', err);
    }

    return activities;
  } catch (error) {
    console.error('Error fetching on-chain history:', error);
    return [];
  }
}
