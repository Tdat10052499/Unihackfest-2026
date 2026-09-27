// Hồ sơ người dùng — bản tạm lưu cục bộ (T0.5), thay backend cũ.
// Lưu cục bộ trên thiết bị bằng AsyncStorage, giữ nguyên chữ ký hàm cũ để các màn không phải viết lại.
// TODO(T1.5/T1.7): thay bằng Dual PDA của ned_program (Name [b"name", username], Reverse [b"reverse", wallet],
// Phone [b"phone_v1", scrypt(SĐT)]) + reverse SNS — xem docs/04-ke-hoach-code.md.
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserProfile {
  id?: string;
  auth_user_id?: string;
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

export interface UserSearchResult {
  id?: string;
  username: string;
  wallet_address: string;
  phone_number?: string | null;
  phone_hash?: string | null;
  avatar_url?: string | null;
  auth_user_id?: string | null;
}

export const LOCAL_PROFILES_KEY = '@ned_wallet_local_profiles';

async function readProfiles(): Promise<UserProfile[]> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_PROFILES_KEY);
    return raw ? (JSON.parse(raw) as UserProfile[]) : [];
  } catch {
    return [];
  }
}

async function writeProfiles(profiles: UserProfile[]): Promise<void> {
  await AsyncStorage.setItem(LOCAL_PROFILES_KEY, JSON.stringify(profiles));
}

const normalize = (value: string) => value.trim().toLowerCase();

/**
 * Lưu hồ sơ (upsert theo wallet_address) vào bộ nhớ cục bộ.
 * TODO(T1.5): thay bằng instruction create_profile / link_phone.
 */
export async function upsertUserProfile(params: {
  auth_user_id?: string;
  wallet_address: string;
  username: string;
  phone_number?: string | null;
  linked_external_wallet?: string | null;
}): Promise<{ success: boolean; data?: UserProfile; error?: string }> {
  const { auth_user_id, wallet_address, username, phone_number, linked_external_wallet } = params;
  if (!username || !wallet_address) {
    return { success: false, error: 'Thiếu thông tin bắt buộc (wallet_address hoặc username).' };
  }

  const profiles = await readProfiles();
  const now = new Date().toISOString();
  const existing = profiles.find((p) => p.wallet_address === wallet_address);
  const profile: UserProfile = {
    ...existing,
    auth_user_id: auth_user_id ?? existing?.auth_user_id,
    wallet_address,
    username: normalize(username),
    phone_number: phone_number ?? existing?.phone_number ?? null,
    linked_external_wallet: linked_external_wallet ?? existing?.linked_external_wallet ?? null,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };
  await writeProfiles([...profiles.filter((p) => p.wallet_address !== wallet_address), profile]);
  return { success: true, data: profile };
}

/** Lấy hồ sơ theo wallet_address / auth_user_id / username (chỉ trong bộ nhớ cục bộ). */
export async function getUserProfileFromDB(identifier: string): Promise<UserProfile | null> {
  if (!identifier) return null;
  const id = identifier.trim();
  const profiles = await readProfiles();
  return (
    profiles.find(
      (p) => p.wallet_address === id || p.auth_user_id === id || p.username === normalize(id)
    ) ?? null
  );
}

/** TODO(T1.5): tra Reverse PDA [b"reverse", wallet] + reverse SNS. */
export async function getUserProfileByWallet(walletAddress: string): Promise<UserProfile | null> {
  if (!walletAddress) return null;
  const profiles = await readProfiles();
  return profiles.find((p) => p.wallet_address === walletAddress) ?? null;
}

/**
 * Ảnh đại diện: không còn storage bucket — trả về data URI để hiển thị cục bộ.
 * TODO(Phase 4): quyết định có cần ảnh đại diện dùng chung không (không backend).
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
  return { success: true, avatarUrl: `data:${mimeType};base64,${base64}` };
}

/**
 * Tìm người nhận theo @username / SĐT.
 * TODO(T1.5): tra Name PDA / Phone PDA và SNS (.sol) — hiện chưa có nguồn dữ liệu dùng chung nên trả [].
 * Gửi tới ĐỊA CHỈ VÍ vẫn hoạt động (không đi qua hàm này).
 */
export async function searchUsersOffchain(_query: string): Promise<UserSearchResult[]> {
  return [];
}
