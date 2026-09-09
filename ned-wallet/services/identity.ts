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

import { PublicKey, Connection } from '@solana/web3.js';
import { Buffer } from 'buffer';
import * as crypto from 'crypto';

const IDENTITY_DEVNET_RPC =
  process.env.EXPO_PUBLIC_HELIUS_DEVNET_URL ||
  process.env.EXPO_PUBLIC_SOLANA_RPC ||
  process.env.EXPO_PUBLIC_SOLANA_DEVNET_RPC ||
  'https://api.devnet.solana.com';

export const identitySolanaConnection = new Connection(IDENTITY_DEVNET_RPC, 'confirmed');

export const NED_IDENTITY_PROGRAM_ID = new PublicKey(
  process.env.EXPO_PUBLIC_ANCHOR_PROGRAM_ID || '8tTSP75q3ggaxQiZdeC4LShcyjHN5yWJY4NnZeE3JaEi'
);

export interface NormalizedIdentity {
  type: 'wallet' | 'phone' | 'username';
  raw: string;
  normalized: string;
}

/**
 * 1. Chuẩn hóa chuỗi đầu vào (Username / Số điện thoại / Địa chỉ ví)
 */
export function normalizeIdentityInput(input: string): NormalizedIdentity {
  const trimmed = (input || '').trim();
  if (!trimmed) {
    return { type: 'username', raw: '', normalized: '' };
  }

  // A. Kiểm tra địa chỉ ví Solana Base58 trực tiếp (32-44 ký tự Base58)
  const isSolanaBase58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed);
  if (isSolanaBase58 && trimmed.length >= 32 && !trimmed.includes('@') && !trimmed.includes('.')) {
    try {
      new PublicKey(trimmed);
      return { type: 'wallet', raw: trimmed, normalized: trimmed };
    } catch {}
  }

  // B. Kiểm tra Số điện thoại
  const digitsOnly = trimmed.replace(/[^\d]/g, '');
  const hasPhonePrefix = trimmed.startsWith('+') || trimmed.startsWith('0') || trimmed.startsWith('84');
  const isPhoneLike =
    hasPhonePrefix &&
    digitsOnly.length >= 9 &&
    digitsOnly.length <= 13 &&
    !trimmed.includes('@') &&
    !trimmed.toLowerCase().includes('.sol');

  if (isPhoneLike) {
    let normalizedPhone = trimmed.replace(/[\s\-().]/g, '');
    if (normalizedPhone.startsWith('0')) {
      normalizedPhone = '+84' + normalizedPhone.slice(1);
    } else if (normalizedPhone.startsWith('84') && !normalizedPhone.startsWith('+')) {
      normalizedPhone = '+' + normalizedPhone;
    } else if (!normalizedPhone.startsWith('+')) {
      normalizedPhone = '+84' + normalizedPhone;
    }
    return { type: 'phone', raw: trimmed, normalized: normalizedPhone };
  }

  // C. Username: Loại bỏ @ ở đầu, loại bỏ .sol ở cuối, chuyển thành chữ thường và bỏ khoảng trắng
  let cleanUsername = trimmed
    .toLowerCase()
    .replace(/\s+/g, '');

  if (cleanUsername.startsWith('@')) {
    cleanUsername = cleanUsername.slice(1);
  }
  if (cleanUsername.endsWith('.sol')) {
    cleanUsername = cleanUsername.slice(0, -4);
  }

  return { type: 'username', raw: trimmed, normalized: cleanUsername };
}

/**
 * 2. Tìm Program Derived Address (PDA) trên mạng Solana
 */
export function findIdentityPDA(
  normalizedString: string,
  programId: PublicKey = NED_IDENTITY_PROGRAM_ID
): [PublicKey, number] {
  const hashed = crypto.createHash('sha256').update(normalizedString).digest();
  return PublicKey.findProgramAddressSync(
    [Buffer.from('identity'), hashed],
    programId
  );
}

/**
 * 3. Phân giải On-chain (Đọc dữ liệu ví đích từ PDA)
 */
export async function resolveIdentityOnchain(
  input: string,
  connection: Connection = identitySolanaConnection,
  programId: PublicKey = NED_IDENTITY_PROGRAM_ID
): Promise<{
  success: boolean;
  walletAddress?: string;
  normalized?: string;
  type?: 'wallet' | 'phone' | 'username';
  pdaAddress?: string;
  error?: string;
}> {
  if (!input || !input.trim()) {
    return { success: false, error: 'Vui lòng nhập định danh người nhận.' };
  }

  const parsed = normalizeIdentityInput(input);
  if (!parsed.normalized) {
    return { success: false, error: 'Định danh không hợp lệ.' };
  }

  // Nếu là địa chỉ ví trực tiếp
  if (parsed.type === 'wallet') {
    return {
      success: true,
      walletAddress: parsed.normalized,
      normalized: parsed.normalized,
      type: 'wallet',
    };
  }

  try {
    console.log(`🔍 [resolveIdentityOnchain] Tra cứu on-chain cho ${parsed.type}: "${parsed.normalized}"`);
    const [pda] = findIdentityPDA(parsed.normalized, programId);
    console.log(`📍 [resolveIdentityOnchain] PDA Address: ${pda.toBase58()}`);

    const accountInfo = await connection.getAccountInfo(pda);
    if (!accountInfo || !accountInfo.data || accountInfo.data.length < 40) {
      console.warn(`⚠️ [resolveIdentityOnchain] Không tìm thấy PDA trên chuỗi cho ${parsed.normalized}`);
      return {
        success: false,
        pdaAddress: pda.toBase58(),
        normalized: parsed.normalized,
        type: parsed.type,
        error: 'Không tìm thấy người dùng định danh này',
      };
    }

    // Cắt 32 bytes từ offset 8 đến 40 để lấy PublicKey người sở hữu ví
    const ownerPubkey = new PublicKey(accountInfo.data.slice(8, 40));
    const walletAddress = ownerPubkey.toBase58();

    console.log(`✅ [resolveIdentityOnchain] Tìm thấy ví đích thành công: ${walletAddress}`);
    return {
      success: true,
      walletAddress,
      normalized: parsed.normalized,
      type: parsed.type,
      pdaAddress: pda.toBase58(),
    };
  } catch (err: any) {
    console.error('❌ [resolveIdentityOnchain] Lỗi truy vấn RPC on-chain:', err);
    return {
      success: false,
      error: err?.message || 'Lỗi truy vấn mạng Solana. Vui lòng thử lại.',
    };
  }
}

/**
 * Tra cứu địa chỉ ví Solana theo số điện thoại hoặc Username (100% On-chain PDA)
 */
export async function lookupWalletByPhone(phoneOrUsername: string): Promise<string | null> {
  const res = await resolveIdentityOnchain(phoneOrUsername);
  return res.success && res.walletAddress ? res.walletAddress : null;
}

/**
 * Lấy số điện thoại đã lưu theo Privy userId (fallback helper)
 */
export async function getUserPhoneNumberFromDB(_userId: string): Promise<string | null> {
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

/**
 * Trích xuất địa chỉ ví Solana hoạt động chính xác từ tất cả các nguồn theo độ ưu tiên:
 * 1. Ví ngầm Embedded Solana Wallet của Privy (solanaWalletState.wallets[0])
 * 2. Ví Solana nhúng trong Privy Session (linked_accounts có chain_type === 'solana')
 * 3. Địa chỉ ví đã lưu trong User Profile / Global State (useUserStore / AsyncStorage / Supabase)
 * 4. user.wallet
 * 5. Ví ngoài Phantom (Chỉ làm fallback cuối cùng khi không có ví Privy)
 */
export function resolveActiveSolanaAddress(
  user?: any,
  externalWallet?: { publicKey?: { toBase58: () => string } | string | null; connected?: boolean } | null,
  solanaWalletState?: { wallets?: Array<{ address?: string; publicKey?: string }> } | null,
  storeAddressOverride?: string | null
): string | null {
  // 1. Ưu tiên 1: Ví ngầm Embedded Solana Wallet của Privy
  if (solanaWalletState?.wallets && solanaWalletState.wallets.length > 0) {
    const solWallet = solanaWalletState.wallets[0];
    if (solWallet?.address) return solWallet.address;
    if (solWallet?.publicKey) return solWallet.publicKey;
  }

  // 2. Ưu tiên 2: Ví Solana nhúng trong Privy Session (linked_accounts)
  if (user) {
    const linkedAccounts = (user as any)?.linked_accounts || (user as any)?.linkedAccounts || [];

    // 2a. Ưu tiên ví nhúng Privy
    const privyEmbedded = linkedAccounts.find(
      (acc: any) =>
        acc.type === 'wallet' &&
        (acc.chain_type === 'solana' || acc.chainType === 'solana' || (!acc.chain_type && !acc.address?.startsWith('0x'))) &&
        acc.wallet_client_type === 'privy'
    );
    if (privyEmbedded?.address) {
      return privyEmbedded.address;
    }

    // 2b. Mọi ví Solana trong linked_accounts
    const solanaAccount = linkedAccounts.find(
      (acc: any) =>
        acc.type === 'wallet' &&
        (acc.chain_type === 'solana' || acc.chainType === 'solana' || (!acc.chain_type && !acc.address?.startsWith('0x')))
    );
    if (solanaAccount?.address) {
      return solanaAccount.address;
    }

    // 2c. user.wallet
    if ((user as any)?.wallet?.address) {
      const addr = (user as any).wallet.address;
      if (!addr.startsWith('0x') || (user as any).wallet.chainType === 'solana') {
        return addr;
      }
    }
  }

  // 3. Ưu tiên 3: Địa chỉ ví đã lưu trong User Store (Profile đăng ký trên Supabase / AsyncStorage)
  if (storeAddressOverride && typeof storeAddressOverride === 'string' && storeAddressOverride.length >= 32) {
    return storeAddressOverride;
  }

  // 4. Ưu tiên 4 (Fallback): Ví ngoài (Phantom / Solflare)
  if (externalWallet?.publicKey) {
    try {
      const extAddr = typeof (externalWallet.publicKey as any)?.toBase58 === 'function'
        ? (externalWallet.publicKey as any).toBase58()
        : String(externalWallet.publicKey);
      if (extAddr && extAddr !== '11111111111111111111111111111111' && extAddr.length >= 32) {
        return extAddr;
      }
    } catch {}
  }

  return null;
}
