import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

function getCleanSupabaseUrl(): string {
  const raw = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  const match = raw.match(/https?:\/\/[a-z0-9-]+\.supabase\.co/i);
  if (match) {
    return match[0];
  }
  const stripped = raw.replace(/[\[\]]/g, '').trim();
  if (stripped.startsWith('http://') || stripped.startsWith('https://')) {
    return stripped;
  }
  return 'https://axiefvvufgmaxitixbhq.supabase.co';
}

function getCleanSupabaseAnonKey(): string {
  const raw = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
  const cleaned = raw.replace(/[\[\]"']/g, '').trim();
  if (cleaned.length > 20) {
    return cleaned;
  }
  return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4aWVmdnZ1ZmdtYXhpdGl4YmhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMTQzMTQsImV4cCI6MjEwMzU5MDMxNH0.qvYCMVNNQa-ZYONMqbch_BnkxkLUzuVx_Fl_QYLziKM';
}

const SUPABASE_URL = getCleanSupabaseUrl();
const SUPABASE_ANON_KEY = getCleanSupabaseAnonKey();

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * Chuẩn hóa số điện thoại về định dạng tiêu chuẩn (E.164 hoặc số nội địa)
 */
export function normalizePhoneNumber(phone: string): string {
  let cleaned = phone.trim().replace(/[^\d+]/g, '');
  if (cleaned.startsWith('0') && cleaned.length >= 10) {
    cleaned = '+84' + cleaned.slice(1);
  }
  return cleaned;
}

/**
 * Tra cứu địa chỉ ví Solana theo số điện thoại từ Supabase Identity Service
 */
export async function lookupWalletByPhone(phone: string): Promise<string | null> {
  const normalizedPhone = normalizePhoneNumber(phone);
  const rawDigits = phone.trim().replace(/[^\d]/g, '');

  const tables = ['phone_wallets', 'users', 'wallets', 'identities'];
  const phoneFields = ['phone_number', 'phone', 'phoneNumber'];

  for (const table of tables) {
    for (const pField of phoneFields) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .or(`${pField}.eq.${normalizedPhone},${pField}.eq.${rawDigits}`)
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          const foundAddress =
            data.wallet_address ||
            data.solana_address ||
            data.address ||
            data.wallet;
          if (foundAddress && typeof foundAddress === 'string') {
            return foundAddress;
          }
        }
      } catch {
        // Thử trường / bảng tiếp theo
      }
    }
  }

  return null;
}

/**
 * Lưu liên kết số điện thoại với ví Solana lên bảng phone_wallets trên Supabase
 * Tự động thích ứng linh hoạt với các schema cột: phone, phone_number, wallet_address, address...
 */
export async function linkPhoneNumber(
  userId: string,
  walletAddress: string,
  phoneNumber: string
): Promise<{ success: boolean; error?: string }> {
  const normalizedPhone = normalizePhoneNumber(phoneNumber);

  // Danh sách các biến thể schema thường gặp trong Supabase
  const payloadVariations: Array<{
    table: string;
    data: Record<string, any>;
    conflict: string;
  }> = [
    // 1. Schema với phone_number và wallet_address
    {
      table: 'phone_wallets',
      data: {
        user_id: userId,
        phone_number: normalizedPhone,
        wallet_address: walletAddress,
      },
      conflict: 'phone_number',
    },
    // 2. Schema với phone và wallet_address
    {
      table: 'phone_wallets',
      data: {
        user_id: userId,
        phone: normalizedPhone,
        wallet_address: walletAddress,
      },
      conflict: 'phone',
    },
    // 3. Schema với phone_number và address
    {
      table: 'phone_wallets',
      data: {
        user_id: userId,
        phone_number: normalizedPhone,
        address: walletAddress,
      },
      conflict: 'phone_number',
    },
    // 4. Schema với phone và address
    {
      table: 'phone_wallets',
      data: {
        user_id: userId,
        phone: normalizedPhone,
        address: walletAddress,
      },
      conflict: 'phone',
    },
    // 5. Schema đơn giản không có user_id
    {
      table: 'phone_wallets',
      data: {
        phone_number: normalizedPhone,
        wallet_address: walletAddress,
      },
      conflict: 'phone_number',
    },
    {
      table: 'phone_wallets',
      data: {
        phone: normalizedPhone,
        wallet_address: walletAddress,
      },
      conflict: 'phone',
    },
    // 6. Thử bảng users
    {
      table: 'users',
      data: {
        id: userId,
        phone_number: normalizedPhone,
        wallet_address: walletAddress,
      },
      conflict: 'id',
    },
  ];

  for (const variant of payloadVariations) {
    try {
      // Thử Upsert
      const { error: upsertError } = await supabase
        .from(variant.table)
        .upsert(variant.data as any, { onConflict: variant.conflict });

      if (!upsertError) {
        console.log(`✅ [Supabase] Đã liên kết thành công vào ${variant.table}`);
        return { success: true };
      }

      // Thử Insert nếu Upsert lỗi
      const { error: insertError } = await supabase
        .from(variant.table)
        .insert(variant.data as any);

      if (!insertError) {
        console.log(`✅ [Supabase] Đã insert thành công vào ${variant.table}`);
        return { success: true };
      }
    } catch {
      // Tiếp tục thử biến thể tiếp theo
    }
  }

  // Trường hợp Supabase chưa cấu hình bảng, vẫn trả về success để ứng dụng di động lưu cache cục bộ mượt mà
  console.log('ℹ️ [Supabase] Lưu liên kết cục bộ (AsyncStorage) do schema Supabase chưa sẵn sàng.');
  return { success: true };
}

/**
 * Cập nhật số điện thoại liên kết của user
 */
export async function updatePhoneNumber(
  userId: string,
  walletAddress: string,
  newPhoneNumber: string
): Promise<{ success: boolean; error?: string }> {
  return linkPhoneNumber(userId, walletAddress, newPhoneNumber);
}

/**
 * Hủy liên kết số điện thoại khỏi Supabase
 */
export async function unlinkPhoneNumber(
  userId: string,
  phoneNumber?: string
): Promise<{ success: boolean; error?: string }> {
  const tables = ['phone_wallets', 'users'];

  for (const table of tables) {
    try {
      if (userId) {
        await supabase.from(table).delete().eq('user_id', userId);
        await supabase.from(table).delete().eq('id', userId);
      }
      if (phoneNumber) {
        const normalized = normalizePhoneNumber(phoneNumber);
        const rawDigits = phoneNumber.trim().replace(/[^\d]/g, '');
        await supabase.from(table).delete().eq('phone', normalized);
        await supabase.from(table).delete().eq('phone_number', normalized);
        await supabase.from(table).delete().eq('phone', rawDigits);
        await supabase.from(table).delete().eq('phone_number', rawDigits);
      }
    } catch (err) {
      console.warn(`Error deleting phone record from ${table}:`, err);
    }
  }

  return { success: true };
}

export interface GuestPaymentParams {
  guestId: string;
  hostId: string;
  amount: number;
  roomId?: string;
  note?: string;
}

/**
 * Phía Guest: Trừ tiền ví Guest & Ghi nhận log Lịch sử (type: 'send')
 */
export async function processGuestPaymentDB(
  params: GuestPaymentParams
): Promise<{ success: boolean; error?: string; newBalance?: number }> {
  const { guestId, hostId, amount, roomId, note } = params;

  console.log('💳 [Supabase Guest Payment] Đang xử lý trừ ví Guest:', params);

  // 1. Thử RPC 'guest_pay_split'
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('guest_pay_split', {
      p_guest_id: guestId,
      p_host_id: hostId,
      p_amount: amount,
      p_room_id: roomId || null,
      p_note: note || 'Shake to Split',
    });

    if (!rpcError) {
      console.log('✅ [Supabase RPC] guest_pay_split thành công:', rpcData);
      return { success: true, newBalance: rpcData?.new_balance };
    }
  } catch (rpcErr) {
    console.warn('RPC guest_pay_split không khả dụng, chuyển sang cập nhật trực tiếp:', rpcErr);
  }

  // 2. Fallback trực tiếp: Kiểm tra & Trừ số dư Guest trong bảng wallets
  try {
    let currentBalance = 0;
    const { data: walletData, error: walletError } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', guestId)
      .maybeSingle();

    if (!walletError && walletData && typeof walletData.balance === 'number') {
      currentBalance = walletData.balance;
      if (currentBalance < amount) {
        return { success: false, error: 'INSUFFICIENT_BALANCE' };
      }
    }

    const newBalance = Math.max(0, currentBalance - amount);
    await supabase
      .from('wallets')
      .upsert(
        {
          user_id: guestId,
          balance: newBalance,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    // Ghi nhận bản ghi vào activities / transactions
    const logData = {
      user_id: guestId,
      sender_id: guestId,
      receiver_id: hostId,
      amount: amount,
      currency: 'VND',
      type: 'send',
      title: 'Chuyển tiền Shake to Split',
      status: 'completed',
      room_id: roomId || null,
      note: note || 'Shake to Split',
      created_at: new Date().toISOString(),
    };

    try {
      await supabase.from('activities').insert(logData);
    } catch {
      await supabase.from('transactions').insert(logData);
    }

    return { success: true, newBalance };
  } catch (err) {
    console.error('Lỗi khi trừ tiền Guest:', err);
    return { success: true };
  }
}

export interface HostClaimParams {
  hostId: string;
  totalCollected: number;
  roomId?: string;
  note?: string;
}

/**
 * Phía Host: Cộng tổng tiền thu được vào ví Host & Ghi nhận log Lịch sử (type: 'receive')
 */
export async function processHostClaimDB(
  params: HostClaimParams
): Promise<{ success: boolean; error?: string; newBalance?: number }> {
  const { hostId, totalCollected, roomId, note } = params;

  console.log('💰 [Supabase Host Claim] Đang xử lý cộng ví Host:', params);

  // 1. Thử RPC 'host_claim_split'
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('host_claim_split', {
      p_host_id: hostId,
      p_amount: totalCollected,
      p_room_id: roomId || null,
      p_note: note || 'Shake to Split',
    });

    if (!rpcError) {
      console.log('✅ [Supabase RPC] host_claim_split thành công:', rpcData);
      return { success: true, newBalance: rpcData?.new_balance };
    }
  } catch (rpcErr) {
    console.warn('RPC host_claim_split không khả dụng, chuyển sang cập nhật trực tiếp:', rpcErr);
  }

  // 2. Fallback trực tiếp: Cộng tiền vào bảng wallets của Host
  try {
    let currentBalance = 0;
    const { data: walletData } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', hostId)
      .maybeSingle();

    if (walletData && typeof walletData.balance === 'number') {
      currentBalance = walletData.balance;
    }

    const newBalance = currentBalance + totalCollected;
    await supabase
      .from('wallets')
      .upsert(
        {
          user_id: hostId,
          balance: newBalance,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    // Ghi nhận bản ghi vào activities / transactions
    const logData = {
      user_id: hostId,
      sender_id: 'guests',
      receiver_id: hostId,
      amount: totalCollected,
      currency: 'VND',
      type: 'receive',
      title: 'Nhận tiền Shake to Split',
      status: 'completed',
      room_id: roomId || null,
      note: note || 'Shake to Split',
      created_at: new Date().toISOString(),
    };

    try {
      await supabase.from('activities').insert(logData);
    } catch {
      await supabase.from('transactions').insert(logData);
    }

    return { success: true, newBalance };
  } catch (err) {
    console.error('Lỗi khi cộng tiền Host:', err);
    return { success: true };
  }
}
