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
 * So sánh xem 2 chuỗi số điện thoại có phải là một hay không (bỏ qua định dạng +84 / 0 / dấu cách)
 */
export function isSamePhoneNumber(phone1?: string | null, phone2?: string | null): boolean {
  if (!phone1 || !phone2) return false;
  const p1 = phone1.trim();
  const p2 = phone2.trim();
  if (!p1 || !p2) return false;
  if (p1 === p2) return true;

  const v1 = getPhoneVariants(p1);
  const v2 = getPhoneVariants(p2);
  return v1.some((variant) => v2.includes(variant));
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
 * Định dạng số điện thoại ẩn các ký tự ở giữa (VD: 0912 ••• 678)
 */
export function getMaskedPhone(phone?: string | null): string {
  if (!phone) return '';
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.length < 8) return cleaned;
  const start = cleaned.slice(0, 4);
  const end = cleaned.slice(-3);
  return `${start} ••• ${end}`;
}

/**
 * Lấy Mã Định Danh Tài Khoản N.E.D động (Không hardcode chuỗi tĩnh)
 * Được sinh tự động từ SĐT liên kết hoặc định danh người dùng
 */
export function getAccountIdentifier(user?: any, phone?: string | null): string {
  if (phone) {
    const digits = phone.replace(/[^\d]/g, '');
    const last4 = digits.slice(-4) || '8888';
    return `NED-${last4}`;
  }
  if (user?.id) {
    const cleanId = user.id.replace(/[^\w]/g, '');
    const last4 = cleanId.slice(-4).toUpperCase() || 'USER';
    return `NED-${last4}`;
  }
  return 'NED-ACC';
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

/**
 * Tính khoảng cách giữa hai tọa độ GPS theo công thức Haversine (đơn vị: mét)
 */
export function calculateDistanceInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Bán kính Trái Đất theo mét
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // mét
}

export interface GeoRedPacket {
  id: string;
  creator_wallet: string;
  amount: number;
  lat: number;
  lng: number;
  radius: number; // mét
  message?: string;
  status: 'active' | 'claimed' | 'expired';
  tx_signature?: string;
  claimed_by?: string;
  claimed_at?: string;
  created_at: string;
  distanceMeters?: number; // Được tính toán động dựa vào GPS người dùng
}

/**
 * Tạo bản ghi Geo Red Packet mới trên Supabase sau khi chuyển tiền On-chain thành công
 */
export async function createGeoRedPacketRecord(params: {
  creator_wallet: string;
  amount: number;
  lat: number;
  lng: number;
  radius?: number;
  message?: string;
  tx_signature: string;
}): Promise<{ success: boolean; data?: GeoRedPacket; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('geo_red_packets')
      .insert({
        creator_wallet: params.creator_wallet,
        amount: params.amount,
        lat: params.lat,
        lng: params.lng,
        radius: params.radius || 50,
        message: params.message || 'Chúc bạn nhận được thật nhiều may mắn! 🧧',
        status: 'active',
        tx_signature: params.tx_signature,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ [Supabase] Lỗi khi tạo Geo Red Packet:', error);
      return { success: false, error: error.message };
    }

    console.log('🧧 [Supabase] Tạo thành công Geo Red Packet:', data?.id);
    return { success: true, data };
  } catch (err: any) {
    console.error('❌ [Supabase] Ngoại lệ khi tạo Geo Red Packet:', err);
    return { success: false, error: err?.message || 'Lỗi kết nối Supabase.' };
  }
}

/**
 * Lấy danh sách các bao lì xì đang hoạt động lân cận
 */
export async function fetchActiveGeoRedPackets(
  userLat?: number,
  userLng?: number,
  maxRadiusMeters: number = 2000
): Promise<GeoRedPacket[]> {
  try {
    const { data, error } = await supabase
      .from('geo_red_packets')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error || !data) {
      console.error('❌ [Supabase] Lỗi khi lấy danh sách Geo Red Packets:', error);
      return [];
    }

    if (userLat !== undefined && userLng !== undefined) {
      const withDistance = data.map((item: any) => {
        const dist = calculateDistanceInMeters(userLat, userLng, item.lat, item.lng);
        return {
          ...item,
          distanceMeters: Math.round(dist),
        };
      });

      return withDistance.filter((item) => item.distanceMeters <= maxRadiusMeters);
    }

    return data;
  } catch (err) {
    console.error('❌ [Supabase] Ngoại lệ khi lấy danh sách Geo Red Packets:', err);
    return [];
  }
}

/**
 * Gửi yêu cầu nhận lì xì lên Supabase Edge Function (Backend Signer bảo mật)
 */
export async function claimGeoRedPacketViaBackend(params: {
  packet_id: string;
  user_wallet: string;
  user_lat: number;
  user_lng: number;
}): Promise<{
  success: boolean;
  amount?: number;
  message?: string;
  creator_wallet?: string;
  txSignature?: string;
  error?: string;
}> {
  const { packet_id, user_wallet, user_lat, user_lng } = params;
  try {
    const { data, error } = await supabase.functions.invoke('claim-redpacket', {
      body: {
        packet_id,
        user_wallet,
        user_lat,
        user_lng,
      },
    });

    if (error) {
      console.error('❌ [Edge Function claim-redpacket] Error:', error);
      return {
        success: false,
        error: error.message || 'Lỗi khi gọi Backend Signer.',
      };
    }

    if (data && data.success === false) {
      return {
        success: false,
        error: data.error || 'Không thể nhận bao lì xì này.',
      };
    }

    return data;
  } catch (err: any) {
    console.error('❌ [claimGeoRedPacketViaBackend] Exception:', err);
    return {
      success: false,
      error: err?.message || 'Lỗi kết nối máy chủ.',
    };
  }
}
