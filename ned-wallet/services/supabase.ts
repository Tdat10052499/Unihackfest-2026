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
 * Chuẩn hóa số điện thoại về định dạng tiêu chuẩn (E.164 +84...)
 */
export function normalizePhoneNumber(phone: string): string {
  let cleaned = phone.trim().replace(/[^\d+]/g, '');
  if (cleaned.startsWith('0') && cleaned.length >= 9) {
    cleaned = '+84' + cleaned.slice(1);
  } else if (!cleaned.startsWith('+') && cleaned.startsWith('84') && cleaned.length >= 10) {
    cleaned = '+' + cleaned;
  } else if (!cleaned.startsWith('+') && cleaned.length >= 9) {
    cleaned = '+84' + cleaned;
  }
  return cleaned;
}

/**
 * Tạo danh sách các biến thể số điện thoại để tra cứu không bỏ sót (+84..., 0..., 84...)
 */
export function getPhoneVariants(phone: string): string[] {
  const cleaned = phone.trim().replace(/[^\d+]/g, '');
  const digits = phone.trim().replace(/[^\d]/g, '');
  const normalized = normalizePhoneNumber(phone);

  let local0 = '';
  if (normalized.startsWith('+84')) {
    local0 = '0' + normalized.slice(3);
  } else if (digits.startsWith('84')) {
    local0 = '0' + digits.slice(2);
  }

  const variants = new Set([cleaned, digits, normalized]);
  if (local0) variants.add(local0);
  return Array.from(variants).filter(Boolean);
}

/**
 * Lấy số điện thoại đã lưu từ Supabase (Source of Truth) theo Privy userId
 */
export async function getUserPhoneNumberFromDB(userId: string): Promise<string | null> {
  if (!userId) return null;
  try {
    const { data, error } = await supabase
      .from('phone_wallets')
      .select('phone_number')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (!error && data?.phone_number) {
      console.log(`📱 [Supabase] Tìm thấy SĐT của user ${userId}:`, data.phone_number);
      return data.phone_number;
    }
  } catch (err) {
    console.error('Error fetching user phone from Supabase:', err);
  }
  return null;
}

/**
 * Tra cứu địa chỉ ví Solana theo số điện thoại từ Supabase Identity Service
 */
export async function lookupWalletByPhone(phone: string): Promise<string | null> {
  const variants = getPhoneVariants(phone);
  if (variants.length === 0) return null;

  try {
    const { data, error } = await supabase
      .from('phone_wallets')
      .select('wallet_address')
      .in('phone_number', variants)
      .limit(1)
      .maybeSingle();

    if (!error && data?.wallet_address) {
      console.log(`🔍 [Supabase] Tìm thấy ví cho SĐT (${phone}):`, data.wallet_address);
      return data.wallet_address;
    }
  } catch (err) {
    console.error('Error looking up wallet by phone:', err);
  }

  return null;
}

/**
 * Lưu liên kết số điện thoại với ví Solana lên bảng phone_wallets trên Supabase (UPSERT)
 */
export async function linkPhoneNumber(
  userId: string,
  walletAddress: string,
  phoneNumber: string
): Promise<{ success: boolean; error?: string }> {
  if (!userId) {
    return { success: false, error: 'Không tìm thấy định danh người dùng.' };
  }
  if (!walletAddress) {
    return { success: false, error: 'Không tìm thấy địa chỉ ví Solana.' };
  }

  const normalizedPhone = normalizePhoneNumber(phoneNumber);
  const variants = getPhoneVariants(phoneNumber);

  try {
    // 1. Kiểm tra xem SĐT này đã được người dùng khác liên kết chưa
    const { data: existingUser, error: checkError } = await supabase
      .from('phone_wallets')
      .select('user_id, phone_number')
      .in('phone_number', variants)
      .neq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (!checkError && existingUser) {
      return {
        success: false,
        error: 'Số điện thoại này đã được liên kết với một tài khoản khác!',
      };
    }

    // 2. Thực hiện UPSERT dựa trên user_id
    const { error: upsertError } = await supabase
      .from('phone_wallets')
      .upsert(
        {
          user_id: userId,
          phone_number: normalizedPhone,
          wallet_address: walletAddress,
        },
        { onConflict: 'user_id' }
      );

    if (upsertError) {
      console.error('❌ [Supabase] Lỗi khi upsert phone_wallets:', upsertError);
      return {
        success: false,
        error: upsertError.message || 'Không thể lưu số điện thoại vào cơ sở dữ liệu.',
      };
    }

    console.log(`✅ [Supabase] Đã liên kết thành công SĐT ${normalizedPhone} cho user ${userId}`);
    return { success: true };
  } catch (err: any) {
    console.error('❌ [Supabase] Ngoại lệ khi liên kết số điện thoại:', err);
    return {
      success: false,
      error: err?.message || 'Lỗi kết nối cơ sở dữ liệu Supabase.',
    };
  }
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
  try {
    let query = supabase.from('phone_wallets').delete();
    if (userId) {
      query = query.eq('user_id', userId);
    } else if (phoneNumber) {
      const variants = getPhoneVariants(phoneNumber);
      query = query.in('phone_number', variants);
    }

    const { error } = await query;
    if (error) {
      console.error('❌ [Supabase] Lỗi khi hủy liên kết phone_wallets:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ [Supabase] Đã xóa liên kết SĐT của user ${userId}`);
    return { success: true };
  } catch (err: any) {
    console.error('❌ [Supabase] Ngoại lệ khi hủy liên kết:', err);
    return { success: false, error: err?.message || 'Lỗi khi hủy liên kết.' };
  }
}
