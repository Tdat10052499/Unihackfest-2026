import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export interface UserProfile {
  id?: string;
  privy_id?: string;
  wallet_address: string;
  username: string;
  created_at?: string;
  updated_at?: string;
}

export function getCleanSupabaseUrl(): string {
  const raw = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  const match = raw.match(/https?:\/\/[a-z0-9-]+\.supabase\.co/i);
  if (match) {
    return match[0];
  }
  const stripped = raw.replace(/[\[\]"']/g, '').trim();
  if (stripped.startsWith('http://') || stripped.startsWith('https://')) {
    return stripped;
  }
  return 'https://kiimorvycduftumyatla.supabase.co';
}

export function getCleanSupabaseAnonKey(): string {
  const raw = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
  const cleaned = raw.replace(/[\[\]"']/g, '').trim();
  if (cleaned.length > 20) {
    return cleaned;
  }
  return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpaW1vcnZ5Y2R1ZnR1bXlhdGxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MTI2NTcsImV4cCI6MjEwNDE4ODY1N30.jIz8JwVul-swGRH5kFc0XTbKuywS2RBxk6Ww9o0BecE';
}

export const SUPABASE_URL = getCleanSupabaseUrl();
export const SUPABASE_ANON_KEY = getCleanSupabaseAnonKey();

// Adapter AsyncStorage cho Supabase Auth
const isBrowserOrNative = Platform.OS !== 'web' || typeof window !== 'undefined';
const safeStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (!isBrowserOrNative) return null;
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (!isBrowserOrNative) return;
    try {
      await AsyncStorage.setItem(key, value);
    } catch {}
  },
  removeItem: async (key: string): Promise<void> => {
    if (!isBrowserOrNative) return;
    try {
      await AsyncStorage.removeItem(key);
    } catch {}
  },
};

// Singleton Client Instance
let supabaseClientInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  const currentUrl = getCleanSupabaseUrl();
  const currentKey = getCleanSupabaseAnonKey();

  if (
    !supabaseClientInstance ||
    (supabaseClientInstance as any)?.supabaseUrl !== currentUrl
  ) {
    console.log('📡 [Supabase] Khởi tạo Supabase Client với URL:', currentUrl);
    supabaseClientInstance = createClient(currentUrl, currentKey, {
      auth: {
        storage: safeStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }

  return supabaseClientInstance;
}

export const supabase: SupabaseClient = getSupabaseClient();

/**
 * Thực hiện UPSERT bản ghi người dùng vào bảng `users`
 * @param params { privy_id, wallet_address, username }
 */
export async function upsertUserProfile(params: {
  privy_id?: string;
  wallet_address: string;
  username: string;
}): Promise<{ success: boolean; data?: UserProfile; error?: string }> {
  const { privy_id, wallet_address, username } = params;

  if (!username || !wallet_address) {
    return {
      success: false,
      error: 'Thiếu thông tin bắt buộc (wallet_address hoặc username).',
    };
  }

  const cleanUsername = username.trim().toLowerCase();

  try {
    console.log('💾 [Supabase] Bắt đầu UPSERT user profile:', {
      privy_id,
      wallet_address,
      username: cleanUsername,
    });

    const client = getSupabaseClient();

    // 1. Thử upsert với payload đầy đủ
    const fullPayload: any = {
      wallet_address,
      username: cleanUsername,
    };
    if (privy_id) {
      fullPayload.privy_id = privy_id;
    }

    const { data, error } = await client
      .from('users')
      .upsert(fullPayload, { onConflict: 'wallet_address' })
      .select()
      .maybeSingle();

    if (error) {
      // Nếu bảng chưa có column privy_id, fallback chỉ dùng wallet_address & username
      if (error.message?.includes('privy_id')) {
        console.log('ℹ️ [Supabase] Schema chưa có privy_id, thử lại với wallet_address & username...');
        const { data: retryData, error: retryError } = await client
          .from('users')
          .upsert(
            {
              wallet_address,
              username: cleanUsername,
            },
            { onConflict: 'wallet_address' }
          )
          .select()
          .maybeSingle();

        if (retryError) {
          throw retryError;
        }

        console.log('✅ [Supabase] UPSERT thành công (fallback):', retryData || cleanUsername);
        return { success: true, data: retryData as UserProfile };
      }

      throw error;
    }

    console.log('✅ [Supabase] UPSERT thành công:', data || cleanUsername);
    return { success: true, data: data as UserProfile };
  } catch (err: any) {
    console.error('❌ [Supabase] Lỗi khi upsertUserProfile:', err?.message || err);
    return {
      success: false,
      error: err?.message || 'Không thể lưu thông tin vào cơ sở dữ liệu Supabase.',
    };
  }
}

/**
 * Lấy thông tin người dùng từ bảng `users` theo identifier (wallet_address / privy_id / username)
 */
export async function getUserProfileFromDB(identifier: string): Promise<UserProfile | null> {
  if (!identifier) return null;

  try {
    const client = getSupabaseClient();

    // 1. Tra cứu theo wallet_address
    const { data: walletData, error: walletErr } = await client
      .from('users')
      .select('*')
      .eq('wallet_address', identifier)
      .maybeSingle();

    if (!walletErr && walletData) {
      return walletData as UserProfile;
    }

    // 2. Tra cứu theo privy_id (nếu column tồn tại)
    try {
      const { data: privyData, error: privyErr } = await client
        .from('users')
        .select('*')
        .eq('privy_id', identifier)
        .maybeSingle();

      if (!privyErr && privyData) {
        return privyData as UserProfile;
      }
    } catch {}

    // 3. Tra cứu theo username
    const cleanUsername = identifier.trim().toLowerCase();
    const { data: unameData, error: unameErr } = await client
      .from('users')
      .select('*')
      .eq('username', cleanUsername)
      .maybeSingle();

    if (!unameErr && unameData) {
      return unameData as UserProfile;
    }

    return null;
  } catch (err) {
    console.warn('⚠️ [Supabase] Lỗi getUserProfileFromDB:', err);
    return null;
  }
}

/**
 * Tra cứu thông tin người dùng theo `username`
 */
export async function getUserProfileByUsername(username: string): Promise<UserProfile | null> {
  if (!username) return null;
  const clean = username.trim().toLowerCase();

  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('users')
      .select('*')
      .eq('username', clean)
      .maybeSingle();

    if (!error && data) {
      return data as UserProfile;
    }

    return null;
  } catch (err) {
    console.warn('⚠️ [Supabase] Lỗi tra cứu username:', err);
    return null;
  }
}

/**
 * Tra cứu thông tin người dùng theo `wallet_address`
 */
export async function getUserProfileByWallet(walletAddress: string): Promise<UserProfile | null> {
  if (!walletAddress) return null;

  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress)
      .maybeSingle();

    if (!error && data) {
      return data as UserProfile;
    }

    return null;
  } catch (err) {
    console.warn('⚠️ [Supabase] Lỗi tra cứu ví:', err);
    return null;
  }
}
