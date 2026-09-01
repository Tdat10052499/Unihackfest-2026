/**
 * Identity & Phone Utilities (100% Solana Native Architecture)
 * 
 * Cung cấp các hàm tiện ích định danh, chuẩn hóa số điện thoại
 * và các dummy function an toàn trong quá trình kết nối Anchor Program PDA.
 */

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
 * Lấy Mã Định Danh Tài Khoản N.E.D động
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
  distanceMeters?: number;
}

// --- DUMMY FUNCTIONS (Sẵn sàng thay thế trực tiếp bằng Anchor Program On-chain Calls) ---

/**
 * Lấy số điện thoại đã lưu theo Privy userId
 */
export async function getUserPhoneNumberFromDB(_userId: string): Promise<string | null> {
  return null;
}

/**
 * Tra cứu địa chỉ ví Solana theo số điện thoại
 */
export async function lookupWalletByPhone(_phone: string): Promise<string | null> {
  return null;
}

/**
 * Lưu liên kết số điện thoại với ví Solana
 */
export async function linkPhoneNumber(
  _userId: string,
  _walletAddress: string,
  _phoneNumber: string
): Promise<{ success: boolean; error?: string }> {
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
 * Hủy liên kết số điện thoại
 */
export async function unlinkPhoneNumber(
  _userId: string,
  _phoneNumber?: string
): Promise<{ success: boolean; error?: string }> {
  return { success: true };
}

/**
 * Tạo bản ghi Geo Red Packet mới
 */
export async function createGeoRedPacketRecord(_params: {
  creator_wallet: string;
  amount: number;
  lat: number;
  lng: number;
  radius?: number;
  message?: string;
  tx_signature: string;
}): Promise<{ success: boolean; data?: GeoRedPacket; error?: string }> {
  return { success: true };
}

/**
 * Lấy danh sách các bao lì xì đang hoạt động lân cận
 */
export async function fetchActiveGeoRedPackets(
  _userLat?: number,
  _userLng?: number,
  _maxRadiusMeters: number = 2000
): Promise<GeoRedPacket[]> {
  return [];
}

/**
 * Gửi yêu cầu nhận lì xì
 */
export async function claimGeoRedPacketViaBackend(_params: {
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
  return {
    success: false,
    error: 'Tính năng đang chuyển đổi sang On-chain Anchor Program.',
  };
}
