import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as crypto from 'crypto';

export interface UserProfile {
  id?: string;
  privy_id?: string;
  wallet_address: string;
  username: string;
  avatar_url?: string | null;
  phone_number?: string | null;
  phone_hash?: string | null;
  linked_external_wallet?: string | null;
  onboarding_status?: string | null;
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
 * Tính mã băm SHA-256 cho chuỗi số điện thoại
 */
export function hashPhoneNumber(phone: string): string {
  try {
    return crypto.createHash('sha256').update(phone.trim()).digest('hex');
  } catch {
    return phone;
  }
}

/**
 * Phân giải thông điệp lỗi vi phạm ràng buộc duy nhất (Unique Constraint)
 */
function parseUniqueConstraintError(error: any): string {
  const msg = (error?.message || '').toLowerCase();
  const details = (error?.details || '').toLowerCase();
  const combined = `${msg} ${details}`;

  if (
    combined.includes('phone') ||
    combined.includes('users_phone_number_key') ||
    combined.includes('users_phone_hash_key') ||
    combined.includes('phone_hash')
  ) {
    return 'Số điện thoại này đã được liên kết với một ví N.E.D khác. Vui lòng sử dụng số khác hoặc đăng nhập.';
  }

  if (combined.includes('username') || combined.includes('users_username_key')) {
    return 'Tên định danh này đã có người sử dụng. Vui lòng chọn tên khác.';
  }

  if (combined.includes('wallet_address') || combined.includes('users_wallet_address_key')) {
    return 'Địa chỉ ví này đã được đăng ký trong hệ thống.';
  }

  return 'Thông tin tài khoản đã tồn tại trong hệ thống. Vui lòng kiểm tra lại.';
}

/**
 * Kiểm tra xem số điện thoại (phone_hash hoặc phone_number) đã tồn tại trên bảng users chưa
 * @param phone Số điện thoại cần kiểm tra
 * @param currentUserId (Tùy chọn) ID của user hiện tại để bỏ qua nếu là chính họ
 * @param currentWalletAddress (Tùy chọn) Địa chỉ ví của user hiện tại
 * @returns true nếu SĐT đã được người khác sử dụng, false nếu chưa
 */
export async function checkPhoneExists(
  phone: string,
  currentUserId?: string,
  currentWalletAddress?: string
): Promise<boolean> {
  if (!phone) return false;
  const cleanPhone = phone.trim();
  const phoneHash = hashPhoneNumber(cleanPhone);

  try {
    const client = getSupabaseClient();

    // 1. Kiểm tra theo phone_hash (ưu tiên vì schema users hiện có phone_hash)
    const { data: hashData, error: hashErr } = await client
      .from('users')
      .select('id, privy_id, wallet_address, username, phone_hash')
      .eq('phone_hash', phoneHash)
      .maybeSingle();

    if (!hashErr && hashData) {
      const isSelf =
        (currentUserId && hashData.privy_id && hashData.privy_id === currentUserId) ||
        (currentWalletAddress && hashData.wallet_address && hashData.wallet_address === currentWalletAddress);

      if (!isSelf) {
        console.warn('⚠️ [checkPhoneExists] Số điện thoại đã tồn tại (phone_hash):', phoneHash);
        return true;
      }
    }

    // 2. Kiểm tra theo phone_number (nếu bảng users có cột phone_number)
    try {
      const { data: phoneData, error: phoneErr } = await client
        .from('users')
        .select('id, privy_id, wallet_address, username, phone_number')
        .eq('phone_number', cleanPhone)
        .maybeSingle();

      if (!phoneErr && phoneData) {
        const isSelf =
          (currentUserId && phoneData.privy_id && phoneData.privy_id === currentUserId) ||
          (currentWalletAddress && phoneData.wallet_address && phoneData.wallet_address === currentWalletAddress);

        if (!isSelf) {
          console.warn('⚠️ [checkPhoneExists] Số điện thoại đã tồn tại (phone_number):', cleanPhone);
          return true;
        }
      }
    } catch {}

    return false;
  } catch (err) {
    console.warn('⚠️ [Supabase] Lỗi khi checkPhoneExists:', err);
    return false;
  }
}

/**
 * Thực hiện UPSERT bản ghi người dùng vào bảng `users`
 * @param params { privy_id, wallet_address, username, phone_number, linked_external_wallet }
 */
export async function upsertUserProfile(params: {
  privy_id?: string;
  wallet_address: string;
  username: string;
  phone_number?: string | null;
  linked_external_wallet?: string | null;
}): Promise<{ success: boolean; data?: UserProfile; error?: string }> {
  const { privy_id, wallet_address, username, phone_number, linked_external_wallet } = params;

  if (!username || !wallet_address) {
    return {
      success: false,
      error: 'Thiếu thông tin bắt buộc (wallet_address hoặc username).',
    };
  }

  const cleanUsername = username.trim().toLowerCase();
  const cleanPhone = phone_number ? phone_number.trim() : null;
  const phoneHash = cleanPhone ? hashPhoneNumber(cleanPhone) : null;
  const cleanExternalWallet = linked_external_wallet ? linked_external_wallet.trim() : null;

  try {
    console.log('💾 [Supabase] Bắt đầu UPSERT user profile:', {
      privy_id,
      wallet_address,
      username: cleanUsername,
      phone_number: cleanPhone,
      phone_hash: phoneHash,
      linked_external_wallet: cleanExternalWallet,
    });

    const client = getSupabaseClient();

    // 1. Kiểm tra xem username này đã có ai khác sở hữu chưa
    try {
      const { data: existingUser, error: checkError } = await client
        .from('users')
        .select('*')
        .eq('username', cleanUsername)
        .maybeSingle();

      if (!checkError && existingUser) {
        const isSameUser =
          (privy_id && existingUser.privy_id && existingUser.privy_id === privy_id) ||
          (existingUser.wallet_address && existingUser.wallet_address === wallet_address);

        if (!isSameUser) {
          console.warn('⚠️ [Supabase] Username đã được tài khoản khác đăng ký:', cleanUsername);
          return {
            success: false,
            error: 'Tên định danh này đã có người sử dụng. Vui lòng chọn tên khác.',
          };
        }
      }
    } catch (checkEx) {
      console.warn('⚠️ [Supabase] Warning checking existing username:', checkEx);
    }

    // 2. Pre-check trùng lặp số điện thoại (phone_hash)
    if (cleanPhone) {
      const phoneTaken = await checkPhoneExists(cleanPhone, privy_id, wallet_address);
      if (phoneTaken) {
        console.warn('⚠️ [Supabase] Số điện thoại đã được tài khoản khác đăng ký:', cleanPhone);
        return {
          success: false,
          error: 'Số điện thoại này đã được liên kết với một ví N.E.D khác. Vui lòng sử dụng số khác hoặc đăng nhập.',
        };
      }
    }

    // 3. Chuẩn bị payload tương thích cả bảng users có phone_hash, phone_number, linked_external_wallet
    const basePayload: any = {
      wallet_address,
      username: cleanUsername,
      onboarding_status: 'minted',
    };
    if (privy_id) {
      basePayload.privy_id = privy_id;
    }
    if (phoneHash) {
      basePayload.phone_hash = phoneHash;
    }

    // Payload đầy đủ truyền cả phone_number và linked_external_wallet nếu DB hỗ trợ
    const fullPayload: any = {
      ...basePayload,
    };
    if (cleanPhone) {
      fullPayload.phone_number = cleanPhone;
    }
    if (cleanExternalWallet) {
      fullPayload.linked_external_wallet = cleanExternalWallet;
    }

    // Helper thực hiện upsert với cơ chế tự động fallback khi schema chưa có cột phone_number
    const performUpsert = async (payload: any, onConflict: string) => {
      let res = await client
        .from('users')
        .upsert(payload, { onConflict })
        .select()
        .maybeSingle();

      // Nếu bảng users chưa có cột phone_number (lỗi schema cache PGRST204)
      if (
        res.error &&
        (res.error.message?.includes('phone_number') ||
          res.error.message?.includes('schema cache'))
      ) {
        console.log('ℹ️ [Supabase] Bảng users lưu phone_hash, đang fallback lưu base payload...');
        res = await client
          .from('users')
          .upsert(basePayload, { onConflict })
          .select()
          .maybeSingle();
      }

      return res;
    };

    // Ưu tiên onConflict theo privy_id nếu có, fallback wallet_address
    const onConflictField = privy_id ? 'privy_id' : 'wallet_address';
    let { data, error } = await performUpsert(fullPayload, onConflictField);

    if (error) {
      if (
        error.code === '23505' ||
        error.message?.includes('duplicate key') ||
        error.message?.includes('unique constraint')
      ) {
        return {
          success: false,
          error: parseUniqueConstraintError(error),
        };
      }

      // Nếu onConflict theo privy_id gặp lỗi schema, fallback onConflict theo wallet_address
      if (onConflictField === 'privy_id') {
        console.log('ℹ️ [Supabase] Thử lại upsert onConflict: wallet_address...');
        const retryRes = await performUpsert(fullPayload, 'wallet_address');

        if (!retryRes.error) {
          console.log('✅ [Supabase] UPSERT thành công (fallback wallet_address):', retryRes.data || cleanUsername);
          return { success: true, data: retryRes.data as UserProfile };
        }

        if (
          retryRes.error.code === '23505' ||
          retryRes.error.message?.includes('duplicate key') ||
          retryRes.error.message?.includes('unique constraint')
        ) {
          return {
            success: false,
            error: parseUniqueConstraintError(retryRes.error),
          };
        }

        throw retryRes.error;
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

/**
 * Upload ảnh đại diện lên Supabase Storage bucket 'avatars'
 * @param params { userId, base64, mimeType }
 */
export async function uploadUserAvatarFile(params: {
  userId: string;
  base64: string;
  mimeType?: string;
}): Promise<{ success: boolean; avatarUrl?: string; error?: string }> {
  const { userId, base64, mimeType = 'image/jpeg' } = params;

  if (!userId || !base64) {
    return { success: false, error: 'Thiếu userId hoặc dữ liệu ảnh base64.' };
  }

  try {
    const client = getSupabaseClient();
    const cleanId = userId.replace(/[^a-zA-Z0-9]/g, '_');
    const extension = mimeType.includes('png') ? 'png' : 'jpg';
    const filePath = `${cleanId}_${Date.now()}.${extension}`;

    // Chuyển đổi chuỗi base64 sang Buffer
    const fileBuffer = Buffer.from(base64, 'base64');

    console.log('📤 [Supabase Storage] Đang upload avatar lên bucket "avatars":', filePath);
    const { data: uploadData, error: uploadError } = await client.storage
      .from('avatars')
      .upload(filePath, fileBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.warn('⚠️ [Supabase Storage] Lỗi upload bucket avatars:', uploadError.message);
      console.log('🔄 [Supabase Fallback] Đang tự động lưu avatar dạng Data URI vào cơ sở dữ liệu...');

      const dataUri = `data:${mimeType};base64,${base64}`;
      const dbRes = await updateUserAvatarInDB(userId, dataUri);
      if (dbRes.success) {
        return { success: true, avatarUrl: dataUri };
      }

      return {
        success: false,
        error: `Lỗi Storage (${uploadError.message}). Vui lòng tạo bucket "avatars" (Public) trên Supabase Dashboard hoặc thử lại.`,
      };
    }

    // Lấy Public URL của ảnh vừa upload
    const { data: urlData } = client.storage.from('avatars').getPublicUrl(filePath);
    const publicUrl = urlData?.publicUrl;

    if (!publicUrl) {
      const dataUri = `data:${mimeType};base64,${base64}`;
      await updateUserAvatarInDB(userId, dataUri);
      return { success: true, avatarUrl: dataUri };
    }

    console.log('✅ [Supabase Storage] Upload thành công, Public URL:', publicUrl);

    // Cập nhật URL vào bảng users
    const dbRes = await updateUserAvatarInDB(userId, publicUrl);
    if (!dbRes.success) {
      console.warn('⚠️ [Supabase] Cảnh báo cập nhật DB:', dbRes.error);
    }

    return { success: true, avatarUrl: publicUrl };
  } catch (err: any) {
    console.error('❌ [Supabase Storage] Exception khi upload avatar:', err);
    // Cố gắng lưu Data URI nếu exception xảy ra
    try {
      const dataUri = `data:${mimeType};base64,${base64}`;
      await updateUserAvatarInDB(userId, dataUri);
      return { success: true, avatarUrl: dataUri };
    } catch {}
    return { success: false, error: err?.message || 'Lỗi tải ảnh lên Supabase.' };
  }
}

/**
 * Cập nhật avatar_url vào bảng `users`
 */
export async function updateUserAvatarInDB(
  userId: string,
  avatarUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getSupabaseClient();
    console.log('💾 [Supabase] Cập nhật avatar_url vào bảng users:', { userId, avatarLength: avatarUrl.length });

    // 1. Cập nhật theo privy_id
    let { data, error } = await client
      .from('users')
      .update({ avatar_url: avatarUrl })
      .eq('privy_id', userId)
      .select('id, username, avatar_url');

    // 2. Nếu không tìm thấy hoặc có lỗi, thử update theo wallet_address
    if (error || !data || data.length === 0) {
      const { data: walletData, error: walletError } = await client
        .from('users')
        .update({ avatar_url: avatarUrl })
        .eq('wallet_address', userId)
        .select('id, username, avatar_url');

      if (!walletError && walletData && walletData.length > 0) {
        console.log('✅ [updateUserAvatarInDB] Đã cập nhật avatar_url theo wallet_address');
        return { success: true };
      }

      // 3. Thử update theo username nếu userId là username
      const { data: unameData, error: unameError } = await client
        .from('users')
        .update({ avatar_url: avatarUrl })
        .eq('username', userId.toLowerCase().trim())
        .select('id, username, avatar_url');

      if (!unameError && unameData && unameData.length > 0) {
        console.log('✅ [updateUserAvatarInDB] Đã cập nhật avatar_url theo username');
        return { success: true };
      }

      if (error) {
        console.warn('⚠️ [updateUserAvatarInDB] Cảnh báo update avatar_url:', error.message);
      }
    } else {
      console.log('✅ [updateUserAvatarInDB] Đã cập nhật avatar_url theo privy_id');
    }

    return { success: true };
  } catch (err: any) {
    console.error('❌ [updateUserAvatarInDB] Lỗi:', err);
    return { success: false, error: err?.message };
  }
}

export interface UserSearchResult {
  id?: string;
  username: string;
  wallet_address: string;
  phone_number?: string | null;
  phone_hash?: string | null;
  avatar_url?: string | null;
  privy_id?: string | null;
}

/**
 * Tìm kiếm người dùng nhanh qua Supabase (Off-chain Autocomplete Search)
 * Hỗ trợ tìm kiếm theo @username, username, số điện thoại hoặc địa chỉ ví
 */
export async function searchUsersOffchain(query: string): Promise<UserSearchResult[]> {
  if (!query || !query.trim()) return [];

  let clean = query.trim().toLowerCase().replace(/\s+/g, '');
  if (clean.startsWith('@')) {
    clean = clean.slice(1);
  }
  if (clean.endsWith('.sol')) {
    clean = clean.slice(0, -4);
  }

  if (!clean) return [];

  // Nếu chuỗi query bắt đầu bằng số (0... hoặc 84...), format về +84
  let phoneQuery = clean;
  if (phoneQuery.startsWith('0')) {
    phoneQuery = '+84' + phoneQuery.slice(1);
  } else if (phoneQuery.startsWith('84') && !phoneQuery.startsWith('+')) {
    phoneQuery = '+' + phoneQuery;
  }

  const phoneHash = hashPhoneNumber(phoneQuery);
  const cleanPhoneHash = hashPhoneNumber(clean);
  const isDigits = /^[0-9+]+$/.test(clean);

  try {
    const client = getSupabaseClient();
    console.log('🔍 [Supabase Search] Đang tìm kiếm user với query:', { clean, phoneQuery });

    // 1. Tìm kiếm theo username, phone_number hoặc wallet_address
    let data: any = null;
    let error: any = null;

    const initialRes = await client
      .from('users')
      .select('id, username, wallet_address, phone_number, avatar_url, privy_id, phone_hash')
      .or(`username.ilike.%${clean}%,phone_number.ilike.%${phoneQuery}%,phone_number.ilike.%${clean}%,wallet_address.ilike.%${clean}%`)
      .limit(5);

    data = initialRes.data;
    error = initialRes.error;

    // 2. Fallback nếu schema cache chưa nhận diện cột phone_number
    if (error && (error.message?.includes('phone_number') || error.message?.includes('schema cache'))) {
      const orConditions = [`username.ilike.%${clean}%`, `wallet_address.ilike.%${clean}%`];
      if (isDigits) {
        orConditions.push(`phone_hash.eq.${phoneHash}`);
        orConditions.push(`phone_hash.eq.${cleanPhoneHash}`);
      }

      const fallbackRes = await client
        .from('users')
        .select('id, username, wallet_address, avatar_url, privy_id, phone_hash')
        .or(orConditions.join(','))
        .limit(5);
      data = fallbackRes.data;
      error = fallbackRes.error;
    }

    if (error) {
      console.warn('⚠️ [Supabase Search] Lỗi query:', error.message);
      return [];
    }

    return (data || []) as UserSearchResult[];
  } catch (err) {
    console.error('❌ [Supabase Search] Exception:', err);
    return [];
  }
}

