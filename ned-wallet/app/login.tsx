import { Redirect } from 'expo-router';

// Route cũ /login (đăng xuất, phiên hết hạn…) → màn Welcome của onboarding mới
export default function LoginRedirect() {
  return <Redirect href="/welcome" />;
}
