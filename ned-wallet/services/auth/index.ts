// Auth — đăng nhập Google + ví nhúng Solana (MPC V3) qua Dynamic JS SDK.
// Web: signInWithSocialRedirect (+ detect/complete khi quay lại). Native: signInWithSocialPopUp + expo-web-browser.
// Toàn app chỉ dùng AuthProvider và useAuth() từ đây — không import @dynamic-labs-sdk/* ở màn hình.
export { AuthProvider, useAuth } from './AuthProvider';
export type { AuthContextValue, AuthStatus, AuthUser } from './AuthProvider';
