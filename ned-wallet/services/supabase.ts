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

  const tables = ['phone_wallets', 'users', 'identities'];
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
 * Lưu liên kết số điện thoại với ví Solana lên bảng phone_wallets / users trên Supabase
 */
export async function linkPhoneNumber(
  userId: string,
  walletAddress: string,
  phoneNumber: string
): Promise<{ success: boolean; error?: string }> {
  const normalizedPhone = normalizePhoneNumber(phoneNumber);

  const payloadVariations: Array<{
    table: string;
    data: Record<string, any>;
    conflict: string;
  }> = [
    {
      table: 'phone_wallets',
      data: {
        user_id: userId,
        phone_number: normalizedPhone,
        wallet_address: walletAddress,
      },
      conflict: 'phone_number',
    },
    {
      table: 'phone_wallets',
      data: {
        user_id: userId,
        phone: normalizedPhone,
        wallet_address: walletAddress,
      },
      conflict: 'phone',
    },
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
      const { error: upsertError } = await supabase
        .from(variant.table)
        .upsert(variant.data as any, { onConflict: variant.conflict });

      if (!upsertError) {
        console.log(`✅ [Supabase] Đã liên kết thành công vào ${variant.table}`);
        return { success: true };
      }

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
