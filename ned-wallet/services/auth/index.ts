// Auth — Google sign-in + embedded Solana wallet (MPC V3) through the Dynamic JS SDK.
// Web: signInWithSocialRedirect (+ detect/complete on return). Native: signInWithSocialPopUp + expo-web-browser.
// The whole app uses only AuthProvider and useAuth() from here — never import @dynamic-labs-sdk/* in a screen.
export { AuthProvider, useAuth } from './AuthProvider';
export type { AuthContextValue, AuthStatus, AuthUser } from './AuthProvider';
